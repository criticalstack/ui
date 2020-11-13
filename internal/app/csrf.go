// Forked from https://github.com/labstack/echo/blob/master/middleware/csrf.go (commit 6d9e043)

package app

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/pkg/errors"
)

type csrfTokenExtractor func(echo.Context) (string, error)

// CSRFWithConfig returns a CSRF middleware with config.
// See `CSRF()`.
func CSRFWithConfig(key []byte, config middleware.CSRFConfig) echo.MiddlewareFunc {
	// Defaults
	if config.Skipper == nil {
		config.Skipper = middleware.DefaultCSRFConfig.Skipper
	}
	if config.TokenLength == 0 {
		config.TokenLength = middleware.DefaultCSRFConfig.TokenLength
	}
	if config.TokenLookup == "" {
		config.TokenLookup = middleware.DefaultCSRFConfig.TokenLookup
	}
	if config.ContextKey == "" {
		config.ContextKey = middleware.DefaultCSRFConfig.ContextKey
	}
	if config.CookieName == "" {
		config.CookieName = middleware.DefaultCSRFConfig.CookieName
	}
	if config.CookieMaxAge == 0 {
		config.CookieMaxAge = middleware.DefaultCSRFConfig.CookieMaxAge
	}

	// Initialize
	parts := strings.Split(config.TokenLookup, ":")
	extractor := csrfTokenFromHeader(parts[1])
	switch parts[0] {
	case "form":
		extractor = csrfTokenFromForm(parts[1])
	case "query":
		extractor = csrfTokenFromQuery(parts[1])
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if config.Skipper(c) {
				return next(c)
			}

			req := c.Request()
			k, err := c.Cookie(config.CookieName)
			token := ""

			var missingToken bool
			if err != nil {
				missingToken = true
			} else {
				// Reuse token
				token = k.Value
			}

			var invalidToken bool
			switch req.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodTrace:
			default:
				// Validate token only for requests which are not defined as 'safe' by RFC7231
				if len(token) < int(config.TokenLength) {
					invalidToken = true
					break
				}
				clientToken, err := extractor(c)
				if err != nil {
					return echo.NewHTTPError(http.StatusBadRequest, err.Error())
				}
				if !validateCSRFToken(token, clientToken) {
					invalidToken = true
					break
				}
				s := token[:config.TokenLength]
				mac, err := hex.DecodeString(token[config.TokenLength:])
				if err != nil {
					return echo.NewHTTPError(http.StatusBadRequest, err.Error())
				}
				if !validateMAC([]byte(s), mac, key) {
					invalidToken = true
				}
			}

			// Generate token
			if missingToken || invalidToken {
				s := randString(int(config.TokenLength))
				h := hmac.New(sha256.New, key)
				h.Write([]byte(s))
				mac := h.Sum(nil)
				token = s + hex.EncodeToString(mac)
			}

			// Set CSRF cookie
			cookie := new(http.Cookie)
			cookie.Name = config.CookieName
			cookie.Value = token
			if config.CookiePath != "" {
				cookie.Path = config.CookiePath
			}
			if config.CookieDomain != "" {
				cookie.Domain = config.CookieDomain
			}
			cookie.Expires = time.Now().Add(time.Duration(config.CookieMaxAge) * time.Second)
			cookie.Secure = config.CookieSecure
			cookie.HttpOnly = config.CookieHTTPOnly
			c.SetCookie(cookie)

			// Store token in the context
			c.Set(config.ContextKey, token)

			// Protect clients from caching the response
			c.Response().Header().Add(echo.HeaderVary, echo.HeaderCookie)

			if invalidToken {
				return echo.NewHTTPError(http.StatusForbidden, "invalid csrf token")
			}
			return next(c)
		}
	}
}

// csrfTokenFromForm returns a `csrfTokenExtractor` that extracts token from the
// provided request header.
func csrfTokenFromHeader(header string) csrfTokenExtractor {
	return func(c echo.Context) (string, error) {
		return c.Request().Header.Get(header), nil
	}
}

// csrfTokenFromForm returns a `csrfTokenExtractor` that extracts token from the
// provided form parameter.
func csrfTokenFromForm(param string) csrfTokenExtractor {
	return func(c echo.Context) (string, error) {
		token := c.FormValue(param)
		if token == "" {
			return "", errors.New("missing csrf token in the form parameter")
		}
		return token, nil
	}
}

// csrfTokenFromQuery returns a `csrfTokenExtractor` that extracts token from the
// provided query parameter.
func csrfTokenFromQuery(param string) csrfTokenExtractor {
	return func(c echo.Context) (string, error) {
		token := c.QueryParam(param)
		if token == "" {
			return "", errors.New("missing csrf token in the query string")
		}
		return token, nil
	}
}

func validateCSRFToken(token, clientToken string) bool {
	return subtle.ConstantTimeCompare([]byte(token), []byte(clientToken)) == 1
}

// validateMAC reports whether messageMAC is a valid HMAC tag for message.
func validateMAC(message, messageMAC, key []byte) bool {
	mac := hmac.New(sha256.New, key)
	mac.Write(message)
	expectedMAC := mac.Sum(nil)
	return hmac.Equal(messageMAC, expectedMAC)
}

//nolint:unparam
func randString(n int) string {
	const alphanum = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	bb := make([]byte, n)
	if _, err := rand.Read(bb); err != nil {
		// NOTE(ktravis): this is an unlikely case but it needs to be handled,
		// or a vulnerability is introduced (potential entropy exhaustion)
		panic(err)
	}
	for i, b := range bb {
		bb[i] = alphanum[int(b)%len(alphanum)]
	}
	return string(bb)
}
