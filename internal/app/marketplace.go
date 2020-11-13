package app

// Marketplace routines for returning a list of categroies, apps, and app details within the marketplace

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	"github.com/coreos/go-semver/semver"
	marketplacev1alpha2 "github.com/criticalstack/marketplace/api/v1alpha2"
	echo "github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"helm.sh/helm/v3/pkg/chart/loader"
	helmcli "helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
)

// MarkeplaceApps returns all applications in the cluster catalog optionally filtered by category or source
func (x *Controller) MarketplaceAppsListAll(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return errors.Wrap(err, "unable to create marketplace apps client")
	}
	var opts []client.ListOption
	if src := c.QueryParam("source"); src != "" {
		opts = append(opts, client.MatchingLabels{"marketplace.criticalstack.com/source.name": src})
	}
	if cat := strings.ToLower(c.QueryParam("category")); cat != "" {
		opts = append(opts, client.HasLabels{"marketplace.criticalstack.com/application.category." + cat})
	}
	var apps marketplacev1alpha2.ApplicationList
	if cli.List(context.TODO(), &apps, opts...); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"resourceVersion": apps.GetResourceVersion(),
		"result":          apps.Items,
	})
}

func compareVersions(a, b string) int {
	av, err1 := semver.NewVersion(a)
	bv, err2 := semver.NewVersion(b)
	if err1 != nil || err2 != nil {
		return strings.Compare(a, b)
	}
	return av.Compare(*bv)
}

func (x *Controller) MarketplaceAppDetail(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	appid := c.Param("app")

	var app marketplacev1alpha2.Application
	if cli.Get(context.TODO(), client.ObjectKey{Name: appid}, &app); err != nil {
		return newError(err)
	}
	// TODO(ktravis): semver.Sort versions

	reqVersion := c.QueryParam("version")
	var appVersion *marketplacev1alpha2.ChartVersion
	vv := make([]string, 0)
	for _, cv := range app.Versions {
		vv = append(vv, cv.Version)
		v := cv
		if reqVersion != "" {
			if reqVersion == cv.Version {
				appVersion = &v
			}
		} else {
			if appVersion == nil || compareVersions(v.Version, appVersion.Version) > 0 {
				appVersion = &v
			}
		}
	}
	if appVersion == nil {
		if reqVersion != "" {
			return newStatusError(http.StatusNotFound, errors.Errorf("app %q version %q not found", appid, reqVersion))
		}
		return newStatusError(http.StatusNotFound, errors.Errorf("app %q not found", appid))
	}

	settings := &helmcli.EnvSettings{}
	getters := getter.All(settings)
	u, err := url.Parse(appVersion.URLs[0])
	if err != nil {
		return newError(err)
	}
	g, err := getters.ByScheme(u.Scheme)
	if err != nil {
		return newError(err)
	}
	var opts []getter.Option
	if con := metav1.GetControllerOf(&app); con != nil {
		var src marketplacev1alpha2.Source
		if cli.Get(context.TODO(), client.ObjectKey{Name: con.Name}, &src); err != nil {
			return newError(err)
		}
		if src.Spec.CertFile != "" {
			opts = append(opts, getter.WithTLSClientConfig(src.Spec.CertFile, src.Spec.KeyFile, src.Spec.CAFile))
		}
		if src.Spec.Username != "" {
			opts = append(opts, getter.WithBasicAuth(src.Spec.Username, src.Spec.Password))
		}
	}
	buf, err := g.Get(u.String(), opts...)
	if err != nil {
		return newError(err)
	}

	chart, err := loader.LoadArchive(buf)
	if err != nil {
		return newError(err)
	}

	return x.sendJSONSuccess(c, Map{
		"result": Map{
			"app":      appVersion,
			"metadata": app.ObjectMeta,
			"versions": vv,
			"chart":    chart,
		},
	})
}
