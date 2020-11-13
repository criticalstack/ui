package sso

import (
	"context"
	"net/url"

	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
	kerrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

var (
	ErrNoConfiguration = errors.New("no SSO configuration found")
	ErrUnverifiedEmail = errors.New("user email address is not verified")
)

// TODO(ktravis): we can get rid of almost all of this if we rely on the dex client config instead
type Config struct {
	ProviderURL      string `json:"providerURL" toml:"provider_url"`
	ProviderCAFile   string `json:"providerCAFile" toml:"provider_ca_file"`
	DexProxyEndpoint string `json:"dexProxyEndpoint"`
}

func NewFromConfigMap(k kubernetes.Interface) (Config, error) {
	cm, err := k.CoreV1().ConfigMaps("critical-stack").Get(context.TODO(), "sso-config", metav1.GetOptions{})
	if err != nil {
		if kerrs.IsNotFound(err) {
			err = ErrNoConfiguration
		}
		return Config{}, errors.Wrap(err, "failed to load SSO configuration")
	}
	return Config{
		DexProxyEndpoint: cm.Data["dexProxyEndpoint"],
		ProviderCAFile:   cm.Data["providerCAFile"],
		ProviderURL:      cm.Data["providerURL"],
	}, nil
}

func UpdateConfigMap(k kubernetes.Interface, conf Config) error {
	if conf.DexProxyEndpoint != "" {
		if _, err := url.Parse(conf.DexProxyEndpoint); err != nil {
			return errors.Wrap(err, "dex proxy endpoint is invalid")
		}
	}
	if _, err := url.Parse(conf.ProviderURL); err != nil {
		return errors.Wrap(err, "provider url is invalid")
	}
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name: "sso-config",
		},
		Data: map[string]string{
			"dexProxyEndpoint": conf.DexProxyEndpoint,
			"providerURL":      conf.ProviderURL,
			"providerCAFile":   conf.ProviderCAFile,
		},
	}
	if _, err := k.CoreV1().ConfigMaps("critical-stack").Update(context.TODO(), cm, metav1.UpdateOptions{}); err != nil {
		if !kerrs.IsNotFound(err) {
			return errors.Wrap(err, "saving SSO config map failed")
		}
		if _, err := k.CoreV1().ConfigMaps("critical-stack").Create(context.TODO(), cm, metav1.CreateOptions{}); err != nil {
			return errors.Wrap(err, "saving SSO config map failed")
		}
	}
	return nil
}
