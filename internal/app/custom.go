package app

import (
	"context"

	featuresv1alpha1 "github.com/criticalstack/stackapps/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type hookType string

const (
	createHook hookType = "Create"
	updateHook hookType = "Update"
	deleteHook hookType = "Delete"
)

type hookKey struct {
	t  hookType
	gv schema.GroupKind
}

type hook func(*Controller, client.Client, echo.Context) (Map, error)

var (
	customHooks = map[hookKey]hook{
		{createHook, schema.GroupKind{Group: featuresv1alpha1.GroupName, Kind: "StackApp"}}: createStackApp,
		{updateHook, schema.GroupKind{Group: featuresv1alpha1.GroupName, Kind: "StackApp"}}: updateStackApp,
		{deleteHook, schema.GroupKind{Kind: "Node"}}:                                        deleteNodeOrMachine,
	}
)

// TODO(ktravis): do we want to do these for other types of routes beyond "list all"? Probably better to implement any
// defaulting/custom logic behavior in a more k8s native way when possible

func (x *Controller) transformResourceList(c echo.Context, cli client.Client, gvk schema.GroupVersionKind, list *unstructured.UnstructuredList) error {
	if len(list.Items) == 0 {
		return nil
	}
	switch {
	case gvk.GroupVersion().String() == "v1" && gvk.Kind == "Pod":
		return x.transformPodsList(c, cli, list)
	default:
	}
	return nil
}

// NOTE(ktravis): ideally this should be (is currently?) managed by requests from the frontend to watch these pods and
// their events - but rather than break it here is the current solution

func (x *Controller) transformPodsList(c echo.Context, cli client.Client, list *unstructured.UnstructuredList) error {
	needEvents := make(map[string]*unstructured.Unstructured)
	for i := range list.Items {
		pod := &list.Items[i]
		switch p, _, _ := unstructured.NestedString(pod.Object, "status", "phase"); p {
		case "Running", "Succeeded":
			// skip event check
		default:
			needEvents[string(pod.GetUID())] = pod
		}
	}
	if len(needEvents) == 0 {
		return nil
	}
	var events unstructured.UnstructuredList
	events.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "Event"})
	opts := &client.ListOptions{
		FieldSelector: fields.OneTermEqualSelector("involvedObject.kind", "Pod"),
		Raw: &metav1.ListOptions{
			ResourceVersion: c.QueryParam("ResourceVersion"),
		},
	}
	if err := cli.List(context.TODO(), &events, opts); err != nil {
		log.Error("failed to list pod events", zap.Error(err))
		return err
	}
	for _, e := range events.Items {
		uid, ok, _ := unstructured.NestedString(e.Object, "involvedObject", "uid")
		if !ok {
			log.Errorf("no uid in event: %v", e)
			continue
		}
		pod, ok := needEvents[uid]
		if !ok {
			continue
		}
		evts, _ := pod.Object["events"].([]interface{})
		pod.Object["events"] = append(evts, e.Object)

	}
	return nil
}
