package app

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func requestIsHTTPS(r *http.Request) bool {
	switch {
	case r.URL.Scheme == "https":
		return true
	case r.TLS != nil:
		return true
	case strings.HasPrefix(r.Proto, "HTTPS"):
		return true
	case r.Header.Get("X-Forwarded-Proto") == "https":
		return true
	default:
		return false
	}
}

// Used to get the namespace from a query param
// Returns an error if more than one namespace in query param
func parseNamespace(c echo.Context) (string, error) {
	values := c.QueryParams()
	namespaces := values["namespace"]
	if len(namespaces) > 1 {
		return "", newStatusError(http.StatusBadRequest, errors.Errorf("Invalid number of namespace query params"))
	}

	if len(namespaces) == 0 {
		return "", nil
	}

	return namespaces[0], nil
}

func parseListOptions(c echo.Context) (*client.ListOptions, error) {
	ns, err := parseNamespace(c)
	if err != nil {
		return nil, err
	}

	opts := &client.ListOptions{
		Namespace: ns,
		Continue:  c.QueryParam("continue"),
		Raw: &metav1.ListOptions{
			ResourceVersion: c.QueryParam("resourceVersion"),
		},
	}

	if s := c.QueryParam("labelSelector"); s != "" {
		sel, err := labels.Parse(s)
		if err != nil {
			return nil, err
		}
		opts.LabelSelector = sel
	}
	if s := c.QueryParam("fieldSelector"); s != "" {
		sel, err := fields.ParseSelector(s)
		if err != nil {
			return nil, err
		}
		opts.FieldSelector = sel
	}
	if s := c.QueryParam("limit"); s != "" {
		n, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			return nil, err
		}
		opts.Limit = n
	}
	return opts, nil
}

// parseDeleteOptions parses metav1.DeleteOptions from a echo.Context and returns any DeleteOptions along with an error
// preconditions: will NOT be implemented at this time as it is not clear how best to implement it
// orphanDependents:  has been deprecated, so it will not be implemented here
func parseDeleteOptions(c echo.Context) (metav1.DeleteOptions, error) {
	myDeleteOptions := DefaultDeleteOptions

	// gracePeriodSeconds
	if values := c.QueryParam("gracePeriodSeconds"); values != "" {
		convertValues, err := strconv.ParseInt(values, 10, 64)
		if err != nil {
			return metav1.DeleteOptions{}, fmt.Errorf("failed to ParseInt %v", err)
		}
		myDeleteOptions.GracePeriodSeconds = &convertValues
	}

	// propagationPolicy
	if values := c.QueryParam("deletionPropagation"); values != "" {
		valuesTypeConversion := metav1.DeletionPropagation(values)
		myDeleteOptions.PropagationPolicy = &valuesTypeConversion
	}

	// dryRun
	if values := c.QueryParams()["dryRun"]; len(values) > 0 {
		myDeleteOptions.DryRun = values
	}

	return myDeleteOptions, nil
}

func parseGetOptions(c echo.Context) metav1.GetOptions {
	return metav1.GetOptions{
		ResourceVersion: c.QueryParam("resourceVersion"),
	}
}

type Map = map[string]interface{}

type resourceVersioner interface {
	GetResourceVersion() string
}

type unstructuredContenter interface {
	UnstructuredContent() map[string]interface{}
}

//nolint:unparam
func result(rv resourceVersioner, extra ...Map) Map {
	ctx := Map{
		"result":          rv,
		"resourceVersion": rv.GetResourceVersion(),
	}
	if u, ok := rv.(unstructuredContenter); ok {
		ctx["result"] = u.UnstructuredContent()
	}
	for _, m := range extra {
		for k, v := range m {
			ctx[k] = v
		}
	}
	return ctx
}

// sendJSONSuccess is a wrapper for the basic api endpoint result, returning status OK
func (x *Controller) sendJSONSuccess(c echo.Context, params ...Map) error {
	ctx := Map{
		"resourceVersion": "",
		"result":          nil,
	}
	for _, m := range params {
		for k, v := range m {
			ctx[k] = v
		}
	}
	h := Map{
		"version":    Version,
		"apiVersion": APIVersion,
		"context":    ctx,
	}
	if p := c.QueryParam("pretty"); p != "" {
		return c.JSONPretty(http.StatusOK, h, "  ")
	}
	return c.JSON(http.StatusOK, h)
}
