package e2e_test

import (
	"testing"
	"time"

	"github.com/dgrijalva/jwt-go"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/rbac"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clientcmdv1 "k8s.io/client-go/tools/clientcmd/api/v1"
	"sigs.k8s.io/yaml"
)

func TestNamespaces(t *testing.T) {
	defer printErrorLogs(t)()
	adminSession, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}
	t.Run("delete namespace with objects", func(t *testing.T) {
		defer printErrorLogs(t)()
		s := adminSession
		ns, err := s.createNamespace(randString(16))
		if err != nil {
			t.Fatal(err)
		}
		defer s.do(s.delete("/api/v1/resources/namespaces/%s", ns.Name))

		var cm unstructured.Unstructured
		cm.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "ConfigMap"})
		cm.SetName("test-config-map")
		cm.Object["data"] = map[string]string{
			"wow": "what a test",
		}
		if err := s.doResult(withJSON(s.post("/api/v1/resources/configmaps?namespace=%s", ns.Name), &cm), &cm); err != nil {
			t.Fatal(err)
		}
		if _, err := s.do(s.delete("/api/v1/resources/namespaces/%s", ns.Name)); err != nil {
			t.Fatal(err)
		}
	})
}

func getContextFromKubeConfig(kc *clientcmdv1.Config, name string) (*clientcmdv1.NamedContext, error) {
	for _, c := range kc.Contexts {
		if c.Name == name {
			return &c, nil
		}
	}
	return nil, errors.Errorf("context %q not found", name)
}

func getClusterFromKubeConfig(kc *clientcmdv1.Config, name string) (*clientcmdv1.NamedCluster, error) {
	for _, c := range kc.Clusters {
		if c.Name == name {
			return &c, nil
		}
	}
	return nil, errors.Errorf("cluster %q not found", name)
}

func getAuthInfoFromKubeConfig(kc *clientcmdv1.Config, name string) (*clientcmdv1.NamedAuthInfo, error) {
	for _, c := range kc.AuthInfos {
		if c.Name == name {
			return &c, nil
		}
	}
	return nil, errors.Errorf("authinfo %q not found", name)
}

// checkKubeConfig validates the kubeconfig current context by checking that the server exists, the authinfo exists, and
// a token is present in the authinfo. It returns the non-empty token if there are no validation errors.
func checkKubeConfig(kc *clientcmdv1.Config) (string, error) {
	ctx, err := getContextFromKubeConfig(kc, kc.CurrentContext)
	if err != nil {
		return "", err
	}
	c, err := getClusterFromKubeConfig(kc, ctx.Context.Cluster)
	if err != nil {
		return "", err
	}
	if c.Cluster.Server == "" {
		return "", errors.Errorf("current context cluster has no server")
	}
	ai, err := getAuthInfoFromKubeConfig(kc, ctx.Context.AuthInfo)
	if err != nil {
		return "", err
	}
	if ai.AuthInfo.Token == "" {
		return "", errors.Errorf("current context user has no token")
	}
	return ai.AuthInfo.Token, nil
}

func TestKubeConfig(t *testing.T) {
	if !*external {
		t.Skip("not external, assuming no dex setup")
	}
	defer printErrorLogs(t)()
	adminSession, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}

	t.Run("admin", func(t *testing.T) {
		defer printErrorLogs(t)()
		_, b, err := adminSession.doRaw(adminSession.get("/kubeconfig"))
		if err != nil {
			t.Fatal(err)
		}
		var kc clientcmdv1.Config
		if err := yaml.Unmarshal(b, &kc); err != nil {
			t.Fatalf("problem with kubeconfig, %v: %s", err, string(b))
		}
		if _, err := checkKubeConfig(&kc); err != nil {
			t.Fatalf("problem with kubeconfig, %v: %s", err, string(b))
		}
	})

	t.Run("local user", func(t *testing.T) {
		defer printErrorLogs(t)()

		pw := randString(12)
		ur, err := adminSession.createUser(&v1alpha1.User{
			UserTemplate: v1alpha1.UserTemplate{
				Username: "test user",
				Email:    randString(8) + "@email.com",
				Active:   true,
			},
		}, pw, "view")
		if err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}
		defer adminSession.deleteUser(ur)
		s, err := login(ur.Spec.Email, pw)
		if err != nil {
			t.Fatalf("created user login failed: %v", err)
		}

		_, b, err := s.doRaw(s.get("/kubeconfig"))
		if err != nil {
			t.Fatal(err)
		}
		var kc clientcmdv1.Config
		if err := yaml.Unmarshal(b, &kc); err != nil {
			t.Fatal(err)
		}
		if _, err := checkKubeConfig(&kc); err != nil {
			t.Fatalf("problem with kubeconfig, %v: %s", err, string(b))
		}
	})

	t.Run("local user privilege escalation", func(t *testing.T) {
		defer printErrorLogs(t)()

		pw := randString(12)
		ur, err := adminSession.createUser(&v1alpha1.User{
			UserTemplate: v1alpha1.UserTemplate{
				Username: "test user",
				Email:    randString(8) + "@email.com",
				Active:   true,
			},
		}, pw, "view")
		if err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}
		defer adminSession.deleteUser(ur)
		s, err := login(ur.Spec.Email, pw)
		if err != nil {
			t.Fatalf("created user login failed: %v", err)
		}

		r := s.get("/kubeconfig")
		//if DexProxy doesn't appropriately handle client headers, escalation is possible
		r.Header.Add("X-REMOTE-USER", "dev@criticalstack.com")
		_, b, err := s.doRaw(r)
		if err != nil {
			t.Fatal(err)
		}
		var kc clientcmdv1.Config
		if err := yaml.Unmarshal(b, &kc); err != nil {
			t.Fatal(err)
		}
		tk, err := checkKubeConfig(&kc)
		if err != nil {
			t.Fatalf("problem with kubeconfig, %v: %s", err, string(b))
		}
		claims := make(jwt.MapClaims)
		token, _, err := new(jwt.Parser).ParseUnverified(tk, claims)
		if err != nil {
			t.Fatalf("could not parse current context user token: %v", err)
		}
		if claims["email"] != ur.Spec.Email {
			t.Fatalf("Privilege escalation: User %s has %v token in kubeconfig, %s", ur.Spec.Email, token, string(b))
		}
	})

	// TODO(ktravis): sso user kubeconfig (once we have sso user tests)
}

func TestAccessSummary(t *testing.T) {
	defer printErrorLogs(t)()
	adminSession, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}

	// create a test namespace
	ns, err := adminSession.createNamespace(randString(8))
	if err != nil {
		t.Fatalf("failed to create test namespace: %v", err)
	}
	defer adminSession.deleteNamespace(ns.Name)

	// create a user with a rolebinding for a cluster role
	pw := randString(12)
	ur, err := adminSession.createUser(&v1alpha1.User{
		UserTemplate: v1alpha1.UserTemplate{
			Username:         "test user",
			Email:            randString(8) + "@email.com",
			Active:           true,
			DefaultNamespace: ns.Name,
		},
	}, pw, "cluster-admin")
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}
	defer adminSession.deleteUser(ur)

	s, err := login(ur.Spec.Email, pw)
	if err != nil {
		t.Fatalf("created user login failed: %v", err)
	}

	hasAccess := func(t *testing.T, s *session, ns, verb, resource string) bool {
		defer printErrorLogs(t)()
		var access map[string]map[string]bool
		if err := s.doResult(s.get("/api/v1/rbac/namespaces/%s/access", ns), &access); err != nil {
			t.Fatalf("created user access call failed: %v", err)
		}
		return access[resource][verb]
	}

	t.Run("admin has ns perms", func(t *testing.T) {
		defer printErrorLogs(t)()
		verb := "create"
		resource := "pods"
		if !hasAccess(t, adminSession, ns.Name, verb, resource) {
			t.Fatalf("admin does not have the expected permission to %q %q", verb, resource)
		}
	})

	t.Run("admin has cluster perms", func(t *testing.T) {
		defer printErrorLogs(t)()
		verb := "list"
		resource := "namespaces"
		if !hasAccess(t, adminSession, ns.Name, verb, resource) {
			t.Fatalf("admin was not expected to have the permission to %q %q", verb, resource)
		}
	})

	t.Run("user has ns perms", func(t *testing.T) {
		defer printErrorLogs(t)()
		verb := "create"
		resource := "pods"
		if !hasAccess(t, s, ns.Name, verb, resource) {
			t.Fatalf("created user %s does not have the expected permission to %q %q", ur.Spec.Email, verb, resource)
		}
	})

	t.Run("user has no alt ns perms", func(t *testing.T) {
		defer printErrorLogs(t)()
		verb := "create"
		resource := "pods"
		ns := "critical-stack"
		if hasAccess(t, s, ns, verb, resource) {
			t.Fatalf("created user %s was not expected to have permission in ns %q to %q %q", ur.Spec.Email, ns, verb, resource)
		}
	})

	t.Run("user has no cluster perms", func(t *testing.T) {
		defer printErrorLogs(t)()
		verb := "list"
		resource := "namespaces"
		if hasAccess(t, s, ns.Name, verb, resource) {
			t.Fatalf("created user %s was not expected to have the permission to %q %q", ur.Spec.Email, verb, resource)
		}
	})

	t.Run("grant user cluster perms", func(t *testing.T) {
		defer printErrorLogs(t)()
		var crb unstructured.Unstructured
		crb.SetGroupVersionKind(schema.GroupVersionKind{Group: "rbac.authorization.k8s.io", Version: "v1", Kind: "ClusterRoleBinding"})
		crb.SetName(randString(10))
		crb.Object["roleRef"] = rbac.ClusterRoleRef("cluster-admin")
		crb.Object["subjects"] = []interface{}{rbac.UserSubject(ur.Spec.Email)}

		if err := Eventually(func() error {
			return adminSession.doResult(withJSON(adminSession.post("/api/v1/resources/clusterrolebindings.rbac.authorization.k8s.io"), &crb), &crb)
		}); err != nil {
			t.Fatal(err)
		}
		defer adminSession.do(adminSession.delete("/api/v1/resources/clusterrolebindings.rbac.authorization.k8s.io/%s", crb.GetName()))
		verb := "list"
		resource := "namespaces"
		if !hasAccess(t, s, ns.Name, verb, resource) {
			t.Fatalf("created user %s does not have the expected permission to %q %q", ur.Spec.Email, verb, resource)
		}
	})
}

func Eventually(f func() error) error {
	for i := 0; i < 10; i++ {
		if f() == nil {
			return nil
		}
		time.Sleep(time.Millisecond * 50)
	}
	return f()
}
