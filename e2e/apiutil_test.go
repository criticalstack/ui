//nolint:unused
package e2e_test

import (
	"context"
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/google/go-cmp/cmp"
	"github.com/pkg/errors"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var (
	defaultEmail    = "dev@criticalstack.com"
	defaultPassword = "admin"
)

func errStr(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func cmpError(a, b error) string {
	return cmp.Diff(errStr(a), errStr(errors.Cause(b)))
}

func randString(n int) string {
	const alphanum = "abcdefghijklmnopqrstuvwxyz1234567890"
	b := make([]byte, n)
	for i := range b {
		b[i] = alphanum[rand.Intn(len(alphanum))]
	}
	return string(b)
}

func login(email, password string) (*session, error) {
	s := defaultSession()
	s.reset()

	if err := s.setCSRFCookie(); err != nil {
		return nil, errors.Wrap(err, "failed to set csrf cookie")
	}

	resp, err := s.do(withJSON(s.post("/authorize"), V{"email": email, "password": password}))
	if err != nil {
		return nil, errors.Wrap(err, "unable to login")
	}
	if resp.Status != 200 || resp.Ctx.Error != "" {
		return nil, errors.Wrapf(errors.Errorf(resp.Ctx.Error), "JSON response error (%d)", resp.Status)
	}
	s.token = resp.Ctx.Token
	if err := resp.Result(&s.user); err != nil {
		return nil, errors.Wrapf(err, "JSON response error (%d)", resp.Status)
	}
	if s.user.Email != email {
		return nil, errors.Errorf("returned user from login %q had non-matching email %q", email, s.user.Email)
	}
	return s, nil
}

func wrapNewUser(u *v1alpha1.UserTemplate, password, clusterRole string) interface{} {
	return struct {
		*v1alpha1.UserTemplate
		Password    string `json:"password"`
		RoleID      string `json:"roleID"`
		ClusterWide bool   `json:"clusterWide"`
	}{u, password, clusterRole, u.DefaultNamespace == ""}
}

func (s *session) createUser(u *v1alpha1.User, password, clusterRole string) (*v1alpha1.UserRequest, error) {
	var result v1alpha1.UserRequest
	if err := s.doResult(withJSON(s.post("/api/v1/users"), wrapNewUser(&u.UserTemplate, password, clusterRole)), &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *session) deleteUser(ur *v1alpha1.UserRequest) error {
	_, err := s.do(s.delete("/api/v1/resources/userrequests.criticalstack.com/%s", ur.Name))
	return err
}

func (s *session) createNamespace(name string) (*corev1.Namespace, error) {
	var u unstructured.Unstructured
	u.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "Namespace"})
	u.SetName(name)
	var ns corev1.Namespace
	if err := s.doResult(withJSON(s.post("/api/v1/resources/namespaces"), &u), &ns); err != nil {
		return nil, err
	}
	return &ns, nil
}

func (s *session) deleteNamespace(ns string) error {
	_, err := s.do(s.delete("/api/v1/resources/namespaces/%s", ns))
	return err
}

func (s *session) listDeployments(ns string) ([]appsv1.Deployment, error) {
	if ns == "" {
		ns = s.user.DefaultNamespace
	}
	var tmp []appsv1.Deployment
	if err := s.doResult(s.get("/api/v1/resources/deployments?namespace=%s", ns), &tmp); err != nil {
		return nil, err
	}
	return tmp, nil
}

func newUserWithNamespace() *v1alpha1.User {
	return &v1alpha1.User{
		UserTemplate: v1alpha1.UserTemplate{
			DefaultNamespace: randString(10),
		},
	}
}

func tempUserSession(t *testing.T, as *session, u *v1alpha1.User, password, clusterRole string) (*session, func()) {
	t.Helper()
	if u.Name == "" {
		u.Name = "Temp Temperson"
	}
	u.Active = true
	if u.Email == "" {
		u.Email = fmt.Sprintf("%s@%s.com", randString(10), randString(10))
	}
	if password == "" {
		password = randString(10)
	}
	if u.DefaultNamespace != "" {
		if _, err := as.createNamespace(u.DefaultNamespace); err != nil {
			t.Fatalf("failed to create temporary namespace: %v", err)
		}
	}
	ur, err := as.createUser(u, password, clusterRole)
	if err != nil {
		t.Fatalf("failed to create temporary user: %v", err)
	}

	s, err := login(ur.Spec.Email, password)
	if err != nil {
		t.Fatal(err)
	}
	return s, func() {
		if err := as.deleteUser(ur); err != nil {
			t.Errorf("could not delete temp user %q: %v", u.Email, err)
		}
		if u.DefaultNamespace != "" {
			if err := as.deleteNamespace(u.DefaultNamespace); err != nil {
				t.Errorf("could not delete temp user namespace %q: %v", u.DefaultNamespace, err)
			}
		}
	}
}

type Label struct {
	Key, Value string
}

func L(k, v string) Label {
	return Label{Key: k, Value: v}
}

func (s *session) waitForPodsReady(ctx context.Context, ns string, labels ...Label) ([]corev1.Pod, error) {
	var pods []corev1.Pod
	lastStatus := "pod not found"
L:
	for {
		if err := ctx.Err(); err != nil {
			return nil, errors.Errorf("pods did not become ready (%v), last status: %s", err, lastStatus)
		}
		if err := s.doResult(s.get("/api/v1/resources/pods?namespace=%s", ns), &pods); err != nil {
			return nil, err
		}
		matched := make([]corev1.Pod, 0)
		for _, p := range pods {
			for _, l := range labels {
				v, ok := p.Labels[l.Key]
				if !ok || (l.Value != "" && l.Value != v) {
					continue
				}
				matched = append(matched, p)
			}
			for _, p := range matched {
				if p.Status.Phase != corev1.PodRunning {
					lastStatus = fmt.Sprintf("%+v", p.Status)
					time.Sleep(100 * time.Millisecond)
					continue L
				}
			}
		}
		if len(matched) > 0 {
			return matched, nil
		}
		time.Sleep(100 * time.Millisecond)
	}
}
