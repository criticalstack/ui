package app

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/yaml"
)

const (
	dataURLPrefix    = "data:"
	defaultMediaType = "text/plain;charset=US-ASCII"
)

type dataFile struct {
	mediaType string
	data      []byte
	params    map[string]string
}

// This is a loose implementation of parsing data-urls as defined in https://tools.ietf.org/html/rfc2397

func parseDataURL(d string) (*dataFile, error) {
	if !strings.HasPrefix(d, dataURLPrefix) {
		return nil, errors.Errorf("data-url is missing prefix %q", dataURLPrefix)
	}
	d = strings.TrimPrefix(d, dataURLPrefix)
	parts := strings.SplitN(d, ",", 2)
	f := &dataFile{
		mediaType: defaultMediaType,
		data:      []byte(parts[len(parts)-1]),
		params:    make(map[string]string),
	}
	if len(parts) == 1 {
		return f, nil
	}
	params := strings.Split(parts[0], ";")
	if len(params[0]) > 0 {
		f.mediaType = params[0]
		params = params[1:]
	}
	for _, p := range params {
		switch p {
		case "base64":
			b, err := base64.StdEncoding.DecodeString(string(f.data))
			if err != nil {
				return nil, errors.Wrap(err, "invalid base64 content of data-url")
			}
			f.data = b
		case "":
		default:
			eq := strings.SplitN(p, "=", 2)
			if len(eq) != 2 {
				return nil, errors.Errorf("invalid parameter %q", p)
			}
			f.params[eq[0]] = eq[1]
		}
	}
	return f, nil
}

const yamlSeparator = "\n---"

func (x *Controller) UploadFiles(c echo.Context) error {
	var tmp struct {
		Files []string `json:"files"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	allFiles := make([]*dataFile, 0)
	for _, d := range tmp.Files {
		f, err := parseDataURL(d)
		if err != nil {
			return newStatusError(http.StatusBadRequest, err)
		}
		allFiles = append(allFiles, f)
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	allObjects := make([]unstructured.Unstructured, 0)
	for _, f := range allFiles {
		switch {
		case strings.Contains(f.mediaType, "json"):
			var u unstructured.Unstructured
			if err := json.Unmarshal(f.data, &u.Object); err != nil {
				return newStatusError(http.StatusBadRequest, err)
			}
			allObjects = append(allObjects, u)
		case strings.Contains(f.mediaType, "yaml"):
			for _, p := range bytes.Split(f.data, []byte(yamlSeparator)) {
				var u unstructured.Unstructured
				if err := yaml.Unmarshal(p, &u.Object); err != nil {
					return newStatusError(http.StatusBadRequest, err)
				}
				allObjects = append(allObjects, u)
			}
		default:
			return newStatusError(http.StatusBadRequest, errors.Errorf("invalid media type for upload %q", f.mediaType))
		}
	}

	// dry-run first
	for i := range allObjects {
		u := &allObjects[i]
		ns, err := parseNamespace(c)
		if err != nil {
			return err
		}
		if ns != "" {
			u.SetNamespace(ns)
		}
		if err := cli.Get(c.Request().Context(), client.ObjectKey{Name: u.GetName(), Namespace: u.GetNamespace()}, u.DeepCopyObject()); err != nil {
			if !apierrors.IsNotFound(err) {
				return newStatusError(http.StatusBadRequest, err)
			}

			// object was not found, clear out uid and resourceVersion to prep for creation
			u.SetUID("")
			u.SetResourceVersion("")
			if err := cli.Create(c.Request().Context(), u, client.DryRunAll); err != nil {
				return newStatusError(http.StatusBadRequest, err)
			}
			continue
		}

		// object exists, try updating
		if err := cli.Update(c.Request().Context(), u.DeepCopyObject(), client.DryRunAll); err != nil {
			return newStatusError(http.StatusBadRequest, err)
		}
	}

	for i := range allObjects {
		u := &allObjects[i]
		o := u.DeepCopy()
		if _, err := controllerutil.CreateOrUpdate(c.Request().Context(), cli, o, func() error {
			u.DeepCopyInto(o)
			return nil
		}); err != nil {
			return newStatusError(http.StatusBadRequest, err)
		}
	}

	return x.sendJSONSuccess(c, Map{"result": allObjects})
}
