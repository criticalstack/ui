package app

import (
	"encoding/json"

	"github.com/criticalstack/ui/internal/log"
	"github.com/criticalstack/ui/internal/sso"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// setup:
// - does sso-config exist?
// - does client exist?
// - create connectors / set default

// SSOSettingGet displays the current settings
func (x *Controller) SSOSettingGet(c echo.Context) error {
	// If there is an error here, we need to do something different
	conf, err := x.GetSSOConfig(x.UserClient(c))
	if err != nil {
		if errors.Cause(err) != sso.ErrNoConfiguration {
			log.Errorf("failed getting sso config: %v", err)
			return newError(err)
		}
	}
	return x.sendJSONSuccess(c, Map{"result": conf})
}

// SSOSettingDelete clears the sso-config configmap
func (x *Controller) SSOSettingDelete(c echo.Context) error {
	if err := x.UserClient(c).CoreV1().ConfigMaps("critical-stack").Delete(c.Request().Context(), "sso-config", metav1.DeleteOptions{}); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c)
}

// SSOSettingUpdate is for admin user to update the configurations
func (x *Controller) SSOSettingUpdate(c echo.Context) error {
	decoder := json.NewDecoder(c.Request().Body)
	defer c.Request().Body.Close()
	var t struct {
		sso.Config
		Status bool `json:"status"`
	}
	if err := decoder.Decode(&t); err != nil {
		return newError(err)
	}
	if err := x.UpdateSSOConfig(x.UserClient(c), t.Config); err != nil {
		return newError(err)
	}
	t.Status = true
	return x.sendJSONSuccess(c, Map{"result": t})
}

// SSOStatus returns configuration information for the current SSO provider, if present. Used by frontend code to
// control the login screen.
func (x *Controller) SSOStatus(c echo.Context) error {
	var status struct {
		Status       bool   `json:"status"`
		ProviderName string `json:"providerName"`
	}

	// check to make sure this is actually setup?
	if _, err := x.GetSSOConfig(x.admin); err != nil {
		if errors.Cause(err) != sso.ErrNoConfiguration {
			log.Errorf("failed retrieving sso config: %v", err)
		}
		return x.sendJSONSuccess(c, Map{"result": status})
	}
	// confirm that our client exists
	if _, err := x.findCriticalStackDexClient(); err != nil {
		log.Errorf("failed retrieving dex client config: %v", err)
		return x.sendJSONSuccess(c, Map{"result": status})
	}
	def, err := x.getDefaultDexConnector()
	if err != nil {
		log.Errorf("failed listing dex connectors: %v", err)
		// no connectors
		return x.sendJSONSuccess(c, Map{"result": status})
	}
	if def != nil {
		status.Status = true
		status.ProviderName = "Dex"
		if s, ok := def.Object["name"].(string); ok {
			status.ProviderName = s
		}
	}
	return x.sendJSONSuccess(c, Map{"result": status})
}

func (x *Controller) GetSSOConfig(k kubernetes.Interface) (sso.Config, error) {
	return sso.NewFromConfigMap(k)
}

func (x *Controller) UpdateSSOConfig(k kubernetes.Interface, conf sso.Config) error {
	return sso.UpdateConfigMap(k, conf)
}
