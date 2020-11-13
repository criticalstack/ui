package app

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"path"
	"strings"
	"sync"
	"time"

	usersv1alpha1 "github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/validation"
	"k8s.io/client-go/rest"
)

const (
	writeWait                    = 10 * time.Second
	defaultKubeWebsocketEndpoint = "kubernetes.default.svc:443"
)

var wsupgrader = websocket.Upgrader{
	ReadBufferSize:    4096,
	WriteBufferSize:   4096,
	EnableCompression: true,

	// If the CheckOrigin field is nil, then the Upgrader uses a safe
	// default: fail the handshake if the Origin request header is present
	// and not equal to the Host request header.
	// XXX this needs to be checked on actual credentials
	//CheckOrigin: func(r *http.Request) bool {
	//	return true
	//},
}

func (x *Controller) isNamespaced(ctx context.Context, gv, resourceType string) (bool, error) {
	resList, err := x.ServerResourcesForGroupVersion(ctx, gv)
	if err != nil {
		return false, errors.Wrapf(err, "error finding group version (%q) resources", gv)
	}
	for _, res := range resList.APIResources {
		if res.Name == resourceType {
			return res.Namespaced, nil
		}
	}
	return false, errors.Errorf("resource %q not found for group version %q", resourceType, gv)
}

// KubeProxy will proxy all websocket connections between
// the server and kubernetes.
func (x *Controller) KubeProxy(c echo.Context) error {
	if c.QueryParam("resourceType") == "all" {
		return x.WatchNamespaceResources(c)
	}

	r, err := ParseWebsocketRequest(c.Request().URL)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}

	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}
	if r.gv != nil {
		// remove namespace for non-namespaced resources
		ok, err := x.isNamespaced(c.Request().Context(), r.gv.String(), r.Params.Get("resourceType"))
		if err != nil {
			// TODO(ktravis): find a nice way to report errors to the client here
			return newStatusError(http.StatusBadRequest, err)
		}
		if !ok {
			ns = ""
		}
	}

	server, err := x.KubeWebSocketConnect(c.Request().Context(), User(c), c.Request().Host, r.PathParams(ns), r.Protocol)
	if err != nil {
		return err
	}
	defer server.Close()

	client, err := wsupgrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Error("failed to upgrade conn", zap.Error(err))
		return err
	}
	defer client.Close()

	return x.ProxyRun("kube-proxy", client, server)
}

// ProxyRun will handle all input/output for websocket connections
func (x *Controller) ProxyRun(proxy string, client, server *websocket.Conn) error {
	var wg sync.WaitGroup

	proxyLog := func(role string, ws *websocket.Conn, message ...interface{}) {
		log.Debugf("%s (%s->%s) %v", role, ws.RemoteAddr(), ws.LocalAddr(), message)
	}

	wg.Add(1)
	go func(server, client *websocket.Conn) {
		defer wg.Done()
		role := "[" + proxy + "/server]"

		for {
			st, smessage, err := server.ReadMessage()
			if err != nil {
				proxyLog(role, server, "server read error:", err)
				client.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(1000, "bye"))
				break
			} else {
				proxyLog(role, server, "server read okay", len(smessage))
			}

			client.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.WriteMessage(st, smessage); err != nil {
				proxyLog(role, client, "client write error:", err)
				break
			} else {
				proxyLog(role, client, "client write okay", len(smessage))
			}
		}

		if err := server.Close(); err != nil {
			proxyLog(role, server, "error closing server socket:", err)
		}
	}(server, client)

	role := "[" + proxy + "/client]"

	for {
		ct, cmessage, err := client.ReadMessage()
		if err != nil {
			proxyLog(role, client, "client read error:", err)
			server.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(1000, "bye"))
			break
		} else {
			proxyLog(role, client, "client read okay:", len(cmessage))
		}

		server.SetWriteDeadline(time.Now().Add(writeWait))
		if err := server.WriteMessage(ct, cmessage); err != nil {
			proxyLog(role, server, "server write error:", err)
			break
		} else {
			proxyLog(role, server, "server write okay:", len(cmessage))
		}
	}

	if err := client.Close(); err != nil {
		proxyLog(role, client, "error closing client socket:", err)
	}

	wg.Wait()
	log.Debugf("[%s] All connections closed, leaving proxy handler", proxy)
	return nil
}

type WebsocketAction string

const (
	WatchNodesAction      WebsocketAction = "watch-nodes"
	WatchResourceAction   WebsocketAction = "watch-resource"
	ContainerLogsAction   WebsocketAction = "container-logs"
	ContainerExecAction   WebsocketAction = "container-exec"
	ContainerAttachAction WebsocketAction = "container-attach"
)

type WebsocketRequest struct {
	Action   WebsocketAction
	Protocol string
	Params   url.Values

	gv *schema.GroupVersion
}

func ParseWebsocketRequest(u *url.URL) (*WebsocketRequest, error) {
	p, err := url.ParseQuery(u.RawQuery)
	if err != nil {
		// TODO: wrap err
		return nil, err
	}
	r := &WebsocketRequest{
		Action:   WebsocketAction(p.Get("action")),
		Protocol: p.Get("protocol"),
		Params:   p,
	}
	if err := r.validate(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *WebsocketRequest) validate() error {
	if r.Params == nil {
		return errors.Errorf("%v action has no valid parameters", r.Action)
	}
	switch r.Action {
	case WatchNodesAction:
	case WatchResourceAction:
		if r.Params.Get("resourceType") == "" {
			return errors.Errorf("%v action missing required param %q", r.Action, "resourceType")
		}
		r.gv = &schema.GroupVersion{
			Version: "v1",
		}
		if api := r.Params.Get("api"); api != "" {
			gv, err := schema.ParseGroupVersion(api)
			if err != nil {
				return errors.Wrapf(err, "%v action param %q is invalid", r.Action, "api")
			}
			r.gv = &gv
		}
	case ContainerLogsAction:
		errs := make([]string, 0)
		pod := r.Params.Get("pod")
		if pod == "" {
			return errors.Errorf("%v action is invalid: no pod specified", r.Action)
		}
		errs = append(errs, validation.IsValidLabelValue(pod)...)
		errs = append(errs, validation.IsValidLabelValue(r.Params.Get("container"))...)
		if len(errs) > 0 {
			return errors.Errorf("%v action is invalid: %s", r.Action, strings.Join(errs, ", "))
		}
	case ContainerExecAction:
		pod := r.Params.Get("pod")
		if pod == "" {
			return errors.Errorf("%v action is invalid: no pod specified", r.Action)
		}
		errs := make([]string, 0)
		errs = append(errs, validation.IsValidLabelValue(pod)...)
		errs = append(errs, validation.IsValidLabelValue(r.Params.Get("container"))...)
		if cmd := r.Params.Get("command"); cmd == "" {
			errs = append(errs, "'command' is required")
		}
		if len(errs) > 0 {
			return errors.Errorf("%v action is invalid: %s", r.Action, strings.Join(errs, ", "))
		}
	case ContainerAttachAction:
		errs := make([]string, 0)
		pod := r.Params.Get("pod")
		if pod == "" {
			return errors.Errorf("%v action is invalid: no pod specified", r.Action)
		}
		errs = append(errs, validation.IsValidLabelValue(pod)...)
		errs = append(errs, validation.IsValidLabelValue(r.Params.Get("container"))...)
		if len(errs) > 0 {
			return errors.Errorf("%v action is invalid: %s", r.Action, strings.Join(errs, ", "))
		}
	default:
		return errors.Errorf("invalid websocket action type %q", r.Action)
	}
	switch r.Protocol {
	case "base64.channel.k8s.io":
	case "":
	default:
		return errors.Errorf("%v action has invalid protocol %q", r.Action, r.Protocol)
	}
	return nil
}

func copyValues(v url.Values, keys ...string) url.Values {
	cp := make(url.Values)
	for _, k := range keys {
		if _, ok := v[k]; ok {
			cp[k] = v[k]
		}
	}
	return cp
}

func (r *WebsocketRequest) Path(ns string) string {
	base := "/api/v1"
	switch r.Action {
	case WatchNodesAction:
		return path.Join(base, "nodes")
	case WatchResourceAction:
		if r.gv == nil || r.gv.Group == "" {
			base = fmt.Sprintf("/api/%s", r.gv.Version)
		} else {
			base = fmt.Sprintf("/apis/%s/%s", r.gv.Group, r.gv.Version)
		}
		if ns != "" {
			base = path.Join(base, "namespaces", ns)
		}
		res := r.Params.Get("resourceType")
		return path.Join(base, res)
	case ContainerLogsAction:
		return path.Join(base, "namespaces", ns, "pods", r.Params.Get("pod"), "log")
	case ContainerExecAction:
		return path.Join(base, "namespaces", ns, "pods", r.Params.Get("pod"), "exec")
	case ContainerAttachAction:
		return path.Join(base, "namespaces", ns, "pods", r.Params.Get("pod"), "attach")
	default:
		panic("websocket action was not validated prior to calling Path")
	}
}

func (r *WebsocketRequest) PathParams(ns string) string {
	return r.Path(ns) + "?" + r.QueryParams().Encode()
}

func (r *WebsocketRequest) QueryParams() url.Values {
	switch r.Action {
	case WatchNodesAction:
		v := copyValues(r.Params, "resourceVersion")
		v.Set("watch", "true")
		return v
	case WatchResourceAction:
		v := copyValues(r.Params, "resourceVersion", "fieldSelector")
		v.Set("watch", "true")
		return v
	case ContainerLogsAction:
		return copyValues(r.Params, "container", "follow", "tailLines", "timestamps")
	case ContainerExecAction:
		return copyValues(r.Params, "stdout", "stdin", "stderr", "tty", "container", "command")
	case ContainerAttachAction:
		return copyValues(r.Params, "stdout", "stdin", "stderr", "tty", "container")
	default:
		panic("websocket action was not validated prior to calling QueryParams")
	}
}

// This and the below are taken from:
// https://github.com/kubernetes/kubernetes/blob/eaf89cfbb483f99411141f70c294e8a014e49cec/test/e2e/framework/util.go#L2820
//
// This is apparently the recommended way to extract auth headers when an
// http.RoundTripper is not ultimately used, such as with a websocket
// connection. There is no documentation for this at the time of writing.
type extractRT struct {
	http.Header
}

func (rt *extractRT) RoundTrip(req *http.Request) (*http.Response, error) {
	rt.Header = req.Header
	return &http.Response{}, nil
}

func headersForConfig(c *rest.Config, url *url.URL) (http.Header, error) {
	extract := &extractRT{}
	rt, err := rest.HTTPWrappersForConfig(c, extract)
	if err != nil {
		return nil, err
	}
	if _, err := rt.RoundTrip(&http.Request{URL: url}); err != nil {
		return nil, err
	}
	return extract.Header, nil
}

// -- (end copied section)

// KubeWebSocketConnect is used to communicate with the k8s apiserver
func (x *Controller) KubeWebSocketConnect(ctx context.Context, user *usersv1alpha1.User, origin, wsPath, wsProtocol string) (*websocket.Conn, error) {
	// there could be a scheme here, but it seems unclear if that's a guarantee
	// and url.Parse hates it
	parts := strings.Split(x.config.KubeConfig.Host, "://")
	hostPort := parts[len(parts)-1]
	if hostPort == "" {
		hostPort = defaultKubeWebsocketEndpoint
	}

	u := "wss://" + path.Join(hostPort, wsPath)

	log.Debugf("Websocket url %q", u)

	wsHeaders, err := headersForConfig(x.config.KubeConfig, &url.URL{Scheme: "wss", Host: hostPort})
	if err != nil {
		return nil, err
	}
	if wsHeaders == nil {
		wsHeaders = make(http.Header)
	}

	// set the bearer token if present
	if x.config.KubeConfig.BearerToken != "" && wsHeaders.Get("Authorization") == "" {
		wsHeaders.Set("Authorization", "Bearer "+x.config.KubeConfig.BearerToken)
	}
	wsHeaders.Set("Origin", "https://"+origin)
	if user != nil {
		wsHeaders.Set("Impersonate-User", user.Email)
		wsHeaders["Impersonate-Group"] = user.Groups
	}

	d := &websocket.Dialer{
		Subprotocols:     []string{wsProtocol},
		HandshakeTimeout: time.Second * 10,
		TLSClientConfig:  x.kubeTLSClientConfig,
	}

	conn, resp, err := d.DialContext(ctx, u, wsHeaders)
	if err != nil {
		if resp != nil {
			b, _ := ioutil.ReadAll(resp.Body)
			err = newStatusError(resp.StatusCode, errors.Errorf(string(b)))
		}
		log.Debugf("Kube Proxy Error: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	return conn, err
}
