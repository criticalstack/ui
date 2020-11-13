package stackapps

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"strings"

	featuresv1alpha1 "github.com/criticalstack/stackapps/api/v1alpha1"
	"github.com/criticalstack/ui/internal/kube"
	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/yaml"
)

const (
	SigningKeySecretType = "features.criticalstack.com/signing-key"
	SystemNamespace      = "stackapps-system"
)

func ToManifests(objs ...unstructured.Unstructured) ([]byte, error) {
	var manifests [][]byte
	for _, obj := range objs {
		cleanObjectForManifest(&obj)
		m, err := yaml.Marshal(obj.Object)
		if err != nil {
			return nil, errors.Wrap(err, "unable to marshal stackapp resources to yaml")
		}
		manifests = append(manifests, m)
	}
	return bytes.Join(manifests, []byte("\n---\n")), nil
}

func cleanObjectForManifest(u *unstructured.Unstructured) {
	delete(u.Object, "status")
	unstructured.RemoveNestedField(u.Object, "spec", "clusterIP")
	u.SetResourceVersion("")
	u.SetSelfLink("")
	u.SetUID("")
	u.SetCreationTimestamp(metav1.Time{})
	u.SetOwnerReferences(nil)
	u.SetNamespace("")
	u.SetManagedFields(nil)
	anno := u.GetAnnotations()
	for k := range anno {
		if strings.HasPrefix(k, "stackapps.criticalstack.com/") {
			delete(anno, k)
		}
	}
	u.SetAnnotations(anno)
}

func Create(ctx context.Context, cli client.Client, sa *featuresv1alpha1.StackApp, ns string, objs []unstructured.Unstructured, signingKeys []string) error {
	sa.Spec.AppRevision.Revision = 1
	sa.Spec.AppRevision.Manifests = rName(sa.Name, sa.Spec.AppRevision.Revision)
	sa.Spec.AppRevision.Signatures = make(map[string][]byte)

	manifests, err := ToManifests(objs...)
	if err != nil {
		return errors.Wrap(err, "manifest conversion error")
	}
	for _, keyName := range signingKeys {
		key, err := GetSigningKey(ctx, cli, keyName)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve signing key")
		}
		s, err := SignManifests(key, manifests)
		if err != nil {
			return errors.Wrap(err, "stackapp signing failed")
		}
		sa.Spec.AppRevision.Signatures[keyName] = s
	}

	var cm corev1.ConfigMap
	cm.Name = sa.Spec.AppRevision.Manifests
	cm.Namespace = ns
	cm.Labels = map[string]string{
		"stackapps.criticalstack.com/export": "ignore",
	}
	cm.Data = map[string]string{
		"manifests": string(manifests),
	}
	if err := cli.Create(ctx, &cm); err != nil {
		return err
	}
	return cli.Create(ctx, sa)
}

func Update(ctx context.Context, cli client.Client, sa *featuresv1alpha1.StackApp, ns string, objs []unstructured.Unstructured, signingKeys []string) error {
	manifests, err := ToManifests(objs...)
	if err != nil {
		return errors.Wrap(err, "manifest conversion error")
	}

	sigs := make(map[string][]byte)
	for _, keyName := range signingKeys {
		key, err := GetSigningKey(ctx, cli, keyName)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve signing key")
		}
		s, err := SignManifests(key, manifests)
		if err != nil {
			return errors.Wrap(err, "stackapp signing failed")
		}
		sigs[keyName] = s
	}
	sa.Spec.AppRevision.Signatures = sigs
	sa.Spec.AppRevision.Revision++
	sa.Spec.AppRevision.Manifests = rName(sa.Name, sa.Spec.AppRevision.Revision)

	var cm corev1.ConfigMap
	cm.Name = sa.Spec.AppRevision.Manifests
	cm.Namespace = ns
	cm.Labels = map[string]string{
		"stackapps.criticalstack.com/export": "ignore",
	}
	cm.Data = map[string]string{
		"manifests": string(manifests),
	}
	if err := cli.Create(ctx, &cm); err != nil {
		return err
	}
	return cli.Update(ctx, sa)
}

func Export(ctx context.Context, cli client.Client, name string) ([]byte, error) {
	var sa unstructured.Unstructured
	sa.SetGroupVersionKind(featuresv1alpha1.GroupVersion.WithKind("StackApp"))
	if err := cli.Get(ctx, client.ObjectKey{Name: name}, &sa); err != nil {
		return nil, err
	}
	cmName, ok, err := unstructured.NestedString(sa.Object, "spec", "appRevision", "manifests")
	if err != nil {
		return nil, err
	} else if !ok {
		return nil, errors.Errorf("invalid StackApp spec: unable to read manifests")
	}
	var conf featuresv1alpha1.StackAppConfig
	if err := cli.Get(ctx, client.ObjectKey{Name: name}, &conf); err != nil {
		return nil, err
	}
	var cm unstructured.Unstructured
	cm.SetGroupVersionKind(corev1.SchemeGroupVersion.WithKind("ConfigMap"))
	cmKey := client.ObjectKey{Name: cmName, Namespace: conf.Spec.AppNamespace}
	if err := cli.Get(ctx, cmKey, &cm); err != nil {
		return nil, errors.Wrap(err, "failed retrieving manifests")
	}
	return ToManifests(cm, sa)
}

func rName(name string, revision uint64) string {
	return name + "-r" + fmt.Sprint(revision)
}

// Sign function takes PrivateKey and stackApp manifests and returns byte slice containing signature
func SignManifests(k *rsa.PrivateKey, manifests []byte) ([]byte, error) {
	// TODO(bstell): determine the best way to handle  padding signatures.
	hash := sha256.Sum256(manifests)
	return rsa.SignPKCS1v15(rand.Reader, k, crypto.SHA256, hash[:])
}

// VerifySignature Takes rsa.PublicKey (rsa.PrivateKey.PublicKey), a signature and the previously signed message returns
// error == nil if the signature is valid
func VerifySignature(k *rsa.PublicKey, s []byte, manifests []byte) error {
	hash := sha256.Sum256(manifests)
	return rsa.VerifyPKCS1v15(k, crypto.SHA256, hash[:], s)
}

func GetSigningKey(ctx context.Context, cli client.Client, name string) (*rsa.PrivateKey, error) {
	var s corev1.Secret
	if err := cli.Get(ctx, client.ObjectKey{
		Name:      name,
		Namespace: SystemNamespace,
	}, &s); err != nil {
		return nil, err
	}
	if s.Type != SigningKeySecretType {
		return nil, errors.Errorf("expected secret type %q, got %q", SigningKeySecretType, s.Type)
	}
	key, err := x509.ParsePKCS1PrivateKey(s.Data["privatekey"])
	if err != nil {
		return nil, err
	}
	return key, nil
}

func SigningKey(name string, key *rsa.PrivateKey) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: SystemNamespace,
			Labels: map[string]string{
				"stackapps.criticalstack.com/export": "ignore",
			},
		},
		Type: SigningKeySecretType,
		Data: map[string][]byte{"privatekey": x509.MarshalPKCS1PrivateKey(key)},
	}
}

func EncodePublicKeyBytes(key *rsa.PublicKey) ([]byte, error) {
	b := &pem.Block{
		Type:  "RSA PUBLIC KEY",
		Bytes: x509.MarshalPKCS1PublicKey(key),
	}
	buf := new(bytes.Buffer)
	if err := pem.Encode(buf, b); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func VerificationKey(name string, pub []byte) *featuresv1alpha1.VerificationKey {
	return &featuresv1alpha1.VerificationKey{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Labels: map[string]string{
				"stackapps.criticalstack.com/export": "ignore",
			},
		},
		Data: string(pub),
	}
}

func CreateSigningKey(ctx context.Context, cli client.Client, name string, mut ...func(*metav1.ObjectMeta)) (*corev1.Secret, *rsa.PublicKey, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}
	s := SigningKey(name, key)
	for _, fn := range mut {
		fn(&s.ObjectMeta)
	}
	if err := cli.Create(ctx, s); err != nil {
		return nil, nil, err
	}
	return s, &key.PublicKey, nil

}

func CreateKeyPair(ctx context.Context, cli client.Client, keyName string, mut ...func(*metav1.ObjectMeta)) (*corev1.Secret, *featuresv1alpha1.VerificationKey, error) {
	sk, pub, err := CreateSigningKey(ctx, cli, keyName, mut...)
	if err != nil {
		return nil, nil, err
	}
	b, err := EncodePublicKeyBytes(pub)
	if err != nil {
		return nil, nil, err
	}
	vkey := VerificationKey(keyName, b)
	for _, fn := range mut {
		fn(&vkey.ObjectMeta)
	}
	if err := cli.Create(ctx, vkey); err != nil {
		return nil, nil, err
	}
	return sk, vkey, nil
}

func CreateStackValues(ctx context.Context, cli client.Client, ns string) error {
	filter := kube.ObjectFilters{
		kube.Any(
			kube.HasAnnotationValue("stackvalues.criticalstack.com/stackValue", "true"),
			kube.ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
				return u.GetAPIVersion() == "v1" && u.GetKind() == "Secret"
			}),
		),
		kube.Negate(
			kube.DefaultServiceAccounts, kube.ServiceAccountTokens, kube.HelmReleases,
			kube.HasLabelValue("stackapps.criticalstack.com/export", "ignore"),
			kube.ControlledBy("criticalstack.com", "StackApp"),
		),
	}
	stackValuesKinds := []string{"Secret", "ConfigMap"}
	for _, kind := range stackValuesKinds {
		var res unstructured.UnstructuredList
		res.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: kind})
		opts := client.ListOptions{
			Namespace: ns,
		}
		if err := cli.List(ctx, &res, &opts); err != nil {
			return err
		}
		for _, u := range res.Items {
			if !filter.Match(&u) {
				continue
			}
			s, err := BuildStackValueFromObject(&u)
			if err != nil {
				return err
			}
			val := *s
			if _, err := controllerutil.CreateOrUpdate(ctx, cli, s, func() error {
				*s = val
				return nil
			}); err != nil {
				return err
			}
		}
	}
	return nil
}

func BuildStackValueFromObject(u *unstructured.Unstructured) (*featuresv1alpha1.StackValue, error) {
	var s featuresv1alpha1.StackValue
	s.SetName(u.GetName())
	s.SetNamespace(u.GetNamespace())

	a := u.GetAnnotations()
	if a == nil || a["stackvalues.criticalstack.com/sourceType"] == "" {
		return nil, fmt.Errorf("please add annotation stackvalues.criticalstack.com/sourceType to %s %q", u.GetKind(), u.GetName())
	}
	if a["stackvalues.criticalstack.com/path"] == "" {
		return nil, fmt.Errorf("please add annotation stackvalues.criticalstack.com/path to %s %q", u.GetKind(), u.GetName())
	}
	s.Spec = featuresv1alpha1.StackValueSpec{
		SourceType: featuresv1alpha1.StackValueSourceType(a["stackvalues.criticalstack.com/sourceType"]),
		ObjectType: u.GetKind(),
		Path:       a["stackvalues.criticalstack.com/path"],
	}
	return &s, nil
}
