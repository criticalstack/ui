package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/kube"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage"
	"helm.sh/helm/v3/pkg/storage/driver"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/kubernetes"
	typedcorev1 "k8s.io/client-go/kubernetes/typed/core/v1"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
)

type wrapper struct {
	discovery.CachedDiscoveryInterface
	*rest.Config
}

func (w wrapper) CoreV1() typedcorev1.CoreV1Interface {
	return kubernetes.NewForConfigOrDie(rest.CopyConfig(w.Config)).CoreV1()
}

func (w wrapper) ToDiscoveryClient() (discovery.CachedDiscoveryInterface, error) {
	return w, nil
}

func (w wrapper) ToRESTConfig() (*rest.Config, error) {
	return rest.CopyConfig(w.Config), nil
}

func (w wrapper) ToRESTMapper() (meta.RESTMapper, error) {
	res, err := restmapper.GetAPIGroupResources(w)
	if err != nil {
		return nil, err
	}
	return restmapper.NewDiscoveryRESTMapper(res), nil
}

type kubeProvider interface {
	action.RESTClientGetter
	CoreV1() typedcorev1.CoreV1Interface
}

type dummyClientConfigLoader struct {
	kubeProvider
	Namespace string
}

// NOTE(ktravis): ClientConfig requires a ClientConfig method. To embed we have to rename to avoid causing a conflict
// between embedded field name and required method name
type cc clientcmd.ClientConfig

type namespacedDummyClientConfig struct {
	cc
	ns string
}

func (d dummyClientConfigLoader) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	return namespacedDummyClientConfig{ns: d.Namespace}
}

func (r namespacedDummyClientConfig) Namespace() (string, bool, error) {
	return r.ns, false, nil
}

func mergeLabels(ll ...map[string]string) map[string]string {
	m := make(map[string]string)
	for _, l := range ll {
		for k, v := range l {
			m[k] = v
		}
	}
	return m
}

type secretsWrapper struct {
	typedcorev1.SecretInterface
	extraLabels map[string]string
}

func (w secretsWrapper) Create(ctx context.Context, s *corev1.Secret, opts metav1.CreateOptions) (*corev1.Secret, error) {
	s.ObjectMeta.Labels = mergeLabels(s.ObjectMeta.Labels, w.extraLabels)
	return w.SecretInterface.Create(ctx, s, opts)
}

func (w secretsWrapper) Update(ctx context.Context, s *corev1.Secret, opts metav1.UpdateOptions) (*corev1.Secret, error) {
	s.ObjectMeta.Labels = mergeLabels(s.ObjectMeta.Labels, w.extraLabels)
	return w.SecretInterface.Update(ctx, s, opts)
}

func (x *Controller) helmWrapper(u *v1alpha1.User) wrapper {
	ic := rest.ImpersonationConfig{
		UserName: u.Email,
		Groups:   u.Groups,
	}
	return wrapper{x.cachedDiscovery, x.impersonationConfig(ic)}
}

func (x *Controller) helmInstall(u *v1alpha1.User, ns string, ch *chart.Chart, val map[string]interface{}, extraLabels map[string]string, opts ...func(a *action.Install)) (*release.Release, error) {
	w := x.helmWrapper(u)
	config := &action.Configuration{
		RESTClientGetter: w,
		KubeClient:       kube.New(dummyClientConfigLoader{kubeProvider: w, Namespace: ns}),
		Releases:         storage.Init(driver.NewSecrets(secretsWrapper{w.CoreV1().Secrets(ns), extraLabels})),
		Log:              log.Debugf,
	}

	a := action.NewInstall(config)
	a.Namespace = ns
	for _, o := range opts {
		o(a)
	}
	if a.ReleaseName == "" {
		a.GenerateName = true
		if a.NameTemplate == "" {
			a.NameTemplate = fmt.Sprintf("%s-v%s-r{{randNumeric 8}}", ch.Metadata.Name, strings.Replace(ch.Metadata.Version, ".", "-", -1))
		}
		r, _, err := a.NameAndChart([]string{ch.Metadata.Name})
		if err != nil {
			return nil, err
		}
		a.ReleaseName = r
	}
	return a.Run(ch, val)
}

func (x *Controller) helmUpdate(u *v1alpha1.User, ns, releaseName string, ch *chart.Chart, val map[string]interface{}, extraLabels map[string]string) (*release.Release, error) {
	w := x.helmWrapper(u)
	config := &action.Configuration{
		RESTClientGetter: w,
		KubeClient:       kube.New(dummyClientConfigLoader{kubeProvider: w, Namespace: ns}),
		Releases:         storage.Init(driver.NewSecrets(secretsWrapper{w.CoreV1().Secrets(ns), extraLabels})),
		Log:              log.Debugf,
	}
	a := action.NewUpgrade(config)
	a.Namespace = ns
	return a.Run(releaseName, ch, val)
}

func (x *Controller) helmUninstall(u *v1alpha1.User, ns, name string) error {
	w := x.helmWrapper(u)
	config := &action.Configuration{
		RESTClientGetter: w,
		KubeClient:       kube.New(dummyClientConfigLoader{kubeProvider: w, Namespace: ns}),
		Releases:         storage.Init(driver.NewSecrets(w.CoreV1().Secrets(ns))),
		Log:              log.Debugf,
	}
	a := action.NewUninstall(config)
	_, err := a.Run(name)
	return err
}
