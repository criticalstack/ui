package e2e_test

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"math/rand"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/app"
	"github.com/criticalstack/ui/internal/kube"
	"github.com/criticalstack/ui/internal/log"
	serverlog "github.com/criticalstack/ui/internal/log"
	"github.com/criticalstack/ui/internal/rbac"
	"github.com/google/go-cmp/cmp"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var (
	// if this flag is not present, log and exit
	e2e = flag.Bool("e2e", false, "run e2e tests")

	defaultServerEndpoint = "http://localhost:8000"

	// the expected server version to be returned by the API
	serverVersion = flag.String("server_version", app.Version, "expected server version")

	kubeConfigPath = flag.String("kubeconfig-path", "", "kubeconfig path (must be absolute) or autodetect")

	testdataDir = flag.String("testdata", "./testdata", "path to testdata")

	external = flag.Bool("external", false, "do not run a local server, validate external server")

	serverURL *url.URL

	kubeConfig *rest.Config

	logBuffer = &struct{ bytes.Buffer }{}
)

func printErrorLogs(t *testing.T) func() {
	var b bytes.Buffer
	old := logBuffer.Buffer
	logBuffer.Buffer = b
	return func() {
		if t.Failed() {
			s := logBuffer.String()
			if len(s) > 0 {
				t.Log("Captured logs:\n" + logBuffer.String())
			}
		}
		logBuffer.Buffer = old
	}
}

func TestHealthCheck(t *testing.T) {
	defer printErrorLogs(t)()
	s := defaultSession()
	b, err := s.getBytes("/healthz")
	if err != nil {
		t.Fatal(err)
	}
	if diff := cmp.Diff(string(b), "ok"); diff != "" {
		t.Errorf("unexpected response: %v", diff)
	}
}

// TODO(ktravis): add a test that we can list/create/update generic resources via /api/v1/namespaces/:namespace/resources

func TestServerVersion(t *testing.T) {
	defer printErrorLogs(t)()
	s, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := s.do(s.get("/api/v1/config"))
	if err != nil {
		t.Fatal(err)
	}
	if *serverVersion != resp.ServerVersion {
		t.Fatalf("unexpected server version %q (wanted %q)", resp.ServerVersion, *serverVersion)
	}
}

func TestUIConfig(t *testing.T) {
	defer printErrorLogs(t)()
	// XXX(ktravis): show that this doesn't work without auth
	//s := defaultSession()
	s, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}

	var config map[string]interface{}
	if err := s.doResult(s.get("/api/v1/config"), &config); err != nil {
		t.Fatal(err)
	}

	// TODO: validate config contents against flags/envvars that set expected values
	// TODO: expected kubernetes.version == x.x.x
	if _, ok := config["kubernetes"].(map[string]interface{}); !ok {
		t.Errorf("expected UI config to contain a 'kubernetes' key")
	}
	if _, ok := config["marketplace"].(map[string]interface{}); !ok {
		t.Errorf("expected UI config to contain a 'marketplace' key")
	}
}

type testFailure struct {
	rc int
}

func (e testFailure) Error() string {
	return fmt.Sprintf("tests failed (%d)", e.rc)
}

func TestMain(m *testing.M) {
	flag.Parse()

	if !*e2e {
		fmt.Println("skipping e2e tests, -e2e=false")
		os.Exit(0)
	}
	rand.Seed(time.Now().Unix())

	endpoint := defaultServerEndpoint
	if a := flag.Arg(0); a != "" {
		endpoint = a
	}
	if !strings.HasPrefix(endpoint, "http") {
		// "debug"?
		fmt.Println("defaulting to http")
		endpoint = "http://" + endpoint
	}
	u, err := url.Parse(endpoint)
	if err != nil {
		log.Errorf("Failed parsing -server flag: %v", err.Error())
		os.Exit(1)
	}
	serverURL = u

	rc := 0
	if err := runTests(m); err != nil {
		rc = 1
		if f, ok := err.(testFailure); ok {
			rc = f.rc
		} else {
			log.Errorf(err.Error())
		}
	}
	os.Exit(rc)
}

// TODO(ktravis): not crazy about returning cleanup from this, but we can refactor later
func localSetup() (func(), error) {
	// since this is going to run in a go test, the CWD may not be the same as
	// the user invoking it
	if *kubeConfigPath != "" && !filepath.IsAbs(*kubeConfigPath) {
		return nil, errors.Errorf("Flag -kubeconfig must be an absolute path")
	}
	kc, err := kube.LoadConfig(*kubeConfigPath)
	if err != nil {
		return nil, errors.Wrap(err, "failed loading kubeconfig")
	}
	kubeConfig = kc

	serverlog.RedirectStdLog(logBuffer)

	var wg sync.WaitGroup
	fns := make([]func(), 0)
	cleanup := func() {
		for i := len(fns) - 1; i >= 0; i-- {
			fns[i]()
		}
		wg.Wait()
	}

	ctx, cancel := context.WithCancel(context.Background())
	fns = append(fns, cancel)

	cli, err := client.New(kubeConfig, client.Options{})
	if err != nil {
		return nil, err
	}

	defaultEmail = fmt.Sprintf("devtest-%s@criticalstack.com", randString(8))
	defaultPassword = randString(16)

	config := app.Config{
		KubeConfig: kubeConfig,
		AssetsDir:  *testdataDir,
		Address:    serverURL.Host,
	}
	ctrl, err := app.New(config)
	if err != nil {
		cleanup()
		return nil, err
	}
	go func() {
		wg.Add(1)
		if err := ctrl.Run(ctx); err != nil {
			log.Errorf("Error running server: %v", err)
		}
		wg.Done()
	}()

	ur, err := app.CreateUser(ctx, cli, v1alpha1.UserTemplate{
		Username: "Cluster Administrator",
		Email:    defaultEmail,
		Active:   true,
		Type:     v1alpha1.UserTypeLocal,
	})
	if err != nil {
		return nil, err
	}

	wg.Add(1)
	fns = append(fns, func() {
		defer wg.Done()
		propagation := metav1.DeletePropagationBackground
		cli.Delete(ctx, ur, &client.DeleteOptions{PropagationPolicy: &propagation})
	})
	u := ur.Status.User
	if err := app.CreateUserPassword(ctx, cli, ur, defaultPassword); err != nil {
		return cleanup, err
	}
	if _, err := rbac.AddClusterRoleBindingSubjects(ctx, cli, u+"-cluster-admin", rbac.ClusterRoleRef("cluster-admin"), []metav1.OwnerReference{app.UserOwnerReference(ur)}, rbac.UserSubject(ur.Spec.UserTemplate.Email)); err != nil {
		return cleanup, err
	}
	if _, err := rbac.AddClusterRoleBindingSubjects(ctx, cli, u+"-users-editor", rbac.ClusterRoleRef("users-editor"), []metav1.OwnerReference{app.UserOwnerReference(ur)}, rbac.UserSubject(ur.Spec.UserTemplate.Email)); err != nil {
		return cleanup, err
	}
	return cleanup, nil
}

func runTests(m *testing.M) error {
	if *external {
		fmt.Println("-external: no local server")
	} else {
		cleanup, err := localSetup()
		if err != nil {
			return err
		}
		defer cleanup()
	}
	// wait for server
	s := defaultSession()

	tick := time.NewTicker(500 * time.Millisecond)
	// TODO(ktravis): get ctrl+c working
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

L:
	for {
		select {
		case <-tick.C:
			if _, _, err := s.doRaw(s.get("/healthz")); err == nil {
				break L
			}
		case <-ctx.Done():
			s := logBuffer.String()
			if len(s) > 0 {
				log.Errorf("Captured logs: %s\n", s)
			}
			return errors.Errorf("error waiting for server to respond: %v", ctx.Err())
		}
	}
	tick.Stop()
	logBuffer.Reset()
	if rc := m.Run(); rc != 0 {
		return testFailure{rc}
	}
	return nil
}
