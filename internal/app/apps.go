package app

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"
)

// AppsDeploy - route for deploying an app from the marketplace
func (x *Controller) AppsDeploy(c echo.Context) error {
	u := User(c)
	if u == nil {
		return newError(errUnknownUser)
	}

	var tmp struct {
		Data struct {
			Metadata metav1.ObjectMeta `json:"metadata"`
			Chart    chart.Chart       `json:"chart"`
		} `json:"data"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}

	namespace, err := parseNamespace(c)
	if err != nil {
		return err
	}

	opts := make([]func(*action.Install), 0)
	if d := c.QueryParam("dryRun"); d != "" {
		dryRun, err := strconv.ParseBool(d)
		if err != nil {
			return newStatusError(400, errors.Wrap(err, "invalid dryRun parameter value"))
		}
		if dryRun {
			opts = append(opts, func(a *action.Install) {
				a.DryRun = true
			})
		}
	}

	extraLabels := map[string]string{
		"marketplace.criticalstack.com/application.name": tmp.Data.Metadata.Name,
		"marketplace.criticalstack.com/source.name":      tmp.Data.Metadata.Labels["marketplace.criticalstack.com/source.name"],
	}
	rel, err := x.helmInstall(u, namespace, &tmp.Data.Chart, nil, extraLabels, opts...)
	if err != nil {
		return errors.Wrap(err, "failed to deploy chart")
	}
	resources := make([]unstructured.Unstructured, 0)
	for _, p := range bytes.Split([]byte(rel.Manifest), []byte(yamlSeparator)) {
		var u unstructured.Unstructured
		if err := yaml.Unmarshal(p, &u.Object); err != nil {
			return newStatusError(http.StatusBadRequest, err)
		}
		resources = append(resources, u)
	}
	return x.sendJSONSuccess(c, Map{
		"result":    rel,
		"resources": resources,
	})
}

// AppsDelete - endpoint for deleting appspec deployment
func (x *Controller) AppsDelete(c echo.Context) error {
	deployID := c.Param("deployid")

	namespace, err := parseNamespace(c)
	if err != nil {
		return err
	}
	if err := x.helmUninstall(User(c), namespace, deployID); err != nil {
		return errors.Wrapf(err, "could not delete deployment for '%s'", deployID)
	}
	return x.sendJSONSuccess(c)
}

// AppsUpdate - endpoint for updating an app from marketplace
func (x *Controller) AppsUpdate(c echo.Context) error {
	releaseName := c.Param("releaseName")

	namespace, err := parseNamespace(c)
	if err != nil {
		return err
	}

	u := User(c)
	if u == nil {
		return newError(errUnknownUser)
	}

	type spec struct {
		Chart chart.Chart `json:"chart"`
	}
	var tmp struct {
		Data struct {
			Metadata metav1.ObjectMeta `json:"metadata"`
			Spec     spec              `json:"spec"`
		} `json:"data"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}

	extraLabels := map[string]string{
		"marketplace.criticalstack.com/application.name": tmp.Data.Metadata.Labels["marketplace.criticalstack.com/application.name"],
		"marketplace.criticalstack.com/source.name":      tmp.Data.Metadata.Labels["marketplace.criticalstack.com/source.name"],
	}
	rel, err := x.helmUpdate(u, namespace, releaseName, &tmp.Data.Spec.Chart, nil, extraLabels)
	if err != nil {
		return errors.Wrap(err, "failed to upgrade chart")
	}

	return x.sendJSONSuccess(c, Map{"result": rel})
}

func (x *Controller) ReleaseSecret(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	var res corev1.Secret

	namespace, err := parseNamespace(c)
	if err != nil {
		return err
	}

	if err := cli.Get(context.TODO(), client.ObjectKey{Namespace: namespace, Name: c.Param("secretName")}, &res); err != nil {
		return newError(err)
	}

	encodedRelease := res.Data["release"]
	dst, err := base64.StdEncoding.DecodeString(string(encodedRelease))
	if err != nil {
		return newError(err)
	}

	reader, err := gzip.NewReader(bytes.NewBuffer(dst))
	if err != nil {
		return newError(err)
	}
	defer reader.Close()

	bRel, err := ioutil.ReadAll(reader)
	if err != nil {
		return newError(err)
	}

	return x.sendJSONSuccess(c, Map{"result": bRel})
}
