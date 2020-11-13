package app

import (
	"fmt"
	"net/http"
	"reflect"

	"github.com/criticalstack/ui/internal/log"
	"github.com/labstack/echo/v4"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Containers route
func (x *Controller) ContainersListAll(c echo.Context) error {
	opts, err := parseListOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	list, err := x.UserClient(c).CoreV1().Pods(c.Param("namespace")).List(c.Request().Context(), *opts.AsListOptions())
	if err != nil {
		return newError(err)
	}

	result := make([]Map, 0)
	for _, p := range list.Items {
		for _, c := range p.Spec.Containers {
			m := make(Map)
			for _, status := range p.Status.ContainerStatuses {
				if status.Name == c.Name {
					m["status"] = status
					break
				}
			}

			m["pod"] = p
			m["metadata"] = c

			result = append(result, m)
		}
	}
	return x.sendJSONSuccess(c, Map{
		"resourceVersion": list.ResourceVersion,
		"result":          result,
	})
}

// Container route
func (x *Controller) ContainerStatus(c echo.Context) error {
	var params struct {
		UID string
	}
	if err := c.Bind(&params); err != nil {
		return newError(err)
	}
	name := c.Param("name")
	containerName := c.Param("containerName")
	pod, err := x.UserClient(c).CoreV1().Pods(c.Param("namespace")).Get(c.Request().Context(), name, metav1.GetOptions{})
	if err != nil {
		return newError(err)
	}

	opts, err := parseListOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	rcs, err := x.UserClient(c).CoreV1().ReplicationControllers(c.Param("namespace")).List(c.Request().Context(), *opts.AsListOptions())
	if err != nil {
		return newError(err)
	}

	rcMatches := []corev1.ReplicationController{}
	for _, controller := range rcs.Items {
		if reflect.DeepEqual(controller.Spec.Selector, pod.ObjectMeta.Labels) {
			rcMatches = append(rcMatches, controller)
		}
	}

	fieldSelector := fmt.Sprintf("involvedObject.uid=%s", params.UID)
	if len(params.UID) == 0 {
		fieldSelector = fmt.Sprintf("involvedObject.fieldPath=spec.containers{%s}", containerName)
	}

	events, err := x.UserClient(c).CoreV1().Events(c.Param("namespace")).List(c.Request().Context(), metav1.ListOptions{
		LabelSelector:   c.QueryParam("labelSelector"),
		FieldSelector:   fieldSelector,
		ResourceVersion: c.QueryParam("ResourceVersion"),
	})
	if err != nil {
		// TODO(ktravis): as it is, this does nothing - the error should be reported
		log.Errorf("Error retrieving events for container (%s): %v", fieldSelector, err)
	}

	result := Map{
		"replicationControllers": rcMatches,
		"events":                 events,
		"pod":                    pod,
	}
	for _, d := range pod.Status.ContainerStatuses {
		if d.Name == containerName {
			result["status"] = d
			break
		}
	}
	for _, c := range pod.Spec.Containers {
		if c.Name == containerName {
			result["metadata"] = c
			break
		}
	}
	return x.sendJSONSuccess(c, Map{
		"resourceVersion": pod.ObjectMeta.ResourceVersion,
		"result":          result,
	})
}
