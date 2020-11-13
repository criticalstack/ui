package e2e_test

import (
	"net/http"
	"testing"

	"github.com/criticalstack/ui/api/v1alpha1"
)

func TestSSOConfig(t *testing.T) {
	defer printErrorLogs(t)()
	adminSession, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatal(err)
	}
	//t.Run("clear existing config", func(t *testing.T) {
	//defer printErrorLogs(t)()
	//s := adminSession
	//if _, err := s.do(s.delete("/api/v1/sso/config")); err != nil {
	//// acceptable error
	//if errors.Cause(err).Error() == "configmaps \"sso-config\" not found" {
	//return
	//}
	//t.Errorf("error clearing sso config: %v", err)
	//}
	//})
	//t.Run("sso status disabled", func(t *testing.T) {
	//defer printErrorLogs(t)()
	//s := defaultSession()
	//var m map[string]interface{}
	//if err := s.doResult(s.get("/sso/status"), &m); err != nil {
	//t.Fatal(err)
	//}
	//if x, _ := m["status"].(bool); x {
	//t.Fatalf("expected sso status to be disabled: %+v", m)
	//}
	//})
	t.Run("anonymous forbidden", func(t *testing.T) {
		defer printErrorLogs(t)()
		s := defaultSession()
		if err := s.expectStatus(s.get("/api/v1/sso/config"), http.StatusUnauthorized); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("regular user forbidden", func(t *testing.T) {
		defer printErrorLogs(t)()
		s, cleanup := tempUserSession(t, adminSession, &v1alpha1.User{}, "", "")
		defer cleanup()
		if err := s.expectStatus(s.get("/api/v1/sso/config"), http.StatusForbidden); err != nil {
			t.Fatal(err)
		}
	})

	//t.Run("add config", func(t *testing.T) {
	//defer printErrorLogs(t)()
	//s := adminSession
	//var config sso.Config
	//if err := s.doResult(withJSON(s.post("/api/v1/sso/config"), testSSOConfig), &config); err != nil {
	//t.Fatal(err)
	//}

	//var m map[string]interface{}
	//if err := s.doResult(s.get("/sso/status"), &m); err != nil {
	//t.Fatal(err)
	//}
	//if x, _ := m["status"].(bool); !x {
	//t.Fatalf("expected sso status to be enabled: %+v", m)
	//}
	//if diff := cmp.Diff(testSSOConfig.ProviderURL, m["redirect_url"]); diff != "" {
	//t.Fatalf("unexpected redirect url: %+v", diff)
	//}
	//})

	// TODO(ktravis): try to come up with a way to test the actual SSO login process...
	// I think we could probably deploy something that works as an OpenID/Oauth2
	// provider onto the cluster, give it a nodeport service and then test it
	// that way - could be cool
}
