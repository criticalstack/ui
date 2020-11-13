package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"strings"
	"text/template"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/criticalstack/ui/internal/log"
)

const kubeconfigTemplate = `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: {{.CAData}}
    server: {{.ControlPlaneEndpoint}}
  name: {{.ClusterName}}
contexts:
- context:
    cluster: {{.ClusterName}}
    namespace: {{.Namespace}}
    user: {{.Username}}
  name: {{.Username}}@{{.ClusterName}}
current-context: {{.Username}}@{{.ClusterName}}
kind: Config
preferences: {}
users:
- name: {{.Username}}
  user:
    token: {{.Token}}
`

type kubeconfigArgs struct {
	ClusterName          string
	ControlPlaneEndpoint string
	CAData               string
	Namespace            string
	Username             string
	Token                string
}

func (args *kubeconfigArgs) validate() error {
	if strings.TrimSpace(args.ClusterName) == "" {
		return errors.New("kubeconfig ClusterName is empty")
	}
	if strings.TrimSpace(args.ControlPlaneEndpoint) == "" {
		return errors.New("kubeconfig ControlPlaneEndpoint is empty")
	}
	if strings.TrimSpace(args.CAData) == "" {
		return errors.New("kubeconfig CAData is empty")
	}
	if strings.TrimSpace(args.Username) == "" {
		return errors.New("kubeconfig Username is empty")
	}
	if strings.TrimSpace(args.Token) == "" {
		return errors.New("kubeconfig Token is empty")
	}
	return nil
}

// kubeconfigTemplate returns either data from a configmap named kubeconfig-template in namespace critical-stack if it
// is present and valid, or the default kubeconfig template
func (x *Controller) kubeconfigTemplate() *template.Template {
	cm, err := x.admin.CoreV1().ConfigMaps("critical-stack").Get(context.TODO(), "kubeconfig-template", metav1.GetOptions{})
	if err == nil {
		// just grab whatever the key is
		for _, v := range cm.Data {
			if n, err := template.New("Kubeconfig").Parse(v); err == nil {
				return n
			}
			log.Errorf("failed to parse kubeconfig template from configmap: %v", err)
			break
		}
	}
	t, _ := template.New("Kubeconfig").Parse(kubeconfigTemplate)
	return t
}

func (x *Controller) buildKubeConfig(t *template.Template, args kubeconfigArgs) (string, error) {
	if args.ClusterName == "" {
		args.ClusterName = "critical-stack"
	}
	if args.ControlPlaneEndpoint == "" {
		args.ControlPlaneEndpoint = x.config.KubeConfig.Host
	}
	if args.CAData == "" {
		args.CAData = base64.StdEncoding.EncodeToString(x.config.KubeConfig.CAData)
	}
	if err := args.validate(); err != nil {
		return "", err
	}
	buf := bytes.NewBufferString("")
	if err := t.Execute(buf, args); err != nil {
		return "", errors.Wrap(err, "kubeconfig template error")
	}
	return buf.String(), nil
}

// SecretsKubeconfig endpoint
func (x *Controller) SecretsKubeconfig(c echo.Context) error {
	// fetch what should be a service-account-token we are converting to kubeconfig
	token, err := x.UserClient(c).CoreV1().Secrets(c.Param("namespace")).Get(context.TODO(), c.Param("name"), parseGetOptions(c))
	if err != nil {
		return newError(err)
	}
	if token.Type != "kubernetes.io/service-account-token" {
		return errors.New("invalid secret type; must be 'kubernetes.io/service-account-token'")
	}
	name := string(token.Data["namespace"])
	if anno := token.GetAnnotations(); anno != nil {
		if n := anno["kubernetes.io/service-account.name"]; n != "" {
			name = n
		}
	}
	s, err := x.buildKubeConfig(x.kubeconfigTemplate(), kubeconfigArgs{
		Username:  name,
		Namespace: string(token.Data["namespace"]), // namespace == name of service account
		Token:     string(token.Data["token"]),
	})
	if err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"resourceVersion": token.ResourceVersion,
		"result":          s,
	})
}
