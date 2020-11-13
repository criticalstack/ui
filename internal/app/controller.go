package app

import (
	"context"
	"crypto/tls"
	"sync"
	"time"

	machinev1alpha1 "github.com/criticalstack/machine-api/api/v1alpha1"
	marketplacev1alpha2 "github.com/criticalstack/marketplace/api/v1alpha2"
	featuresv1alpha1 "github.com/criticalstack/stackapps/api/v1alpha1"
	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/controllers"
	"github.com/criticalstack/ui/internal/kube"
	"github.com/criticalstack/ui/internal/log"
	"github.com/criticalstack/ui/internal/rbac"
	"github.com/gorilla/securecookie"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/prometheus/client_golang/api"
	promv1 "github.com/prometheus/client_golang/api/prometheus/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/transport"
	ctrl "sigs.k8s.io/controller-runtime"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	// APIVersion of the app
	APIVersion = "1"
)

var (
	// Version of the app - usually injected during build
	Version = "dev"

	DefaultGracePeriodSeconds = int64(0)
	DefaultPropagationPolicy  = metav1.DeletePropagationBackground

	// DefaultDeleteOptions are the options used for deleting Kubernetes
	// resourcess in most typical cases
	DefaultDeleteOptions = metav1.DeleteOptions{
		GracePeriodSeconds: &DefaultGracePeriodSeconds,
		PropagationPolicy:  &DefaultPropagationPolicy,
		DryRun:             []string{},
	}
)

// Controller contains state for API request handlers
type Controller struct {
	admin kubernetes.Interface

	config Config

	kubeTLSClientConfig *tls.Config

	// this is the k8s API server version, e.g. v1.13.5
	kubeAPIVersion string

	informerCaches InformerCaches
	metrics        promv1.API

	cookie *securecookie.SecureCookie

	discoveryChannel        chan struct{}
	discoveredGroups        []*metav1.APIGroup
	discoveredResourceLists []*metav1.APIResourceList

	tcmu            sync.RWMutex
	tableConverters map[schema.GroupVersionResource]tableConverter

	// NOTE(ktravis): this is to prevent some issues with helm, and can hopefully be replaced/removed in the future
	cachedDiscovery discovery.CachedDiscoveryInterface

	commonCache ctrlcache.Cache
}

type InformerCaches struct {
	namespaces          cache.SharedIndexInformer
	clusterRoleBindings cache.SharedIndexInformer
	roleBindings        cache.SharedIndexInformer
	clusterRoles        cache.SharedIndexInformer
	roles               cache.SharedIndexInformer
}

func New(config Config) (*Controller, error) {
	config.applyDefaults()
	client, err := api.NewClient(api.Config{
		Address: config.PrometheusEndpoint,
	})
	if err != nil {
		return nil, err
	}
	if err := v1alpha1.AddToScheme(config.Scheme); err != nil {
		return nil, err
	}
	if err := marketplacev1alpha2.AddToScheme(config.Scheme); err != nil {
		return nil, err
	}
	if err := featuresv1alpha1.AddToScheme(config.Scheme); err != nil {
		return nil, err
	}
	if err := machinev1alpha1.AddToScheme(config.Scheme); err != nil {
		return nil, err
	}

	// always do this, just in case it is needed (if the data is there already, it will be used)
	if err := rest.LoadTLSFiles(config.KubeConfig); err != nil {
		return nil, err
	}
	k, err := kubernetes.NewForConfig(config.KubeConfig)
	if err != nil {
		return nil, err
	}

	c := &Controller{
		admin: k,
		//mpcli:       mpcli,
		config:          config,
		metrics:         promv1.NewAPI(client),
		cookie:          securecookie.New([]byte(config.SessionKey), nil),
		tableConverters: make(map[schema.GroupVersionResource]tableConverter),

		discoveryChannel:        make(chan struct{}),
		discoveredResourceLists: make([]*metav1.APIResourceList, 0),
		cachedDiscovery:         memory.NewMemCacheClient(k.Discovery()),
	}
	tc, err := config.KubeConfig.TransportConfig()
	if err != nil {
		return nil, errors.Wrap(err, "cannot get TransportConfig from rest.Config")
	}
	c.kubeTLSClientConfig, err = transport.TLSConfigFor(tc)
	if err != nil {
		return nil, errors.Wrap(err, "cannot get tls.Config from KubeConfig's transport.Config")
	}

	// TODO(ktravis): this might be better passed in
	v, err := k.Discovery().ServerVersion()
	if err != nil {
		return nil, errors.Wrap(err, "error determining Kubernetes API server version")
	}
	c.kubeAPIVersion = v.String()

	go c.discoveryLoop()

	factory := informers.NewSharedInformerFactory(k, 0)

	stopper := make(chan struct{})
	// TODO: need to clean up channel appropriately

	clusterRoleBindingInformer := factory.Rbac().V1().ClusterRoleBindings().Informer()
	namespacesInformer := factory.Core().V1().Namespaces().Informer()
	roleBindingInformer := factory.Rbac().V1().RoleBindings().Informer()
	rolesInformer := factory.Rbac().V1().Roles().Informer()
	clusterRolesInformer := factory.Rbac().V1().ClusterRoles().Informer()

	// TODO: replace other cache usage with this one
	c.commonCache, err = ctrlcache.New(config.KubeConfig, ctrlcache.Options{
		Mapper: restmapper.NewDeferredDiscoveryRESTMapper(c.cachedDiscovery),
		Scheme: config.Scheme,
	})
	if err != nil {
		return nil, errors.Wrap(err, "error creating object cache")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if _, err := c.commonCache.GetInformer(ctx, &v1alpha1.User{}); err != nil {
		return nil, errors.Wrap(err, "error creating users informer")
	}
	if _, err := c.commonCache.GetInformer(ctx, &marketplacev1alpha2.Application{}); err != nil {
		return nil, errors.Wrap(err, "error creating mp apps informer")
	}
	if _, err := c.commonCache.GetInformer(ctx, &marketplacev1alpha2.Source{}); err != nil {
		return nil, errors.Wrap(err, "error creating mp sources informer")
	}
	c.commonCache.IndexField(ctx, &v1alpha1.User{}, "email", func(o runtime.Object) []string {
		u, ok := o.(*v1alpha1.User)
		if !ok {
			return nil
		}
		return []string{u.Email}
	})
	go c.commonCache.Start(stopper)

	go namespacesInformer.Run(stopper)
	go clusterRoleBindingInformer.Run(stopper)
	go roleBindingInformer.Run(stopper)
	go rolesInformer.Run(stopper)
	go clusterRolesInformer.Run(stopper)

	c.informerCaches = InformerCaches{
		namespaces:          namespacesInformer,
		clusterRoleBindings: clusterRoleBindingInformer,
		roleBindings:        roleBindingInformer,
		roles:               rolesInformer,
		clusterRoles:        clusterRolesInformer,
	}

	syncFuncs := []cache.InformerSynced{
		namespacesInformer.HasSynced,
		clusterRoleBindingInformer.HasSynced,
		roleBindingInformer.HasSynced,
		rolesInformer.HasSynced,
		clusterRolesInformer.HasSynced,
	}
	if !cache.WaitForCacheSync(ctx.Done(), syncFuncs...) {
		return nil, errors.New("timed out waiting for caches to sync")
	}
	if !c.commonCache.WaitForCacheSync(ctx.Done()) {
		return nil, errors.New("timed out waiting for user cache to sync")
	}

	return c, nil
}

func (x *Controller) Run(ctx context.Context) error {
	e := echo.New()
	e.HideBanner = true
	https := x.config.CertFile != "" && x.config.KeyFile != ""
	x.loadRoutes(e, https)

	cl := log.NewLogger("controllers").Sugar()
	ns := ""
	if !x.config.InCluster {
		ns = "critical-stack"
	}
	mgr, err := ctrl.NewManager(x.config.KubeConfig, ctrl.Options{
		Scheme:                  x.config.Scheme,
		LeaderElection:          true,
		LeaderElectionID:        "3820715f.criticalstack.com",
		LeaderElectionNamespace: ns,
		Logger:                  log.Logr(cl),
		MetricsBindAddress:      "0",
	})
	if err != nil {
		log.Fatalf("unable to start manager: %v", err)
	}

	if err := (&controllers.UserRequestReconciler{
		Client: mgr.GetClient(),
		Log:    cl.With("kind", "UserRequest"),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		log.Fatalf("unable to create controller: %v", err)
	}

	ctx, cancel := context.WithCancel(ctx)
	go func() {
		log.Info("Starting manager")
		if err := mgr.Start(ctx.Done()); err != nil {
			log.Fatalf("unable to create controller: %v", err)
		}
	}()

	go func() {
		defer cancel()
		// Start HTTPS server if cert pair is available
		if https {
			log.Infof("Starting server: https://%s", x.config.Address)
			if err := e.StartTLS(x.config.Address, x.config.CertFile, x.config.KeyFile); err != nil {
				log.Errorf("Error in https server: %v", err)
			}
		} else {
			log.Infof("Starting server: http://%s", x.config.Address)
			if err := e.Start(x.config.Address); err != nil {
				log.Errorf("Error in http server: %v", err)
			}
		}
	}()

	// Wait for a signal
	<-ctx.Done()
	log.Infof("Context canceled, stopping gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := e.Shutdown(shutdownCtx); err != nil {
		err = errors.Wrap(err, "server shutdown failed")
		log.Error(err.Error())
		return err
	}
	return nil
}

func (x *Controller) discover(once *sync.Once) error {
	groups, list, err := x.admin.Discovery().ServerGroupsAndResources()
	if err != nil {
		if _, ok := err.(*discovery.ErrGroupDiscoveryFailed); !ok {
			return err
		}
		// fall through, report the error but use the (partial) result
	}
	once.Do(func() {
		close(x.discoveryChannel)
	})
	x.discoveredGroups = groups
	x.discoveredResourceLists = list
	return err
}

func (x *Controller) discoveryLoop() {
	var once sync.Once
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()
	for {
		log.Debug("discovery sync started")
		if err := x.discover(&once); err != nil {
			log.Errorf("discovery error: %v", err)
		}
		log.Debug("discovery sync complete")
		<-ticker.C
	}
}

func (x *Controller) ImpersonationClient(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		k, ok := x.impersonateRequest(c)
		if !ok {
			return errors.Errorf("impersonation failed")
		}
		c.Set("client", k)
		return next(c)
	}
}

func (x *Controller) UserClient(c echo.Context) kubernetes.Interface {
	return c.Get("client").(kubernetes.Interface)
}

func (x *Controller) impersonationConfig(c rest.ImpersonationConfig) *rest.Config {
	cfg := rest.CopyConfig(x.config.KubeConfig)
	cfg.Impersonate = c
	return cfg
}

func (x *Controller) impersonateUser(u *v1alpha1.User) (kubernetes.Interface, error) {
	return kubernetes.NewForConfig(x.impersonationConfig(rest.ImpersonationConfig{
		UserName: u.Email,
		Groups:   append(rbac.DefaultGroups, u.Groups...),
	}))
}

func (x *Controller) impersonateRequest(c echo.Context) (kubernetes.Interface, bool) {
	u := User(c)
	if u == nil {
		return nil, false
	}
	k, err := x.impersonateUser(u)
	if err != nil {
		newError(err)
		return nil, false
	}
	return k, true
}

func (x *Controller) userClient(c echo.Context) (client.Client, error) {
	u := User(c)
	if u == nil {
		return nil, errors.New("unknown user")
	}
	ic := x.impersonationConfig(rest.ImpersonationConfig{
		UserName: u.Email,
		Groups:   u.Groups,
	})
	return client.New(ic, client.Options{
		Scheme: x.config.Scheme,
	})
}

// marketplaceEnabled returns true if the marketplace is, well, enabled
func (x *Controller) marketplaceEnabled(ctx context.Context) bool {
	var srcs marketplacev1alpha2.SourceList
	if err := x.commonCache.List(ctx, &srcs); err != nil {
		log.Errorf("failed to list marketplace sources: %v", err)
		return false
	}
	var apps marketplacev1alpha2.ApplicationList
	if err := x.commonCache.List(ctx, &apps); err != nil {
		log.Errorf("failed to list marketplace apps: %v", err)
		return false
	}
	return len(srcs.Items) > 0 || len(apps.Items) > 0
}

func (x *Controller) ServerResources(ctx context.Context) ([]*metav1.APIResourceList, error) {
	_, lists, err := x.ServerGroupsAndResources(ctx)
	return lists, err
}
func (x *Controller) ServerPreferredResources(ctx context.Context) ([]*metav1.APIResourceList, error) {
	groups, lists, err := x.ServerGroupsAndResources(ctx)
	pref := kube.PreferredResources(lists)
	v := make(map[string]bool)
	for _, g := range groups {
		v[g.PreferredVersion.GroupVersion] = true
	}
	for i := 0; i < len(pref); i++ {
		if !v[pref[i].GroupVersion] {
			pref = append(pref[:i], pref[i+1:]...)
			i--
		}
	}
	return pref, err
}

func (x *Controller) ServerGroupsAndResources(ctx context.Context) ([]*metav1.APIGroup, []*metav1.APIResourceList, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	select {
	case <-x.discoveryChannel:
	case <-ctx.Done():
		return nil, nil, errors.Wrap(ctx.Err(), "server resources request failed")
	}
	return x.discoveredGroups, x.discoveredResourceLists, nil
}

func (x *Controller) ServerResourcesForGroupVersion(ctx context.Context, groupVersion string) (*metav1.APIResourceList, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	select {
	case <-x.discoveryChannel:
	case <-ctx.Done():
		return nil, errors.Wrap(ctx.Err(), "server resources request failed")
	}
	for _, list := range x.discoveredResourceLists {
		if list.GroupVersion == groupVersion {
			return list, nil
		}
	}
	return nil, errors.Errorf("group version %q not found", groupVersion)
}

//nolint:unused
func (x *Controller) apiResource(ctx context.Context, gv, res string) *metav1.APIResource {
	list, err := x.ServerResourcesForGroupVersion(ctx, gv)
	if err != nil {
		return nil
	}
	for _, r := range list.APIResources {
		if r.Name == res {
			return &r
		}
	}
	return nil
}

func (x *Controller) uiConfig(ctx context.Context) (Map, error) {
	groups, resources, err := x.ServerGroupsAndResources(ctx)
	if err != nil {
		// TODO(ktravis): the error returned here is not able to be encoded with json due to a
		// map[schema.GroupVersion]...
		return nil, errors.New(err.Error())
	}
	type resource struct {
		metav1.APIResource
		APIVersion string `json:"apiVersion"`
	}
	res := make([]resource, 0)
	for _, list := range resources {
		for _, r := range list.APIResources {
			res = append(res, resource{r, list.GroupVersion})
		}
	}
	return Map{
		"marketplace": Map{
			"enabled":    x.marketplaceEnabled(ctx),
			"noAppsMsg":  x.config.MarketplaceNoAppsMsg,
			"noAppsLink": x.config.MarketplaceNoAppsLink,
			"contact":    x.config.MarketplaceContact,
		},
		"kubernetes": Map{
			"version":   x.kubeAPIVersion,
			"resources": res,
			"groups":    groups,
		},
	}, nil
}

// UIConfigHandler returns an overall cluster config JSON object to expose knowledge
// of feature gates to the UI
func (x *Controller) UIConfigHandler(c echo.Context) error {
	cfg, err := x.uiConfig(c.Request().Context())
	if err != nil {
		return err
	}
	cfg["user"] = User(c)
	return x.sendJSONSuccess(c, Map{"result": cfg})
}
