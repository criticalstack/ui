package app

import (
	"context"
	"encoding/json"
	"net/http"

	machinev1alpha1 "github.com/criticalstack/machine-api/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// this function is used to delete a *machine* instead of a node, if one is present
func deleteNodeOrMachine(x *Controller, cli client.Client, c echo.Context) (Map, error) {
	n := c.Param("name")
	if n == "" {
		return nil, newStatusError(http.StatusBadRequest, errors.Errorf("expected a name"))
	}
	ctx := c.Request().Context()
	var machs machinev1alpha1.MachineList
	if err := cli.List(ctx, &machs); err != nil {
		return nil, newError(err)
	}

	var res runtime.Object = &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{
			Name: n,
		},
	}

	for _, m := range machs.Items {
		if ref := m.Status.NodeRef; ref != nil {
			if ref.Name == n {
				res = &m
				break
			}
		}
	}

	d, err := parseDeleteOptions(c)
	if err != nil {
		return nil, newStatusError(http.StatusBadRequest, err)
	}

	opts := &client.DeleteAllOfOptions{
		DeleteOptions: client.DeleteOptions{
			DryRun:             d.DryRun,
			PropagationPolicy:  d.PropagationPolicy,
			Preconditions:      d.Preconditions,
			GracePeriodSeconds: d.GracePeriodSeconds,
			Raw:                &d,
		},
	}

	if err := cli.Delete(context.TODO(), res, opts); err != nil {
		return nil, newError(err)
	}
	return Map{}, nil
}

func (x *Controller) MachinesListAll(c echo.Context) error {
	ctx := c.Request().Context()
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	// TODO(ktravis): caching of everything

	var machs machinev1alpha1.MachineList
	if err := cli.List(ctx, &machs); err != nil {
		return newError(err)
	}

	var result []interface{}
	for _, m := range machs.Items {
		r := Map{
			"machine": m,
		}
		if ref := m.Status.NodeRef; ref != nil {
			var n corev1.Node
			if err := cli.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, &n); err != nil {
				if !apierrors.IsNotFound(err) {
					log.Errorf("failed to retrieve machine node: %v", err)
				}
			} else {
				r["node"] = n
			}
		}
		ref := m.Spec.InfrastructureRef
		var inf unstructured.Unstructured
		inf.SetKind(ref.Kind)
		inf.SetAPIVersion(ref.APIVersion)
		if err := cli.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, &inf); err != nil {
			if !apierrors.IsNotFound(err) {
				log.Errorf("failed to retrieve machine infrastructureRef: %v", err)
			}
		} else {
			r["infra"] = &inf
		}
		result = append(result, r)
	}
	return x.sendJSONSuccess(c, Map{"result": result})
}

func (x *Controller) MachinesSchema(c echo.Context) error {
	ctx := c.Request().Context()
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	var ips machinev1alpha1.InfrastructureProviderList
	if err := cli.List(ctx, &ips); err != nil {
		return newError(err)
	}
	for _, ip := range ips.Items {
		if !ip.Status.Ready {
			continue
		}
		var s corev1.Secret
		if err := cli.Get(ctx, client.ObjectKey{Name: "config-schema", Namespace: ip.Spec.InfrastructureRef.Namespace}, &s); err != nil {
			return newError(err)
		}

		var schema map[string]interface{}
		if err := json.Unmarshal(s.Data["schema"], &schema); err != nil {
			return newError(err)
		}
		return x.sendJSONSuccess(c, Map{
			"result": Map{
				"infrastructureProvider": &ip,
				"schema":                 schema,
			},
		})
	}
	return x.sendJSONSuccess(c, Map{"result": Map{}})
}

func (x *Controller) MachinesCreate(c echo.Context) error {
	const machineNamespace = "kube-system"
	ctx := c.Request().Context()
	var u unstructured.Unstructured
	if err := c.Bind(&u); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	u.SetNamespace(machineNamespace)
	configName, _ := u.Object["config"].(string)
	if configName == "" {
		return newStatusError(http.StatusBadRequest, errors.Errorf("expected config name, got %v", u.Object["config"]))
	}

	delete(u.Object, "config")

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	var configs machinev1alpha1.ConfigList
	if err := cli.List(ctx, &configs); err != nil {
		return newError(err)
	}
	if len(configs.Items) == 0 {
		return newError(errors.Errorf("no worker configuration found"))
	}
	if err := cli.Create(ctx, &u); err != nil {
		return newError(err)
	}
	var m machinev1alpha1.Machine
	m.SetName(u.GetName())
	m.SetNamespace(machineNamespace)
	m.Spec.ConfigRef.Name = configName
	m.Spec.ConfigRef.Namespace = machineNamespace
	m.Spec.InfrastructureRef = corev1.ObjectReference{
		APIVersion: u.GetAPIVersion(),
		Kind:       u.GetKind(),
		Name:       u.GetName(),
		Namespace:  u.GetNamespace(),
	}

	if err := cli.Create(ctx, &m); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{"result": Map{}})
}
