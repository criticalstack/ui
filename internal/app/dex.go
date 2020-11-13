package app

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path"
	"strconv"
	"strings"

	"github.com/criticalstack/ui/internal/log"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	proxyConnectorID = "cs-ui"
)

func (x *Controller) DexProxy(c echo.Context) error {
	conf, err := x.GetSSOConfig(x.admin)
	if err != nil || conf.DexProxyEndpoint == "" {
		log.Errorf("failed getting sso config: %v", err)
		return c.NoContent(http.StatusNotFound)
	}
	u, err := url.Parse(conf.DexProxyEndpoint)
	if err != nil {
		log.Errorf("failed parsing dex proxy endpoint (%q): %v", conf.DexProxyEndpoint, err)
		return c.NoContent(http.StatusNotFound)
	}

	const callbackURL = "/dex/callback/" + proxyConnectorID
	proxy := &httputil.ReverseProxy{
		ErrorLog: zap.NewStdLog(log.NewLogger("dex_proxy")),
		Director: func(req *http.Request) {
			req.Host = ""
			req.URL.Scheme = u.Scheme
			req.URL.Host = u.Host
			req.URL.Path = path.Join(u.Path, req.URL.Path)

			if req.URL.Path == callbackURL {
				// TODO(ktravis): unset all other auth headers
				if u := User(c); u != nil {
					req.Header["X-Remote-User"] = []string{u.Email}
				}
			}
		},
		//Transport: , // TODO(ktravis): use a specific one?
	}
	proxy.ServeHTTP(c.Response(), c.Request())
	return nil
}

const csDexClientID = "critical-stack"

func dexClientToOAuth2Config(u *unstructured.Unstructured) (*oauth2.Config, error) {
	var oc oauth2.Config
	oc.ClientID, _ = u.Object["id"].(string)
	oc.ClientSecret, _ = u.Object["secret"].(string)
	redirects, _, err := unstructured.NestedStringSlice(u.Object, "redirectURIs")
	if err != nil {
		return nil, errors.Wrap(err, "failed to find redirectURIs in oauth2config")
	}
	if len(redirects) == 0 {
		return nil, errors.Errorf("dex client %+v provides no redirect URIs", u)
	}
	for _, re := range redirects {
		// just in case this doesn't happen to be the first
		if strings.HasSuffix(re, "/sso/callback") {
			oc.RedirectURL = re
			break
		}
	}
	if oc.RedirectURL == "" {
		oc.RedirectURL = redirects[0]
	}
	return &oc, nil
}

func (x *Controller) findCriticalStackDexClient() (*unstructured.Unstructured, error) {
	cli, err := client.New(x.config.KubeConfig, client.Options{
		Scheme: scheme.Scheme,
	})
	if err != nil {
		return nil, err
	}
	var clients unstructured.UnstructuredList
	clients.SetAPIVersion("dex.coreos.com/v1")
	clients.SetKind("OAuth2Client")
	if cli.List(context.TODO(), &clients, client.InNamespace("critical-stack")); err != nil {
		return nil, err
	}
	for _, c := range clients.Items {
		if id, ok := c.Object["id"].(string); ok && id == csDexClientID {
			c := c
			return &c, nil
		}
	}
	return nil, errors.Errorf("no dex client %q found", csDexClientID)
}

func (x *Controller) SetDefaultDexConnector(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	// TODO(ktravis): there should be a safer, nicer way of accomplishing this - though really we want the UI to just
	// make use of the dynamic client directly
	var newDefault unstructured.Unstructured
	newDefault.SetAPIVersion("dex.coreos.com/v1")
	newDefault.SetKind("Connector")
	newDefault.SetNamespace("critical-stack")
	newDefault.SetName(c.Param("name"))
	patch := client.RawPatch(types.MergePatchType, []byte(fmt.Sprintf(`{"metadata":{"labels":{"%s":""}}}`, defaultDexConnectorLabel)))
	if err := cli.Patch(context.TODO(), &newDefault, patch); err != nil {
		return newError(err)
	}

	var list unstructured.UnstructuredList
	list.SetAPIVersion("dex.coreos.com/v1")
	list.SetKind("Connector")
	if err := cli.List(context.TODO(), &list, client.InNamespace("critical-stack")); err != nil {
		return newError(err)
	}
	for _, conn := range list.Items {
		if conn.GetName() == newDefault.GetName() {
			continue
		}
		if id, _ := conn.Object["id"].(string); id == proxyConnectorID {
			continue
		}
		patch := client.RawPatch(types.JSONPatchType, []byte(fmt.Sprintf(`[{"op":"remove","path":"/metadata/labels/%s"}]`, strings.Replace(defaultDexConnectorLabel, "/", "~1", -1))))
		if err := cli.Patch(context.TODO(), &conn, patch); err != nil {
			log.Errorf("error removing default connector label: %v", err)
		}
	}
	return x.sendJSONSuccess(c)
}

func (x *Controller) UpdateDexConnector(c echo.Context) error {
	var conn unstructured.Unstructured
	conn.SetAPIVersion("dex.coreos.com/v1")
	conn.SetKind("Connector")
	if err := c.Bind(&conn.Object); err != nil {
		return newError(err)
	}
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	// NOTE(ktravis): temp fix for dex to force cache clearing, until next dex release
	v := "1"
	if s, ok := conn.Object["resourceVersion"].(string); ok {
		if n, err := strconv.Atoi(s); err == nil {
			v = strconv.Itoa(n + 1)
		}
	}
	conn.Object["resourceVersion"] = v

	conn.SetName(c.Param("name"))
	conn.SetNamespace("critical-stack")
	if err := cli.Update(context.TODO(), &conn); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{"result": conn})
}

// sentinel value
var noDefaultConnector = &unstructured.Unstructured{}

const defaultDexConnectorLabel = "criticalstack.com/dex.default"

func (x *Controller) getDefaultDexConnector() (*unstructured.Unstructured, error) {
	cli, err := client.New(x.config.KubeConfig, client.Options{
		Scheme: scheme.Scheme,
	})
	if err != nil {
		return nil, err
	}
	var conns unstructured.UnstructuredList
	conns.SetAPIVersion("dex.coreos.com/v1")
	conns.SetKind("Connector")
	if cli.List(context.TODO(), &conns, client.InNamespace("critical-stack")); err != nil {
		return nil, err
	}
	filtered := make([]unstructured.Unstructured, 0)
	for _, x := range conns.Items {
		if id, ok := x.Object["id"].(string); ok && id == proxyConnectorID {
			continue
		}
		l := x.GetLabels()
		if l == nil {
			continue
		}
		if _, has := l[defaultDexConnectorLabel]; has {
			c := x
			return &c, nil
		}
		filtered = append(filtered, x)
	}

	// if there is only one other connector, use that name instead of "dex"
	switch len(filtered) {
	case 0:
		return nil, nil
	case 1:
		return &filtered[0], nil
	default:
		// TODO(ktravis): revisit this approach
		return noDefaultConnector, nil
	}
}
