package app

import (
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	"github.com/criticalstack/ui/internal/sso"
	"github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"golang.org/x/oauth2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	SessionSSOStateKey    = "sso_state"
	SessionSSOStateLength = 16
)

type Claims struct {
	User *v1alpha1.User `json:"user"`
	jwt.StandardClaims
}

// User returns the session user context
func User(c echo.Context) *v1alpha1.User {
	v, ok := c.Get("user").(*jwt.Token)
	if !ok {
		return nil
	}
	return v.Claims.(*Claims).User
}

//nolint:unparam
func displayLoginError(c echo.Context, msg string, args ...interface{}) error {
	if len(args) > 0 {
		msg = fmt.Sprintf(msg, args)
	}
	q := make(url.Values)
	q.Set("error", msg)
	return c.Redirect(303, "/login?"+q.Encode())
}

// Login route
func (x *Controller) Login(c echo.Context) error {
	var tmp struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	cli, err := client.New(x.config.KubeConfig, client.Options{})
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	user, err := x.getUserByEmail(ctx, cli, tmp.Email)
	if err != nil {
		log.Errorf("login failed (%q): %v", tmp.Email, err)
		return newStatusError(http.StatusUnauthorized, errors.Errorf("login failed: unknown user (%s) or incorrect password", tmp.Email))
	}
	if user.Type != v1alpha1.UserTypeLocal {
		return newStatusError(http.StatusUnauthorized, errors.Errorf("cannot directly log in non-local user"))
	}
	user, err = x.validatePassword(ctx, cli, tmp.Email, tmp.Password)
	if err != nil {
		log.Errorf("login failed (%q): %v", tmp.Email, err)
		return newStatusError(http.StatusUnauthorized, errors.Errorf("login failed: unknown user (%s) or incorrect password", tmp.Email))
	}

	b := make([]byte, SessionSSOStateLength)
	if _, err := rand.Read(b); err != nil {
		log.Errorf("failed to read random bytes: %v", err)
		return displayLoginError(c, "Failed to establish session")
	}
	state := base64.RawStdEncoding.EncodeToString(b)
	enc, err := x.cookie.Encode(SessionSSOStateKey, state)
	if err != nil {
		log.Errorf("failed to read random bytes: %v", err)
		return displayLoginError(c, "Failed to establish session")
	}
	c.SetCookie(&http.Cookie{
		Name:  SessionSSOStateKey,
		Value: enc,
		Path:  "/",
	})

	t, err := x.loginUser(c, user)
	if err != nil {
		return errors.New("Login failed")
	}

	cfg, err := x.uiConfig(ctx)
	if err != nil {
		log.Errorf("error retrieving ui config: %v", err)
	}
	return x.sendJSONSuccess(c, Map{
		"namespace": user.DefaultNamespace,
		"result":    user,
		"token":     t,
		"config":    cfg,
	})
}

func (x *Controller) loginUser(c echo.Context, user *v1alpha1.User) (string, error) {
	if !user.Active {
		return "", errors.Errorf("user %q is disabled, please contact an administrator", user.Email)
	}
	usr := *user
	usr.Groups = []string{""}
	usr.CustomAvatar = ""
	claims := Claims{
		User: &usr,
	}
	claims.ExpiresAt = time.Now().Add(x.config.SessionExpiration).Unix()
	j := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate encoded token and send it as response.
	t, err := j.SignedString([]byte(x.config.SessionKey))
	if err != nil {
		return "", err
	}
	c.SetCookie(&http.Cookie{
		Name:  x.config.SessionCookieName,
		Value: t,
		Path:  "/",
		// Domain:   c.Request.URL.Host,
		HttpOnly: true,
		Secure:   requestIsHTTPS(c.Request()),
		MaxAge:   int(x.config.SessionExpiration / time.Second),
	})
	return t, nil
}

func (x *Controller) logoutUser(c echo.Context) {
	c.SetCookie(&http.Cookie{
		Name:   x.config.SessionCookieName,
		Value:  "",
		Path:   "/",
		Domain: c.Request().URL.Host,
		MaxAge: -1,
	})
}

// TODO(ktravis): check for sso, and log out "officially"
func (x *Controller) Logout(c echo.Context) error {
	x.logoutUser(c)
	return c.Redirect(303, "/login")
}

// SSOLoginRedirect redirects the client to the appropriate URL for an SSO login
func (x *Controller) SSOLoginRedirect(c echo.Context) error {
	conn, err := x.ssoConnector()
	if err != nil {
		log.Errorf("SSO connector creation failed: %v", err)
		return displayLoginError(c, "SSO login temporarily unavailable")
	}
	opts := make([]sso.URLParam, 0)

	def, err := x.getDefaultDexConnector()
	if err != nil {
		log.Errorf("SSO connector creation failed: %v", err)
		return displayLoginError(c, "SSO login temporarily unavailable")
	}
	if def != nil {
		if id, _ := def.Object["id"].(string); id != "" {
			opts = append(opts, sso.SetQuery("connector_id", id))
		}
	}

	b := make([]byte, SessionSSOStateLength)
	if _, err := rand.Read(b); err != nil {
		log.Errorf("failed to read random bytes: %v", err)
		return displayLoginError(c, "Failed to establish session")
	}
	state := base64.StdEncoding.EncodeToString(b)

	enc, err := x.cookie.Encode(SessionSSOStateKey, state)
	if err != nil {
		log.Errorf("failed to read random bytes: %v", err)
		return displayLoginError(c, "Failed to establish session")
	}
	c.SetCookie(&http.Cookie{
		Name:  SessionSSOStateKey,
		Value: enc,
		Path:  "/",
	})

	// NOTE(ktravis): do not let the browser cache this redirect under any
	// circumstances, or the state cookie will be invalid
	c.Response().Header().Set("Cache-Control", "no-cache")
	return c.Redirect(http.StatusPermanentRedirect, conn.RedirectURL(state, opts...))
}

// TODO(ktravis): convert all of these to have consistent error handling (json vs rendering a page)

func (x *Controller) ssoConnector(ocOpts ...func(*oauth2.Config)) (sso.Connector, error) {
	conf, err := x.GetSSOConfig(x.admin)
	if err != nil {
		return nil, err
	}
	dc, err := x.findCriticalStackDexClient()
	if err != nil {
		return nil, err
	}
	oc, err := dexClientToOAuth2Config(dc)
	if err != nil {
		return nil, err
	}
	for _, opt := range ocOpts {
		opt(oc)
	}

	pool := x509.NewCertPool()
	if sys, err := x509.SystemCertPool(); err == nil {
		pool = sys
	}
	if conf.ProviderCAFile != "" {
		b, err := ioutil.ReadFile(conf.ProviderCAFile)
		if err != nil {
			return nil, errors.Wrapf(err, "failed reading provider CA cert %q", conf.ProviderCAFile)
		}
		if !pool.AppendCertsFromPEM(b) {
			return nil, errors.Errorf("failed adding CA cert data to pool")
		}
	}
	hc := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				RootCAs: pool,
			},
		},
	}
	return sso.NewConnector(conf.ProviderURL, oc, hc)
}

func (x *Controller) SSOCallback(c echo.Context) error {
	ctx := c.Request().Context()
	ck, err := c.Cookie(SessionSSOStateKey)
	if err != nil {
		return displayLoginError(c, "Session state invalid")
	}
	var state string
	if err := x.cookie.Decode(SessionSSOStateKey, ck.Value, &state); err != nil {
		return displayLoginError(c, "Session state invalid")
	}
	if state == "" || c.QueryParam("state") != state {
		return displayLoginError(c, "Session state invalid")
	}

	conn, err := x.ssoConnector()
	if err != nil {
		if errors.Cause(err) == sso.ErrNoConfiguration {
			return c.Redirect(http.StatusFound, "/login")
		}
		log.Errorf("SSO connector creation failed: %v", err)
		return displayLoginError(c, "SSO login temporarily unavailable")
	}

	info, err := conn.Authenticate(c.QueryParam("code"))
	if err != nil {
		log.Errorf("SSO auth failed: %v", err)
		return displayLoginError(c, "Authentication failure")
	}
	if info.Email == "" {
		log.Errorf("no email returned with user information")
		return displayLoginError(c, "Authentication failure")
	}
	cli, err := client.New(x.config.KubeConfig, client.Options{})
	if err != nil {
		return err
	}
	user, err := x.getUserByEmail(ctx, cli, info.Email)
	if err != nil {
		if !apierrors.IsNotFound(err) {
			log.Errorf("error retrieving user: %v", err)
			return displayLoginError(c, "Authentication failure")
		}
		// create user if they aren't found
		ur, err := CreateUser(ctx, cli, v1alpha1.UserTemplate{
			Username: info.Name,
			Email:    info.Email,
			Active:   true,
			Groups:   info.Groups,
			Type:     v1alpha1.UserTypeSSO,
		})
		if err != nil {
			log.Errorf("user creation failed: %v", err)
			return displayLoginError(c, "Login failed")
		}

		user, err = waitForUser(ctx, cli, ur)
		if err != nil {
			log.Errorf("waitForUser failed: %v", err)
			return displayLoginError(c, "Login failed - please try again")
		}
	}
	if user.DefaultNamespace == "" {
		// get a "default" namespace for the user if one isn't set
		k, err := x.impersonateUser(user)
		if err != nil {
			log.Errorf("failed listing namespaces: %v", err)
		} else {
			nss, err := x.ListUserNamespaces(ctx, k)
			if err != nil {
				log.Errorf("failed listing namespaces: %v", err)
			} else {
				// TODO(ktravis): rather than picking the first, it would be nice to pick the namespace with the most permissive rules
				for _, ns := range nss {
					user.DefaultNamespace = ns.Name
					break
				}
			}
		}
	}

	// TODO(ktravis): fix this jank
	user.Groups = append(info.Groups, "system:authenticated")
	if err := updateOwningUserRequest(ctx, cli, user); err != nil {
		log.Errorf("failed updating user: %v", err)
	}
	if _, err := x.loginUser(c, user); err != nil {
		if !user.Active {
			return displayLoginError(c, "User is not enabled, please contact an administrator.")
		}
		return displayLoginError(c, "Login failed")
	}
	return c.Redirect(http.StatusFound, "/")
}

func (x *Controller) MustUser(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		u := User(c)
		switch {
		case u == nil:
			log.Error("Middleware Validation Failure: MustUser (no session)")
			return newStatusError(http.StatusUnauthorized, errors.Errorf("invalid session"))
		case !u.Active:
			log.Errorf("Middleware Validation Failure: MustUser - Account Inactive (%s)", u.Email)
			return newStatusError(http.StatusUnauthorized, errors.Errorf("invalid session"))
		default:
		}
		var users v1alpha1.UserList
		if err := x.commonCache.List(c.Request().Context(), &users, client.MatchingField("email", u.Email)); err != nil {
			log.Errorf("Error retrieving user: %v", err)
			return newStatusError(http.StatusUnauthorized, errors.Errorf("invalid session"))
		}
		if len(users.Items) != 1 {
			log.Errorf("Error retrieving user: invalid result length %d", len(users.Items))
			return newStatusError(http.StatusUnauthorized, errors.Errorf("invalid session"))
		}
		v, ok := c.Get("user").(*jwt.Token)
		if !ok {
			log.Errorf("Error retrieving user from token")
			return newStatusError(http.StatusUnauthorized, errors.Errorf("invalid session"))
		}
		v.Claims.(*Claims).User = &users.Items[0]
		return next(c)
	}
}
