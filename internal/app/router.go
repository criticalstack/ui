package app

import (
	"fmt"
	"html/template"
	"io"
	"net/http"
	"path/filepath"

	"github.com/criticalstack/ui/internal/log"
	echo "github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	kerrors "k8s.io/apimachinery/pkg/api/errors"
)

type coder interface {
	Code() int
}

type statusError struct {
	error
	code int
}

func (se statusError) Code() int {
	if kerrors.IsForbidden(errors.Cause(se)) {
		return http.StatusForbidden
	}
	return se.code
}

func (se statusError) Cause() error {
	return se.error
}

func newStatusError(code int, err error) error {
	return statusError{error: err, code: code}
}

func newError(err error) error {
	return newStatusError(http.StatusInternalServerError, err)
}

type stackTracer interface {
	StackTrace() errors.StackTrace
}

type renderer struct {
	templates *template.Template
}

func (t *renderer) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.templates.ExecuteTemplate(w, name, data)
}

func (x *Controller) loadRoutes(e *echo.Echo, https bool) {
	e.Use(middleware.Recover())
	logConfig := middleware.DefaultLoggerConfig
	logConfig.Output = log.Output()
	e.Use(middleware.LoggerWithConfig(logConfig))

	e.Use(middleware.Gzip())
	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		HSTSMaxAge:            86400, // TODO(anordhoff): longer max age (31536000)?
		HSTSExcludeSubdomains: true,  // TODO(anordhoff): should we be including subdomains?
	}))
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete},
		AllowHeaders: []string{
			"Origin",
			"X-Requested-With",
			"Content-Type",
			"Content-Length",
			"Accept",
			"Accept-Encoding",
			"X-CS-CSRF-Token",
			"X-Forwarded-Proto",
			"Authorization",
		},
	}))

	cookieNamePrefix := ""
	if https {
		cookieNamePrefix = "__Host-"
	}
	e.Use(CSRFWithConfig([]byte(x.config.SessionKey), middleware.CSRFConfig{
		Skipper: func(c echo.Context) bool {
			// TODO(anordhoff): populate paths to skip automatically
			return c.Request().URL.Path == "/dex/token"
		},
		TokenLookup:  "header:X-CS-CSRF-Token",
		CookieName:   cookieNamePrefix + "cs-csrf",
		CookiePath:   "/",
		CookieMaxAge: 43200,
		CookieSecure: https,
	})) // TODO(anordhoff): safe to use session key as hmac secret key?

	t := &renderer{
		templates: template.Must(template.ParseGlob(filepath.Join(x.config.AssetsDir, "*.html"))),
	}
	e.Renderer = t
	e.Static("/assets", x.config.AssetsDir)

	errHandler := func(err error, c echo.Context) {
		code := http.StatusInternalServerError
		if x, ok := err.(coder); ok {
			code = x.Code()
		} else if he, ok := err.(*echo.HTTPError); ok {
			code = he.Code
		} else if kerrors.IsForbidden(errors.Cause(err)) {
			code = http.StatusForbidden
		}

		name := "N/A"
		if u := User(c); u != nil {
			name = u.Name
		}
		args := []zap.Field{
			zap.String("method", c.Request().Method),
			zap.String("path", c.Request().URL.Path),
			zap.String("user", name),
			zap.String("error", err.Error()),
		}
		if err, ok := errors.Cause(err).(stackTracer); ok {
			f := err.StackTrace()[0]
			args = append(args, zap.String("caller", fmt.Sprintf("%n", f)), zap.String("loc", fmt.Sprintf("%v", f)))
		}

		log.Error("JSON API ERROR", args...)

		ctx := Map{
			"resourceVersion": nil,
			"result":          nil,
			"error":           nil,
		}
		if err != nil {
			ctx["error"] = err.Error()
			ctx["rawError"] = err
		}
		h := Map{
			"version":    Version,
			"apiVersion": APIVersion,
			"context":    ctx,
		}
		if p := c.QueryParam("pretty"); p != "" {
			c.JSONPretty(code, h, "  ")
			return
		}
		c.JSON(code, h)
	}

	e.HTTPErrorHandler = errHandler

	e.File("/", filepath.Join(x.config.AssetsDir, "index.html"))
	e.GET("/healthz", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})

	e.POST("/authorize", x.Login)
	e.DELETE("/authorize", x.Logout)

	jwtmw := middleware.JWTWithConfig(middleware.JWTConfig{
		SigningKey:  []byte(x.config.SessionKey),
		Claims:      &Claims{},
		TokenLookup: "cookie:" + x.config.SessionCookieName,
		ErrorHandlerWithContext: func(err error, c echo.Context) error {
			// NOTE(ktravis): this is a 400 error - but most things will be expecting 401 when auth is not present
			if err == middleware.ErrJWTMissing || err == http.ErrNoCookie {
				log.Errorf("auth error: %v", err)
				err = newStatusError(http.StatusUnauthorized, errors.Errorf("invalid session"))
			}
			return err
		},
	})

	// proxy routes for dex, if present and configured
	e.Any("/dex/*", x.DexProxy)
	e.Any("/dex/callback/"+proxyConnectorID, x.DexProxy, jwtmw)

	e.GET("/sso", x.SSOLoginRedirect)
	e.GET("/sso/status", x.SSOStatus)
	e.GET("/sso/callback", x.SSOCallback)

	e.GET("/kubeconfig", x.GetUserKubeConfig, jwtmw, x.MustUser)
	e.GET("/kubeconfig/download", x.GetUserKubeConfigCallback, jwtmw, x.MustUser)

	// all API requests require at least user authentication
	apiv1 := e.Group("/api/v1", jwtmw, x.MustUser, x.ImpersonationClient)

	// pprof
	if !x.config.DisablePProf {
		apiv1.GET("/debug/*", echo.WrapHandler(http.DefaultServeMux), middleware.Rewrite(map[string]string{
			"/api/v1/*": "/$1",
		}))
	}

	apiv1.GET("/config", x.UIConfigHandler)
	apiv1.GET("/kubeconfig/namespaces/:namespace/secrets/:name", x.SecretsKubeconfig)
	apiv1.GET("/rbac/access", x.ListMyAccess)
	apiv1.GET("/rbac/can-i", x.RBACCheckAccess)
	apiv1.GET("/rbac/namespaces/:namespace/access", x.ListMyAccess)
	apiv1.GET("/rbac/namespaces/:namespace/can-i", x.RBACCheckAccess)

	apiv1.GET("/rbac/users", x.ListUsers)
	apiv1.GET("/rbac/users/:name", x.ListUserRoles)
	apiv1.GET("/rbac/users/:name/access", x.ListUserAccess)
	apiv1.GET("/rbac/groups/:name", x.ListGroupRoles)
	apiv1.GET("/rbac/namespaces/:namespace/users", x.ListUsers)
	apiv1.GET("/rbac/namespaces/:namespace/users/:name", x.ListUserRoles)
	apiv1.GET("/rbac/namespaces/:namespace/users/:name/access", x.ListUserAccess)

	// sso configuration
	apiv1.GET("/sso/config", x.SSOSettingGet)
	apiv1.POST("/sso/config", x.SSOSettingUpdate)
	apiv1.DELETE("/sso/config", x.SSOSettingDelete)

	// Routes with specific behavior for dex connectors
	apiv1.POST("/sso/connectors/:name", x.UpdateDexConnector)
	apiv1.POST("/sso/connectors/:name/default", x.SetDefaultDexConnector)

	apiv1.POST("/users", x.UserAdd)

	apiv1.POST("/users/:name/reset", x.ResetPassword)
	apiv1.POST("/users/password", x.UserChangePassword)
	apiv1.POST("/users/avatar", x.UploadAvatar)
	apiv1.POST("/users/namespace", x.UpdateDefaultNamespace)
	apiv1.POST("/users/shell", x.UserShell)

	apiv1.GET("/marketplace/apps/:app", x.MarketplaceAppDetail) //get the detail of the app
	apiv1.POST("/marketplace/deploy", x.AppsDeploy)
	apiv1.POST("/marketplace/update/:releaseName", x.AppsUpdate)
	apiv1.DELETE("/marketplace/releases/:deployid", x.AppsDelete)
	apiv1.GET("/marketplace/releases/secret/:secretName", x.ReleaseSecret)

	// StackApps
	apiv1.POST("/stackapps/createns", x.CreateStackAppFromNamespace)
	apiv1.POST("/stackapps/export/:name", x.ExportStackApp)
	apiv1.POST("/stackapps/keys/create", x.CreateKeyPair)
	apiv1.POST("/stackapps/keys/upload", x.UploadSigningKey)

	// master server websocket
	apiv1.GET("/websocket", x.KubeProxy)

	apiv1.GET("/resources", x.ListNamespaceResources)
	apiv1.POST("/resources", x.GenericCreate)

	apiv1.GET("/resources/:resource", x.GenericListAll)
	apiv1.POST("/resources/:resource", x.GenericCreate)
	apiv1.DELETE("/resources/:resource", x.GenericDeleteAll)
	apiv1.GET("/resources/:resource/:name", x.GenericGet)
	apiv1.POST("/resources/:resource/:name", x.GenericUpdate)
	apiv1.PATCH("/resources/:resource/:name", x.GenericPatch)
	apiv1.DELETE("/resources/:resource/:name", x.GenericDelete)
	apiv1.POST("/resources/delete/:resource", x.GenericDeleteSelected)

	apiv1.GET("/machines", x.MachinesListAll)
	apiv1.POST("/machines", x.MachinesCreate)
	apiv1.GET("/machines/schema", x.MachinesSchema)

	apiv1.POST("/upload", x.UploadFiles)

	//metrics
	apiv1.GET("/metrics/:metricsType/:metricsName/nodes/:nodeName", x.NodeMetrics)
	apiv1.GET("/metrics/:metricsType/:metricsName/pods", x.PodMetrics)
	apiv1.GET("/metrics/:metricsType/:metricsName/pods/:name", x.PodMetrics)

	// swoll stuff
	if !x.config.DisableSwoll {
		swoll := apiv1.Group("/swoll", jwtmw, x.MustUser, x.ImpersonationClient)

		swoll.GET("/metrics", x.SwollMetrics)
		swoll.GET("/metrics/namespaces/:namespace", x.SwollMetrics)
		swoll.GET("/metrics/namespaces/:namespace/pods/:pod", x.SwollMetrics)
		swoll.GET("/metrics/namespaces/:namespace/pods/:pod/containers/:container", x.SwollMetrics)
	}

	// containers
	apiv1.GET("/namespaces/:namespace/containers", x.ContainersListAll)
	apiv1.GET("/namespaces/:namespace/pods/:name/containers/:containerName", x.ContainerStatus)

	e.File("/*", filepath.Join(x.config.AssetsDir, "index.html"))
}
