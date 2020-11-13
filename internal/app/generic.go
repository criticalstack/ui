package app

import (
	"context"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/criticalstack/ui/internal/log"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func resourceName(c echo.Context) string {
	s, _ := c.Get("resource").(string)
	if v := c.Param("resource"); v != "" {
		s = v
	}
	return s
}

func (x *Controller) mapResource(c echo.Context, gvr schema.GroupVersionResource) (*schema.GroupVersionKind, error) {
	u := User(c)
	if u == nil {
		return nil, errUnknownUser
	}
	ic := x.impersonationConfig(rest.ImpersonationConfig{
		UserName: u.Email,
		Groups:   u.Groups,
	})
	mapper, err := wrapper{x.cachedDiscovery, ic}.ToRESTMapper()
	if err != nil {
		return nil, err
	}

	// TODO(ktravis): version query

	kinds, err := mapper.KindsFor(gvr)
	if err != nil {
		return nil, err
	}
	if len(kinds) == 0 {
		return nil, errors.New("no kinds found")
	}
	return &kinds[0], nil
}

func (x *Controller) GenericGet(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	gvr := schema.ParseGroupResource(resourceName(c)).WithVersion("")

	gvk, err := x.mapResource(c, gvr)
	if err != nil {
		return newError(err)
	}
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	var res unstructured.Unstructured
	res.SetGroupVersionKind(*gvk)

	if err := cli.Get(context.TODO(), client.ObjectKey{Namespace: ns, Name: c.Param("name")}, &res); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"result":          res.Object,
		"resourceVersion": res.GetResourceVersion(),
	})
}

func (x *Controller) GenericListAll(c echo.Context) error {
	gvr := schema.ParseGroupResource(resourceName(c)).WithVersion("")

	gvk, err := x.mapResource(c, gvr)
	if err != nil {
		return newError(err)
	}
	gvr.Group = gvk.Group
	gvr.Version = gvk.Version
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	var result unstructured.UnstructuredList
	opts, err := parseListOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}

	var resourceVersion int
	params := c.QueryParams()
	// for cluster resources
	if len(params["namespace"]) == 0 {
		params["namespace"] = append(params["namespace"], "")
	}
	for _, ns := range params["namespace"] {
		var list unstructured.UnstructuredList
		list.SetGroupVersionKind(*gvk)
		opts.Namespace = ns

		if err := cli.List(context.TODO(), &list, opts); err != nil {
			return newError(err)
		}
		if err := x.transformResourceList(c, cli, *gvk, &list); err != nil {
			return newError(err)
		}

		result.Items = append(result.Items, list.Items...)
		rv, err := strconv.Atoi(list.GetResourceVersion())
		if err != nil {
			log.Infof("error comparing resourve versions: %v", err.Error())
		} else {
			if resourceVersion == 0 {
				resourceVersion = rv
			}
			if rv < resourceVersion {
				resourceVersion = rv
			}
		}
	}

	if c.QueryParam("as") == "Table" {
		tc, err := x.tableConverterFor(c.Request().Context(), cli, gvr)
		if err != nil {
			return newError(err)
		}
		table, err := tc.ConvertToTable(c.Request().Context(), &result, &metav1.TableOptions{
			IncludeObject: metav1.IncludeObject,
		})
		if err != nil {
			return newError(err)
		}
		return x.sendJSONSuccess(c, Map{
			"result":          table,
			"resourceVersion": resourceVersion,
		})
	}

	return x.sendJSONSuccess(c, Map{
		"result":          result.Items,
		"resourceVersion": resourceVersion,
	})
}

func (x *Controller) GenericCreate(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	user := User(c)
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	var gvk *schema.GroupVersionKind
	if res := resourceName(c); res != "" && res != "resources" {
		gvr := schema.ParseGroupResource(res).WithVersion("")
		gvk, err = x.mapResource(c, gvr)
		if err != nil {
			return newError(err)
		}
		if fn := customHooks[hookKey{createHook, gvk.GroupKind()}]; fn != nil {
			log.Debugf("running custom create hook for %s", gvk)
			m, err := fn(x, cli, c)
			if err != nil {
				log.Errorf("create hook for %s failed: %v", gvk, err)
				return newError(err)
			}
			return x.sendJSONSuccess(c, m)
		}
	}

	var u unstructured.Unstructured
	if err := c.Bind(&u); err != nil {
		return newError(err)
	}
	u.SetNamespace(ns)
	if gvk != nil {
		u.SetGroupVersionKind(*gvk)
	}

	labels := u.GetLabels()
	if labels == nil {
		labels = make(map[string]string)
	}
	labels["created-by"] = safeEmail(user.Email)
	u.SetLabels(labels)

	if err := cli.Create(context.TODO(), &u); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, result(&u))
}

func (x *Controller) GenericPatch(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	gvr := schema.ParseGroupResource(resourceName(c)).WithVersion("")
	gvk, err := x.mapResource(c, gvr)
	if err != nil {
		return newError(err)
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	var u unstructured.Unstructured
	u.SetName(c.Param("name"))
	u.SetNamespace(ns)
	u.SetGroupVersionKind(*gvk)
	// TODO(ktravis): is there a nice way we can always set the modified-by label here?

	b, err := ioutil.ReadAll(c.Request().Body)
	c.Request().Body.Close()
	if err != nil {
		return newError(err)
	}
	patch := client.RawPatch(types.JSONPatchType, b)
	if err := cli.Patch(context.TODO(), &u, patch); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"result":          u.Object,
		"resourceVersion": u.GetResourceVersion(),
	})
}

func (x *Controller) GenericUpdate(c echo.Context) error {
	user := User(c)

	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	var gvk *schema.GroupVersionKind
	if res := resourceName(c); res != "resources" {
		gvr := schema.ParseGroupResource(res).WithVersion("")
		gvk, err = x.mapResource(c, gvr)
		if err != nil {
			return newError(err)
		}
		if fn := customHooks[hookKey{updateHook, gvk.GroupKind()}]; fn != nil {
			log.Debugf("running custom update hook for %s", gvk)
			m, err := fn(x, cli, c)
			if err != nil {
				log.Errorf("update hook for %s failed: %v", gvk, err)
				return newError(err)
			}
			return x.sendJSONSuccess(c, m)
		}
	}

	var u unstructured.Unstructured
	if err := c.Bind(&u); err != nil {
		return newError(err)
	}
	u.SetNamespace(ns)
	if gvk != nil {
		u.SetGroupVersionKind(*gvk)
	}

	labels := u.GetLabels()
	if labels == nil {
		labels = make(map[string]string)
	}
	labels["updated-by"] = safeEmail(user.Email)
	u.SetLabels(labels)
	if err := cli.Update(context.TODO(), &u); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"result":          u.Object,
		"resourceVersion": u.GetResourceVersion(),
	})
}

func (x *Controller) GenericDelete(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	gvr := schema.ParseGroupResource(resourceName(c)).WithVersion("")
	gvk, err := x.mapResource(c, gvr)
	if err != nil {
		return newError(err)
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	if fn := customHooks[hookKey{deleteHook, gvk.GroupKind()}]; fn != nil {
		log.Debugf("running custom delete hook for %s", gvk)
		m, err := fn(x, cli, c)
		if err != nil {
			log.Errorf("delete hook for %s failed: %v", gvk, err)
			return newError(err)
		}
		return x.sendJSONSuccess(c, m)
	}

	d, err := parseDeleteOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
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

	var u unstructured.Unstructured
	u.SetName(c.Param("name"))
	u.SetNamespace(ns)
	u.SetGroupVersionKind(*gvk)
	if err := cli.Delete(context.TODO(), &u, opts); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"result":          u.Object,
		"resourceVersion": u.GetResourceVersion(),
	})
}

func (x *Controller) GenericDeleteAll(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	gvr := schema.ParseGroupResource(resourceName(c)).WithVersion("")
	gvk, err := x.mapResource(c, gvr)
	if err != nil {
		return newError(err)
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	l, err := parseListOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	d, err := parseDeleteOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}

	opts := &client.DeleteAllOfOptions{
		ListOptions: *l,
		DeleteOptions: client.DeleteOptions{
			DryRun:             d.DryRun,
			PropagationPolicy:  d.PropagationPolicy,
			Preconditions:      d.Preconditions,
			GracePeriodSeconds: d.GracePeriodSeconds,
			Raw:                &d,
		},
	}

	var u unstructured.Unstructured
	u.SetNamespace(ns)
	u.SetGroupVersionKind(*gvk)
	if err := cli.DeleteAllOf(context.TODO(), &u, opts); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c)
}

// DeleteSelectedOptions is used to delete
// selected items from a table
type DeleteSelectedOptions struct {
	All           bool
	Items         []string
	DeleteOptions *metav1.DeleteOptions
	ListOptions   metav1.ListOptions
}

func (x *Controller) GenericDeleteSelected(c echo.Context) error {
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	gvr := schema.ParseGroupResource(resourceName(c)).WithVersion("")
	gvk, err := x.mapResource(c, gvr)
	if err != nil {
		return newError(err)
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	l, err := parseListOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	d, err := parseDeleteOptions(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	gotOpts := &DeleteSelectedOptions{
		DeleteOptions: &d,
	}
	if err := c.Bind(gotOpts); err != nil {
		return newError(err)
	}

	opts := &client.DeleteAllOfOptions{
		ListOptions: *l,
		DeleteOptions: client.DeleteOptions{
			DryRun:             gotOpts.DeleteOptions.DryRun,
			PropagationPolicy:  gotOpts.DeleteOptions.PropagationPolicy,
			Preconditions:      gotOpts.DeleteOptions.Preconditions,
			GracePeriodSeconds: gotOpts.DeleteOptions.GracePeriodSeconds,
			Raw:                gotOpts.DeleteOptions,
		},
	}

	var u unstructured.Unstructured
	u.SetNamespace(ns)
	u.SetGroupVersionKind(*gvk)
	if gotOpts.All {
		if err := cli.DeleteAllOf(context.TODO(), &u, opts); err != nil {
			return newError(err)
		}
		return x.sendJSONSuccess(c)
	}

	var wg sync.WaitGroup
	ch := make(chan error, len(gotOpts.Items))
	for _, v := range gotOpts.Items {
		wg.Add(1)
		go func(item string) {
			defer wg.Done()
			var u unstructured.Unstructured
			u.SetName(item)
			u.SetNamespace(ns)
			u.SetGroupVersionKind(*gvk)

			cli, err := x.userClient(c)
			if err != nil {
				ch <- err
				return
			}

			if err := cli.Delete(context.TODO(), &u, &opts.DeleteOptions); err != nil {
				ch <- err
				return
			}
		}(v)
	}
	wg.Wait()
	close(ch)
	errMsg := []string{}
	for e := range ch {
		if e != nil {
			errMsg = append(errMsg, e.Error())
		}
	}
	if len(errMsg) > 0 {
		return errors.New(strings.Join(errMsg, ","))
	}

	return x.sendJSONSuccess(c)
}
