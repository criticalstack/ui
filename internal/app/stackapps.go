package app

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"strconv"

	featuresv1alpha1 "github.com/criticalstack/stackapps/api/v1alpha1"
	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/kube"
	"github.com/criticalstack/ui/internal/stackapps"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

var (
	stackappObjectFilter = kube.ObjectFilters{
		kube.Any(
			kube.HasController, kube.ObjectIsType("v1", "Endpoints"), kube.ObjectIsType("cilium.io/v2", "CiliumEndpoint"),
			kube.SecretType("features.criticalstack.com/signing-key"),
			kube.DefaultServiceAccounts, kube.ServiceAccountTokens, kube.HelmReleases,
			kube.HasLabelValue("stackapps.criticalstack.com/export", "ignore"),
			kube.HasAnnotationValue("stackvalues.criticalstack.com/stackValue", "true"),
		),
	}

	stackvaluesFalseFilter = kube.HasAnnotationValue("stackvalues.criticalstack.com/stackValue", "false")
)

var needsStackValue = kube.Any(
	kube.HasAnnotationValue("stackvalues.criticalstack.com/stackValue", "true"),
	kube.ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		return u.GetAPIVersion() == "v1" && u.GetKind() == "Secret"
	}),
)

func createStackApp(x *Controller, cli client.Client, c echo.Context) (Map, error) {
	var tmp struct {
		Name        string                   `json:"name"`
		Version     string                   `json:"version"`
		Labels      map[string]string        `json:"labels"`
		Annotations map[string]string        `json:"annotations"`
		Resources   []map[string]interface{} `json:"resources"`
		SigningKeys []string                 `json:"signingKeys"`
	}

	// TODO(ktravis): want this to instead just be c.Bind when the ui is updated
	if err := c.Bind(&tmp); err != nil {
		return nil, newStatusError(http.StatusBadRequest, errors.Wrap(err, "invalid resource data"))
	}

	if tmp.Name == "" {
		return nil, newStatusError(http.StatusBadRequest, errors.Errorf("name is required"))
	}
	n, err := strconv.Atoi(tmp.Version)
	if err != nil {
		return nil, newStatusError(http.StatusBadRequest, errors.Errorf("version should be an integer"))
	}

	//  TODO(ktravis): nicer way to do this?
	var list []unstructured.Unstructured
	for _, o := range tmp.Resources {
		list = append(list, unstructured.Unstructured{Object: o})
	}

	ctx := c.Request().Context()
	ns, err := parseNamespace(c)
	if err != nil {
		return nil, err
	}

	u := User(c)
	if len(tmp.SigningKeys) == 0 {
		keyName := fmt.Sprintf("sk-%s", u.Name)
		if _, err := stackapps.GetSigningKey(ctx, cli, keyName); err != nil {
			if !apierrors.IsNotFound(err) {
				return nil, errors.Wrap(err, "failed to retrieve signing key")
			}
			if _, _, err := createUserKeyPair(ctx, cli, u); err != nil {
				return nil, errors.Wrap(err, "failed to create signing key")
			}
		}
		tmp.SigningKeys = []string{keyName}
	}

	// TODO(ktravis): all of this will need to change
	var conf featuresv1alpha1.StackAppConfig
	conf.SetName(tmp.Name)
	if _, err := controllerutil.CreateOrUpdate(ctx, cli, &conf, func() error {
		conf.Spec.AppNamespace = ns
		// conf.Spec.Signing.Optional = true
		conf.Spec.StackValues.Enabled = true
		conf.Spec.AppRevisions.DevMode = true
		return nil
	}); err != nil {
		return nil, errors.Wrap(err, "failed to ensure StackAppConfig")
	}

	//if tmp.SigningKeys == nil {
	//tmp.SigningKeys = append(tmp.SigningKeys, User(c).FormatEmail)
	//}
	var sa featuresv1alpha1.StackApp
	sa.Name = tmp.Name
	sa.Spec.MajorVersion = uint64(n)
	sa.Spec.AppRevision.Revision = 1
	sa.SetLabels(tmp.Labels)
	sa.SetAnnotations(tmp.Annotations)

	for i, o := range list {
		if !needsStackValue.Match(&o) {
			continue
		}
		sv, err := stackapps.BuildStackValueFromObject(&o)
		if err != nil {
			return nil, newStatusError(http.StatusBadRequest, errors.Wrap(err, "failed to create stackvalue"))
		}
		b, err := json.Marshal(sv)
		var u unstructured.Unstructured
		if err := json.Unmarshal(b, &u.Object); err != nil {
			return nil, newStatusError(http.StatusBadRequest, errors.Wrap(err, "failed to unmarshal created stackvalue"))
		}
		u.SetGroupVersionKind(featuresv1alpha1.GroupVersion.WithKind("StackValue"))
		list[i] = u
	}
	if err := stackapps.Create(ctx, cli, &sa, ns, list, tmp.SigningKeys); err != nil {
		return nil, newStatusError(http.StatusNotFound, errors.Wrap(err, "Could not create stackApp"))
	}
	return result(&sa), nil
}

func updateStackApp(x *Controller, cli client.Client, c echo.Context) (Map, error) {
	var tmp struct {
		Labels      map[string]string        `json:"labels"`
		Annotations map[string]string        `json:"annotations"`
		Resources   []map[string]interface{} `json:"resources"`
		SigningKeys []string                 `json:"signingKeys"`
	}

	// TODO(ktravis): want this to instead just be c.Bind when the ui is updated
	if err := c.Bind(&tmp); err != nil {
		return nil, newStatusError(http.StatusBadRequest, errors.Wrap(err, "invalid resource data"))
	}

	//  TODO(ktravis): nicer way to do this?
	var list []unstructured.Unstructured
	for _, o := range tmp.Resources {
		list = append(list, unstructured.Unstructured{Object: o})
	}

	ctx := c.Request().Context()
	ns, err := parseNamespace(c)
	if err != nil {
		return nil, err
	}

	u := User(c)
	if tmp.SigningKeys == nil {
		keyName := fmt.Sprintf("sk-%s", u.Name)
		if _, err := stackapps.GetSigningKey(ctx, cli, keyName); err != nil {
			if !apierrors.IsNotFound(err) {
				return nil, errors.Wrap(err, "failed to retrieve signing key")
			}
			if _, _, err := createUserKeyPair(ctx, cli, u); err != nil {
				return nil, errors.Wrap(err, "failed to create signing key")
			}
		}
		tmp.SigningKeys = []string{keyName}
	}

	for i, o := range list {
		if !needsStackValue.Match(&o) {
			continue
		}
		sv, err := stackapps.BuildStackValueFromObject(&o)
		if err != nil {
			return nil, newStatusError(http.StatusBadRequest, errors.Wrap(err, "failed to create stackvalue"))
		}
		b, err := json.Marshal(sv)
		var u unstructured.Unstructured
		if err := json.Unmarshal(b, &u.Object); err != nil {
			return nil, newStatusError(http.StatusBadRequest, errors.Wrap(err, "failed to unmarshal created stackvalue"))
		}
		u.SetGroupVersionKind(featuresv1alpha1.GroupVersion.WithKind("StackValue"))
		list[i] = u
	}

	var sa featuresv1alpha1.StackApp
	key := client.ObjectKey{Name: c.Param("name"), Namespace: ns}
	if err := cli.Get(ctx, key, &sa); err != nil {
		return nil, err
	}
	sa.SetLabels(tmp.Labels)
	sa.SetAnnotations(tmp.Annotations)
	if err := stackapps.Update(ctx, cli, &sa, ns, list, tmp.SigningKeys); err != nil {
		return nil, newStatusError(http.StatusNotFound, errors.Wrap(err, "Could not create stackApp"))
	}
	return result(&sa), nil
}

func (x *Controller) CreateStackAppFromNamespace(c echo.Context) error {
	var tmp struct {
		AppName string `json:"appname"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	ns, err := parseNamespace(c)
	if err != nil {
		return err
	}

	keyName := fmt.Sprintf("sk-%s", User(c).Name)
	ctx := c.Request().Context()
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}

	if _, err := stackapps.GetSigningKey(ctx, cli, keyName); err != nil {
		if !apierrors.IsNotFound(err) {
			return errors.Wrap(err, "failed to retrieve signing key")
		}
		if _, _, err := stackapps.CreateKeyPair(ctx, cli, keyName); err != nil {
			return errors.Wrap(err, "failed to create key pair")
		}
	}

	// create StackValues first so that when we list resources, the StackValues will be included
	if err := stackapps.CreateStackValues(ctx, cli, ns); err != nil {
		return errors.Wrap(err, "failed to create stack values")
	}

	res, err := x.ServerResources(ctx)
	if err != nil {
		return newError(err)
	}
	objects, err := kube.ListResources(cli, kube.ListOptions{
		Resources: kube.PreferredResources(res),
		ClientOptions: &client.ListOptions{

			Namespace: ns,
		},
		ResourceFilters: kube.ResourceFilters{
			kube.Namespaced,
			kube.WithVerbs("create", "list"),
			kube.DefaultIgnoreResources(),
			kube.Ignore(
				"endpoints", "events", "secrets",
				"podmetrics.metrics.k8s.io",
				schema.GroupResource{Group: featuresv1alpha1.GroupName, Resource: "stackapps"}.String(),
				schema.GroupResource{Group: featuresv1alpha1.GroupName, Resource: "verificationkeys"}.String(),
			),
		},
		ObjectFilters: kube.ObjectFilters{
			kube.Negate(stackappObjectFilter...),
		},
	})
	if err != nil {
		return errors.Wrap(err, "failed to retrieve server resources")
	}

	var sa featuresv1alpha1.StackApp
	sa.Name = tmp.AppName + "-v1"
	sa.Namespace = ns
	if err := stackapps.Create(ctx, cli, &sa, ns, objects.Items, []string{keyName}); err != nil {
		return newStatusError(http.StatusNotFound, errors.Wrap(err, "Could not create stackApp"))
	}
	return x.sendJSONSuccess(c, result(&sa))
}

func (x *Controller) ExportStackApp(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	manifests, err := stackapps.Export(c.Request().Context(), cli, c.Param("name"))
	if err != nil {
		return errors.Wrap(err, "failed to retrieve StackApp manifests")
	}
	return x.sendJSONSuccess(c, Map{
		"manifests": manifests,
	})
}

func createUserKeyPair(ctx context.Context, cli client.Client, u *v1alpha1.User) (*corev1.Secret, *featuresv1alpha1.VerificationKey, error) {
	keyName := fmt.Sprintf("sk-%s", u.Name)
	return stackapps.CreateKeyPair(ctx, cli, keyName, func(m *metav1.ObjectMeta) {
		m.Labels["created-by"] = safeEmail(u.Email)
		m.OwnerReferences = []metav1.OwnerReference{
			{
				APIVersion: v1alpha1.GroupVersion.String(),
				Kind:       "User",
				Name:       u.Name,
				UID:        u.UID,
			},
		}
	})
}

// TODO(ktravis): permissions for the uploaded key pairs are not handled appropriately yet - users will likely need admin perms to upload/create/use signing keys.

func (x *Controller) CreateKeyPair(c echo.Context) error {
	var tmp struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	sk, vk, err := stackapps.CreateKeyPair(c.Request().Context(), cli, tmp.Name, func(m *metav1.ObjectMeta) {
		m.Labels["created-by"] = safeEmail(User(c).Email)
	})
	if err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"verificationKey": vk,
		"signingKey":      sk,
	})
}

func (x *Controller) UploadSigningKey(c echo.Context) error {
	var tmp struct {
		Name string `json:"name"`
		Data string `json:"data"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	f, err := parseDataURL(tmp.Data)
	if err != nil {
		return newError(err)
	}
	b, _ := pem.Decode(f.data)
	if b == nil {
		return newError(errors.Errorf("failed decoding pem block"))
	}
	if b.Type != "RSA PRIVATE KEY" {
		return newError(errors.Errorf("expected an RSA PRIVATE KEY, got %q", b.Type))
	}
	key, err := x509.ParsePKCS1PrivateKey(b.Bytes)
	if err != nil {
		return newError(err)
	}
	sk := stackapps.SigningKey(tmp.Name, key)
	sk.Labels["created-by"] = safeEmail(User(c).Email)
	pub, err := stackapps.EncodePublicKeyBytes(&key.PublicKey)
	if err != nil {
		return newError(err)
	}
	vk := stackapps.VerificationKey(tmp.Name, pub)
	vk.Labels["created-by"] = safeEmail(User(c).Email)
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	if err := cli.Create(c.Request().Context(), sk); err != nil {
		return newError(err)
	}
	if err := cli.Create(c.Request().Context(), vk); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{
		"verificationKey": vk,
		"signingKey":      sk,
	})
}
