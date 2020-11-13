package app

import (
	"crypto/rand"
	"encoding"
	"encoding/base64"
	"os"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
)

const (
	envPrefix = "CS_UI"

	defaultSessionCookieName = "user_session"
	defaultSessionKeyLength  = 50
	defaultAssetsDir         = "./client/build"

	// assumes ui is running in-cluster
	DefaultPrometheusEndpoint = "http://prometheus:9090"
	DefaultSessionExpiration  = 72 * time.Hour
	DefaultServerAddress      = "127.0.0.1:8000"
)

var (
	// order and priority of struct tags to check
	tagNames = []string{"env", "toml", "yaml", "json"}

	// sentinel types
	durationType    = reflect.TypeOf(time.Duration(0))
	textUnmarshaler = reflect.TypeOf(new(encoding.TextUnmarshaler)).Elem()
)

type Config struct {
	KubeConfig            *rest.Config
	Scheme                *runtime.Scheme
	Debug                 bool          `env:"debug"`
	InCluster             bool          `env:"in_cluster"`
	PrometheusEndpoint    string        `env:"prometheus_endpoint"`
	SessionCookieName     string        `env:"session_cookie_name"`
	SessionKey            string        `env:"session_key"`
	SessionExpiration     time.Duration `env:"session_expiration"`
	MarketplaceNoAppsMsg  string        `env:"marketplace_no_apps_msg"`
	MarketplaceNoAppsLink string        `env:"marketplace_no_apps_link"`
	MarketplaceContact    string        `env:"marketplace_contact"`
	DisablePProf          bool          `env:"disable_pprof"`
	AssetsDir             string        `env:"assets_dir"`
	Address               string        `env:"address"`
	CertFile              string        `env:"cert_file"`
	KeyFile               string        `env:"key_file"`
}

func (c *Config) applyDefaults() {
	if c.SessionCookieName == "" {
		c.SessionCookieName = defaultSessionCookieName
	}
	if c.SessionExpiration == 0 {
		c.SessionExpiration = DefaultSessionExpiration
	}
	if c.AssetsDir == "" {
		c.AssetsDir = defaultAssetsDir
	}
	if c.Address == "" {
		c.Address = DefaultServerAddress
	}
	if len(c.SessionKey) == 0 {
		b := make([]byte, defaultSessionKeyLength)
		if _, err := rand.Read(b); err != nil {
			// unlikely but fatal
			panic(err)
		}
		c.SessionKey = base64.RawStdEncoding.EncodeToString(b)
	}
	if c.Scheme == nil {
		c.Scheme = scheme.Scheme
	}
}

func (c *Config) FromEnv() error {
	return fromEnv(reflect.ValueOf(c), envPrefix)
}

func joinNonEmpty(sep string, ss ...string) string {
	result := ""
	for _, s := range ss {
		if s == "" {
			continue
		}
		if result != "" {
			result += sep
		}
		result += s
	}
	return result
}

func fromEnv(v reflect.Value, prefix string) error {
	t := v.Type()
	// special cases
	if t == durationType {
		if e := os.Getenv(prefix); e != "" {
			d, err := time.ParseDuration(e)
			if err != nil {
				return errors.Wrapf(err, "failed to parse %q as %s", prefix, t)
			}
			v.Set(reflect.ValueOf(d))
		}
		return nil
	} else if t.Implements(textUnmarshaler) {
		if e := os.Getenv(prefix); e != "" {
			return v.Interface().(encoding.TextUnmarshaler).UnmarshalText([]byte(e))
		}
		return nil
	}
	switch t.Kind() {
	case reflect.Ptr:
		if e := v.Elem(); !e.IsValid() {
			// skip nil pointers, but we could do this if we wanted to initialize:
			//v.Set(reflect.New(t.Elem()))
			return nil
		}
		return fromEnv(v.Elem(), prefix)
	case reflect.Struct:
		for i := 0; i < t.NumField(); i++ {
			ft := t.Field(i)
			fv := v.Field(i)
			if !fv.CanSet() {
				continue
			}
			pre := prefix
			if !ft.Anonymous {
				n := ft.Name
				for _, tagName := range tagNames {
					if tag, ok := ft.Tag.Lookup(tagName); ok && tag != "-" {
						n = strings.Split(tag, ",")[0]
						break
					}
				}
				pre = joinNonEmpty("_", pre, strings.ToUpper(n))
			}
			if err := fromEnv(fv, pre); err != nil {
				return err
			}
		}
	case reflect.String:
		if e := os.Getenv(prefix); e != "" {
			v.SetString(e)
		}
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		if e := os.Getenv(prefix); e != "" {
			n, err := strconv.ParseInt(e, 10, 64)
			if err != nil {
				return errors.Wrapf(err, "failed to parse %q as %s", prefix, t)
			}
			v.SetInt(n)
		}
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		if e := os.Getenv(prefix); e != "" {
			n, err := strconv.ParseUint(e, 10, 64)
			if err != nil {
				return errors.Wrapf(err, "failed to parse %q as %s", prefix, t)
			}
			v.SetUint(n)
		}
	case reflect.Bool:
		if e := os.Getenv(prefix); e != "" {
			e = strings.ToLower(e)
			// idk man
			v.SetBool(e != "f" && e != "false" && e != "no")
		}
	}
	return nil
}
