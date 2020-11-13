package kube

import (
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

const (
	// DefaultKubeConfigPath contains default path to kubernetes config
	DefaultKubeConfigPath = "/etc/kubernetes/kubeconfig.yaml"
)

func LoadConfig(path string) (*rest.Config, error) {
	loader := clientcmd.NewDefaultClientConfigLoadingRules()
	if path != "" {
		loader.ExplicitPath = path
	} else {
		loader.Precedence = append(loader.Precedence, DefaultKubeConfigPath)
	}
	kubeConfig, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loader, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return nil, err
	}

	// Note this will likely error for kubeconfigs that don't have any client certs
	// For now, Minikube-generated kubeconfig has client certs
	// load TLS client cert info from files if there are no already-embedded certs
	if len(kubeConfig.TLSClientConfig.CertData) == 0 || len(kubeConfig.TLSClientConfig.KeyData) == 0 {
		if err := rest.LoadTLSFiles(kubeConfig); err != nil {
			return nil, err
		}
	}
	return kubeConfig, nil
}
