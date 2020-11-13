package app

import (
	"sort"
	"testing"

	"github.com/google/go-cmp/cmp"
	authorizationv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestNamespacesWithAccess(t *testing.T) {
	serverResources := []*metav1.APIResourceList{
		{
			GroupVersion: "v1",
			APIResources: []metav1.APIResource{
				{
					Name:       "namespaces",
					Namespaced: false,
					Kind:       "Namespace",
				},
				{
					Name:       "nodes",
					Namespaced: false,
					Kind:       "Node",
				},
				{
					Name:       "pods",
					Namespaced: true,
					Kind:       "Pod",
				},
			},
		},
		{
			GroupVersion: "rbac.authorization.k8s.io/v1",
			APIResources: []metav1.APIResource{
				{
					Name:       "roles",
					Namespaced: true,
					Kind:       "Role",
				},
				{
					Name:       "rolebindings",
					Namespaced: true,
					Kind:       "RoleBinding",
				},
				{
					Name:       "clusterroles",
					Namespaced: false,
					Kind:       "ClusterRole",
				},
				{
					Name:       "clusterrolebindings",
					Namespaced: false,
					Kind:       "ClusterRoleBinding",
				},
			},
		},
	}

	allRules := map[string][]authorizationv1.ResourceRule{
		"development": {
			{
				APIGroups: []string{"authorization.k8s.io"},
				Resources: []string{
					"selfsubjectaccessreviews",
					"selfsubjectrulesreviews",
				},
				Verbs: []string{"create"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"pods"},
				Verbs:     []string{"create", "delete"},
			},
			{
				APIGroups: []string{"rbac.authorization.k8s.io"},
				Resources: []string{"rolebindings"},
				Verbs:     []string{"*"},
			},
		},
		"staging": {
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"get", "list"},
			},
		},
		"production": {
			{
				APIGroups: []string{"authorization.k8s.io"},
				Resources: []string{
					"selfsubjectaccessreviews",
					"selfsubjectrulesreviews",
				},
				Verbs: []string{"create"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"nodes"},
				Verbs:     []string{"get", "list"},
			},
		},
		"other": {
			{
				APIGroups: []string{"", "applications"},
				Resources: []string{"*"},
				Verbs:     []string{"get", "list"},
			},
		},
	}
	expected := []string{
		"development",
		"staging",
		"other",
	}
	sort.Strings(expected)

	got := namespacesWithAccess(serverResources, allRules)
	sort.Strings(got)
	if d := cmp.Diff(expected, got); d != "" {
		t.Fatalf("namespace access did not match: %v", d)
	}
}
