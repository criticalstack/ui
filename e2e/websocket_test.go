package e2e_test

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/gorilla/websocket"
	"github.com/pkg/errors"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/watch"
	"sigs.k8s.io/yaml"
)

func wsProto() string {
	switch serverURL.Scheme {
	case "https":
		return "wss"
	default:
		return "ws"
	}
}

func wsURL(ns string) string {
	return fmt.Sprintf("%s://%s/api/v1/websocket?namespace=%s", wsProto(), serverURL.Host, ns)
}

// TODO(ktravis): refactor to condense this a bit

func TestContainerWebsocket(t *testing.T) {
	defer printErrorLogs(t)()
	s, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}

	ns, err := s.createNamespace(randString(16))
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := s.deleteNamespace(ns.Name); err != nil {
			t.Fatal(err)
		}
	}()
	expectedLog := "hello there\ngoodbye now\n"
	// TODO(ktravis): there is the unlikely possibility of a timing issue here,
	// we could solve it by using nc to listen rather than sleep and add
	// a readiness check
	manifest := fmt.Sprintf(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: logs-test-deployment
spec:
  selector:
    matchLabels:
      app: example-app
  replicas: 1
  template:
    metadata:
      labels:
        app: example-app
    spec:
      tolerations:
      - effect: NoSchedule
        key: node.kubernetes.io/disk-pressure
        operator: Exists
      containers:
      - name: busybox
        image: busybox
        resources:
          limits:
            memory: 128Mi
            cpu: .1
          requests:
            memory: 64Mi
            cpu: .1
        command:
        - /bin/sh
        args: ["-c", 'printf %q && sleep 600']`, expectedLog)

	var d appsv1.Deployment
	if err := yaml.Unmarshal([]byte(manifest), &d); err != nil {
		t.Fatal(err)
	}

	if err := s.doResult(withJSON(s.post("/api/v1/resources/deployments?namespace=%s", ns.Name), d), &d); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.TODO(), 45*time.Second)
	defer cancel()
	pods, err := s.waitForPodsReady(ctx, ns.Name, L("app", "example-app"))
	if err != nil {
		t.Fatal(err)
	}
	if len(pods) != 1 {
		t.Fatalf("expected one pod, got: %+v", pods)
	}

	basePath := wsURL(ns.Name)

	dialer := &websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 45 * time.Second,
		TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
		Jar:              s.client.Jar,
	}

	t.Run("logs", func(t *testing.T) {
		defer printErrorLogs(t)()
		v := make(url.Values)
		v.Set("action", "container-logs")
		v.Set("pod", pods[0].Name)
		v.Set("container", "busybox")
		u := basePath + "&" + v.Encode()
		conn, resp, err := dialer.Dial(u, nil)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusSwitchingProtocols {
			b, _ := ioutil.ReadAll(resp.Body)
			t.Errorf("unexpected response status from websocket request: %d - %q", resp.StatusCode, string(b))
		}
		defer conn.Close()

		var buf bytes.Buffer
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				if ce, ok := err.(*websocket.CloseError); ok && ce.Code == websocket.CloseNormalClosure {
					break
				}
				t.Fatal(err)
			}
			buf.Write(msg)
		}
		if got := buf.String(); expectedLog != got {
			t.Fatalf("expected log message %q, got %q", expectedLog, got)
		}
	})

	t.Run("exec", func(t *testing.T) {
		defer printErrorLogs(t)()
		v := make(url.Values)
		v.Set("action", "container-exec")
		v.Set("pod", pods[0].Name)
		v.Set("container", "busybox")
		v.Set("stdout", "1")
		v.Set("stdin", "1")
		v.Set("tty", "1")
		v.Set("protocol", "base64.channel.k8s.io")

		cmd := []string{"/bin/sh"}
		for _, c := range cmd {
			v.Add("command", c)
		}

		u := basePath + "&" + v.Encode()
		conn, resp, err := dialer.Dial(u, nil)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusSwitchingProtocols {
			b, _ := ioutil.ReadAll(resp.Body)
			t.Errorf("unexpected response status from websocket request: %d - %q", resp.StatusCode, string(b))
		}
		defer conn.Close()

		c := make(chan os.Signal, 1)
		signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
		go func() {
			<-c
			conn.Close()
		}()

		expected := "echo hi"

		cmds := []string{
			"echo hi\n",
			"cd $HOME\n",
			"pwd\n",
			"exit\n",
		}

		go func() {
			for _, c := range cmds {
				if err := conn.WriteMessage(websocket.TextMessage, []byte("0"+base64.StdEncoding.EncodeToString([]byte(c)))); err != nil {
					t.Fatal(err)
				}
			}
		}()

		var buf bytes.Buffer
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				if ce, ok := err.(*websocket.CloseError); ok && ce.Code == websocket.CloseNormalClosure {
					break
				}
				t.Fatal(err)
			}
			if !bytes.HasPrefix(msg, []byte("1")) {
				t.Errorf("message did not have expected prefix '1': %q", string(msg))
			}
			msg = bytes.TrimPrefix(msg, []byte("1"))
			b, err := base64.StdEncoding.DecodeString(string(msg))
			if err != nil {
				t.Fatal(err)
			}
			// TODO(ktravis): I saw these come out of order once, need to investigate and account for that. I think it
			// was because we saw two sends before the output was processed.
			buf.Write(b)
		}

		if got := buf.String(); !strings.Contains(got, expected) {
			t.Fatalf("received value %q does not contain expected output %q", got, expected)
		}
	})
}

func (s *session) watchResource(ns, res string, x interface{}, extraParams ...url.Values) (watch.EventType, error) {
	dialer := &websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 45 * time.Second,
		TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
		Jar:              s.client.Jar,
	}

	params := make(url.Values)
	params.Set("action", "watch-resource")
	parts := strings.SplitN(res, ".", 2)
	params.Set("resourceType", parts[0])
	if len(parts) > 1 {
		params.Set("api", parts[1])
	}
	for _, p := range extraParams {
		for k, v := range p {
			params[k] = v
		}
	}
	u := wsURL(ns) + "&" + params.Encode()
	conn, resp, err := dialer.Dial(u, nil)
	if err != nil {
		return watch.Error, err
	}
	if resp.StatusCode != http.StatusSwitchingProtocols {
		b, _ := ioutil.ReadAll(resp.Body)
		return watch.Error, errors.Errorf("unexpected response status from websocket request: %d - %q", resp.StatusCode, string(b))
	}
	defer conn.Close()

	var tmp struct {
		Type   watch.EventType `json:"type"`
		Object interface{}     `json:"object"`
	}
	tmp.Object = x
	type msg struct {
		data []byte
		err  error
	}
	ch := make(chan msg)
	go func() {
		defer close(ch)
		_, b, err := conn.ReadMessage()
		ch <- msg{b, err}
	}()
	select {
	case <-time.After(45 * time.Second):
		return watch.Error, errors.Errorf("timeout")
	case m := <-ch:
		if m.err != nil {
			if ce, ok := err.(*websocket.CloseError); !ok || ce.Code != websocket.CloseNormalClosure {
				return watch.Error, err
			}
		}
		if err := json.Unmarshal(m.data, &tmp); err != nil {
			return watch.Error, errors.Wrap(err, "failed to unmarshal message")
		}
	}
	return tmp.Type, nil
}

func TestWebsocketWatchResource(t *testing.T) {
	defer printErrorLogs(t)()
	s, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}

	ns, err := s.createNamespace(randString(16))
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := s.deleteNamespace(ns.Name); err != nil {
			t.Fatal(err)
		}
	}()

	basePath := wsURL(ns.Name)

	dialer := &websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 45 * time.Second,
		TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
		Jar:              s.client.Jar,
	}

	t.Run("core namespaced resource", func(t *testing.T) {
		params := make(url.Values)
		params.Set("action", "watch-resource")
		params.Set("resourceType", "configmaps")
		u := basePath + "&" + params.Encode()
		conn, resp, err := dialer.Dial(u, nil)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusSwitchingProtocols {
			b, _ := ioutil.ReadAll(resp.Body)
			t.Errorf("unexpected response status from websocket request: %d - %q", resp.StatusCode, string(b))
		}
		defer conn.Close()

		var cm corev1.ConfigMap
		cm.SetGroupVersionKind(schema.GroupVersionKind{
			Version: "v1",
			Kind:    "ConfigMap",
		})
		cm.Name = randString(16)
		cm.Namespace = ns.Name
		cm.Data = map[string]string{"a": "b"}

		if err := s.doResult(withJSON(s.post("/api/v1/resources/configmaps?namespace=%s", ns.Name), cm), &cm); err != nil {
			t.Fatal(err)
		}

		_, msg, err := conn.ReadMessage()
		if err != nil {
			if ce, ok := err.(*websocket.CloseError); !ok || ce.Code != websocket.CloseNormalClosure {
				t.Fatal(err)
			}
		}
		var tmp struct {
			Type   watch.EventType  `json:"type"`
			Object corev1.ConfigMap `json:"object"`
		}
		if err := json.Unmarshal(msg, &tmp); err != nil {
			t.Fatalf("failed to unmarshal message: %v", err)
		}
		if tmp.Type != watch.Added {
			t.Fatalf("unexpected event type: %q", tmp.Type)
		}
		if d := cmp.Diff(cm, tmp.Object); d != "" {
			t.Fatalf("object from event did not match: %v", d)
		}

		// TODO(ktravis): test deletion / modification?
	})
	t.Run("non core namespaced resource", func(t *testing.T) {
		params := make(url.Values)
		params.Set("action", "watch-resource")
		params.Set("api", "autoscaling/v1")
		params.Set("resourceType", "horizontalpodautoscalers")
		u := basePath + "&" + params.Encode()
		conn, resp, err := dialer.Dial(u, nil)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusSwitchingProtocols {
			b, _ := ioutil.ReadAll(resp.Body)
			t.Errorf("unexpected response status from websocket request: %d - %q", resp.StatusCode, string(b))
		}
		defer conn.Close()

		var hpa struct {
			metav1.ObjectMeta `json:"metadata"`
		}
		v := V{
			"kind":       "HorizontalPodAutoscaler",
			"apiVersion": "autoscaling/v1",
			"metadata": V{
				"name":      randString(16),
				"namespace": ns.Name,
			},
			"spec": V{
				"maxReplicas": 3,
				"scaleTargetRef": V{
					"kind": "Container",
					"name": "*",
				},
			},
		}

		if err := s.doResult(withJSON(s.post("/api/v1/resources/horizontalpodautoscalers?namespace=%s", ns.Name), v), &hpa); err != nil {
			t.Fatal(err)
		}

		ch := make(chan []byte)
		defer close(ch)
		errs := make(chan error)
		defer close(errs)
		go func() {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				if ce, ok := err.(*websocket.CloseError); !ok || ce.Code != websocket.CloseNormalClosure {
					errs <- err
					return
				}
			}
			ch <- msg
		}()
		var tmp struct {
			Type   watch.EventType `json:"type"`
			Object struct {
				metav1.ObjectMeta `json:"metadata"`
			} `json:"object"`
		}
		select {
		case <-time.After(5 * time.Second):
			t.Fatal("timeout while waiting for event")
		case msg := <-ch:
			if err := json.Unmarshal(msg, &tmp); err != nil {
				t.Fatalf("failed to unmarshal message: %v", err)
			}
		case err := <-errs:
			t.Fatalf("websocket read failed: %v", err)
		}
		if tmp.Type != watch.Added {
			t.Fatalf("unexpected event type: %q", tmp.Type)
		}
		// we don't care about the other fields
		if tmp.Object.Name != hpa.Name {
			t.Fatalf("name did not match on returned object: %+v", tmp.Object)
		}
	})
	t.Run("non namespaced resource", func(t *testing.T) {
		params := make(url.Values)
		params.Set("action", "watch-resource")
		params.Set("api", "policy/v1beta1")
		params.Set("resourceType", "podsecuritypolicies")
		u := basePath + "&" + params.Encode()
		conn, resp, err := dialer.Dial(u, nil)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusSwitchingProtocols {
			b, _ := ioutil.ReadAll(resp.Body)
			t.Errorf("unexpected response status from websocket request: %d - %q", resp.StatusCode, string(b))
		}
		defer conn.Close()

		manifest := V{
			"kind":       "PodSecurityPolicy",
			"apiVersion": "policy/v1beta1",
			"metadata": V{
				"name": randString(16),
			},
			"spec": V{
				"privileged":         false,
				"seLinux":            V{"rule": "RunAsAny"},
				"supplementalGroups": V{"rule": "RunAsAny"},
				"runAsUser":          V{"rule": "RunAsAny"},
				"fsGroup":            V{"rule": "RunAsAny"},
				"volumes":            []string{"*"},
			},
		}

		var psp struct {
			metav1.ObjectMeta `json:"metadata"`
		}
		if err := s.doResult(withJSON(s.post("/api/v1/resources/podsecuritypolicies?namespace=%s", ns.Name), manifest), &psp); err != nil {
			t.Fatal(err)
		}
		defer func() {
			s.do(s.delete("/api/v1/resources/podsecuritypolicies/%s?namespace=%s", psp.Name, ns.Name))
		}()

		ch := make(chan []byte)
		defer close(ch)
		go func() {
			// This is a cluster-wide resource, so we may have others show up as "ADDED" first
			for {
				_, msg, err := conn.ReadMessage()
				if err != nil {
					if ce, ok := err.(*websocket.CloseError); !ok || ce.Code != websocket.CloseNormalClosure {
						t.Fatal(err)
					}
				}
				var tmp struct {
					Type   watch.EventType `json:"type"`
					Object struct {
						metav1.ObjectMeta `json:"metadata"`
					} `json:"object"`
				}
				if err := json.Unmarshal(msg, &tmp); err != nil {
					t.Fatalf("failed to unmarshal message: %v", err)
				}
				if tmp.Type != watch.Added {
					continue
				}
				// we don't care about the other fields
				if tmp.Object.Name == psp.Name {
					ch <- msg
					return
				}
				ch <- msg
			}
		}()
		select {
		case <-time.After(5 * time.Second):
			t.Fatal("timeout while waiting for event")
		case <-ch:
			// we did it
		}
	})
}
