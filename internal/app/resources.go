package app

import (
	"context"
	"encoding/json"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/criticalstack/ui/internal/kube"
	"github.com/criticalstack/ui/internal/log"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type resourceReference struct {
	UID         string            `json:"uid,omitempty"`
	Name        string            `json:"name"`
	APIVersion  string            `json:"apiVersion"`
	Kind        string            `json:"kind"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

func unstructuredReference(u unstructured.Unstructured) resourceReference {
	return resourceReference{
		UID:         string(u.GetUID()),
		Name:        u.GetName(),
		APIVersion:  u.GetAPIVersion(),
		Kind:        u.GetKind(),
		Labels:      u.GetLabels(),
		Annotations: u.GetAnnotations(),
	}
}

func (x *Controller) ListNamespaceResources(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}
	opts := client.ListOptions{
		Namespace: ns,
	}

	if s := c.QueryParam("labelselector"); s != "" {
		labelSelector, err := labels.Parse(s)
		if err != nil {
			return newStatusError(http.StatusBadRequest, errors.Wrap(err, "could not parse label selector"))
		}
		opts.LabelSelector = labelSelector
	}

	lists, err := x.ServerPreferredResources(c.Request().Context())
	if err != nil {
		return newError(err)
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	verbs := []string{"list"}
	if c.QueryParam("for") == "stackapp" {
		verbs = append(verbs, "create")
	}

	resources, err := kube.ListResources(cli, kube.ListOptions{
		Resources:     kube.PreferredResources(lists),
		ClientOptions: &opts,
		ResourceFilters: kube.ResourceFilters{
			kube.Namespaced,
			kube.WithVerbs(verbs...),
			kube.DefaultIgnoreResources(),
		},
	})
	if err != nil {
		return errors.Wrap(err, "could not retrieve server resources")
	}
	switch c.QueryParam("for") {
	case "graph":
		links := make([]resourceLink, 0)
		for _, res := range resources.Items {
			links = append(links, computeResourceLinks(res)...)
		}
		return x.sendJSONSuccess(c, Map{
			"result":          resources.Items,
			"links":           links,
			"resourceVersion": resources.GetResourceVersion(),
		})
	case "stackapp":
		potentialStackValues := make([]resourceReference, 0)
		ignoreThese := make([]resourceReference, 0)
		// TODO(ktravis): make this a part of the resource.Filter system, also make it configurable at runtime so that
		// it can be set in the cluster
		for _, item := range resources.Items {
			if stackappObjectFilter.Match(&item) {
				ignoreThese = append(ignoreThese, unstructuredReference(item))
				continue
			}
			switch item.GetAPIVersion() {
			case "features.criticalstack.com/v1alpha1":
				switch item.GetKind() {
				case "StackApp", "VerificationKey":
					ignoreThese = append(ignoreThese, unstructuredReference(item))
				}
			case "v1":
				switch item.GetKind() {
				case "ConfigMap":
					// if the configmap *does* have this annotation, it should just be included in the main list
					if !stackvaluesFalseFilter.Match(&item) {
						potentialStackValues = append(potentialStackValues, unstructuredReference(item))
						ignoreThese = append(ignoreThese, unstructuredReference(item))
					}
				case "Secret":
					potentialStackValues = append(potentialStackValues, unstructuredReference(item))
					ignoreThese = append(ignoreThese, unstructuredReference(item))
				}
			}
		}
		return x.sendJSONSuccess(c, Map{
			"result":               resources.Items,
			"resourceVersion":      resources.GetResourceVersion(),
			"ignore":               ignoreThese,
			"potentialStackValues": potentialStackValues,
		})
	}
	return x.sendJSONSuccess(c, Map{
		"result":          resources.Items,
		"resourceVersion": resources.GetResourceVersion(),
	})
}

// this function name is bad
func processWatchMessage(b []byte) ([]byte, error) {
	tmp := make(map[string]json.RawMessage)
	if err := json.Unmarshal(b, &tmp); err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal message")
	}
	o, ok := tmp["object"]
	if !ok {
		return nil, errors.Errorf("message did not contain an object")
	}
	var u unstructured.Unstructured
	if err := json.Unmarshal(o, &u); err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal object")
	}
	l, err := json.Marshal(computeResourceLinks(u))
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal computed links")
	}
	tmp["links"] = l
	mod, err := json.Marshal(tmp)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal final message")
	}
	return mod, nil
}

func (x *Controller) WatchNamespaceResources(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}
	type msg struct {
		tp int
		b  []byte
	}
	all := make(chan msg)
	defer close(all)

	ctx, cancel := context.WithCancel(c.Request().Context())
	defer cancel()

	lists, err := x.ServerPreferredResources(ctx)
	if err != nil {
		return newError(err)
	}
	lists = kube.PreferredResources(lists)

	resFilter := kube.ResourceFilters{
		kube.Namespaced,
		kube.WithVerbs("list", "watch"),
		kube.DefaultIgnoreResources(),
	}
	for _, list := range lists {
		group := ""
		if strings.Contains(list.GroupVersion, "/") {
			group = strings.Split(list.GroupVersion, "/")[0]
		}
		for _, res := range list.APIResources {
			if !resFilter.Match(group, res) {
				continue
			}
			base := "/api/v1"
			if list.GroupVersion != "v1" {
				base = "/apis/" + list.GroupVersion
			}
			base = path.Join(base, "namespaces", ns, res.Name)
			base += "?watch=true&resourceVersion=" + c.QueryParam("resourceVersion")
			server, err := x.KubeWebSocketConnect(ctx, User(c), c.Request().Host, base, "")
			if err != nil {
				if apierrors.IsForbidden(err) {
					log.Errorf("could not watch resource: %v", err)
					continue
				}
				return err
			}
			defer server.Close()
			go func() {
				for {
					st, smessage, err := server.ReadMessage()
					if err != nil {
						return
					}
					p, err := processWatchMessage(smessage)
					if err == nil {
						smessage = p
					} else {
						log.Errorf("watch message processing failed: %v", err)
					}
					all <- msg{st, smessage}
				}
			}()
		}
	}

	client, err := wsupgrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Error("failed to upgrade conn", zap.Error(err))
		return err
	}

	go func() {
		defer cancel()
		defer client.Close()
		for {
			if _, _, err := client.NextReader(); err != nil {
				break
			}
		}
	}()

	for {
		select {
		case m := <-all:
			client.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.WriteMessage(m.tp, m.b); err != nil {
				log.Errorf("server write error: %v", err)
				return newError(err)
			}
		case <-ctx.Done():
			return nil
		}
	}
}
