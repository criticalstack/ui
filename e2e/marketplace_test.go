package e2e_test

import (
	"fmt"
	"net/url"
	"testing"

	marketplacev1alpha2 "github.com/criticalstack/marketplace/api/v1alpha2"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"sigs.k8s.io/yaml"
)

func TestMarketplaceAppsDeploy(t *testing.T) {
	defer printErrorLogs(t)()
	s, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}

	ns, err := s.createNamespace(randString(16))
	if err != nil {
		t.Fatal(err)
	}
	defer s.deleteNamespace(ns.Name)

	// TODO(ktravis): let's use our own chart hosting for this? or github maybe?
	appYaml := fmt.Sprintf(`apiVersion: marketplace.criticalstack.com/v1alpha2
appName: apache
kind: Application
metadata:
  generation: 1
  labels:
    marketplace.criticalstack.com/application.name: apache
  name: %s.apache
versions:
- apiVersion: v1
  appVersion: 2.4.43
  created: "2020-06-02T01:34:54Z"
  description: Chart for Apache HTTP Server
  digest: f9c525b996507d7cfd3f1a66d27be3cb6d493cf71644b89fc93ce69c4c5e6e4f
  home: https://httpd.apache.org
  icon: https://bitnami.com/assets/stacks/apache/img/apache-stack-220x234.png
  keywords:
  - apache
  - http
  - https
  - www
  - web
  - reverse proxy
  maintainers:
  - email: containers@bitnami.com
    name: Bitnami
  removed: false
  sources:
  - https://github.com/bitnami/bitnami-docker-apache
  urls:
  - https://charts.bitnami.com/bitnami/apache-7.3.17.tgz
  version: 7.3.17`, randString(8))

	var u map[string]interface{}
	if err := yaml.Unmarshal([]byte(appYaml), &u); err != nil {
		t.Fatal(err)
	}

	// Get a test app from the source repo
	var app marketplacev1alpha2.Application
	if err := s.doResult(withJSON(s.post("/api/v1/resources/applications.marketplace.criticalstack.com"), u), &app); err != nil {
		t.Fatal(err)
	}
	defer s.do(s.delete("/api/v1/resources/applications.marketplace.criticalstack.com/%s", app.Name))

	// Get the latest version of the test app
	var appDetail struct {
		Metadata metav1.ObjectMeta `json:"metadata"`
		Chart    chart.Chart       `json:"chart"`
	}
	if err := s.doResult(s.get("/api/v1/marketplace/apps/%s?version=%s", app.ObjectMeta.Name, app.Versions[0].Version), &appDetail); err != nil {
		t.Fatal(err)
	}

	var rel release.Release
	if err := s.doResult(withJSON(s.post("/api/v1/marketplace/deploy?namespace=%s", ns.Name), V{"data": appDetail}), &rel); err != nil {
		t.Fatal(err)
	}

	if rel.Info.Status != "deployed" {
		t.Error("test app status is not deployed")
	}

	var mprel marketplacev1alpha2.Release
	tp, err := s.watchResource(ns.Name, "releases.marketplace.criticalstack.com/v1alpha2", &mprel, url.Values{
		"fieldSelector": []string{fmt.Sprintf("metadata.name=%s", rel.Name)},
	})
	if err != nil {
		t.Fatalf("error while waiting for release: %v", err)
	}
	if tp != watch.Added {
		t.Fatalf("unexpected event type %q while watching for release", tp)
	}
}
