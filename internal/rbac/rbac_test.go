package rbac

import (
	"testing"

	"github.com/google/go-cmp/cmp"
	rbacv1 "k8s.io/api/rbac/v1"
)

func TestUserForSubjects(t *testing.T) {
	b := Bindings{
		Roles: []rbacv1.RoleBinding{
			{RoleRef: rbacv1.RoleRef{Name: "rb-no1"}},
			{
				RoleRef: rbacv1.RoleRef{Name: "rb-no2"},
				Subjects: []rbacv1.Subject{
					UserSubject("notme"),
					GroupSubject("notmygroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "rb-no2"},
				Subjects: []rbacv1.Subject{
					UserSubject("notme"),
					GroupSubject("notmygroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "rb-yes1"},
				Subjects: []rbacv1.Subject{
					GroupSubject("mygroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "rb-yes2"},
				Subjects: []rbacv1.Subject{
					UserSubject("me"),
					GroupSubject("notmygroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "rb-yes3"},
				Subjects: []rbacv1.Subject{
					UserSubject("notme"),
					GroupSubject("notmygroup"),
					GroupSubject("anothergroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "rb-yes4"},
				Subjects: []rbacv1.Subject{
					UserSubject("me"),
				},
			},
		},
		ClusterRoles: []rbacv1.ClusterRoleBinding{
			{RoleRef: rbacv1.RoleRef{Name: "crb-no1"}},
			{
				RoleRef: rbacv1.RoleRef{Name: "crb-no2"},
				Subjects: []rbacv1.Subject{
					UserSubject("notme"),
					GroupSubject("notmygroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "crb-yes1"},
				Subjects: []rbacv1.Subject{
					GroupSubject("mygroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "crb-yes2"},
				Subjects: []rbacv1.Subject{
					UserSubject("me"),
					GroupSubject("notmygroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "crb-yes3"},
				Subjects: []rbacv1.Subject{
					UserSubject("notme"),
					GroupSubject("notmygroup"),
					GroupSubject("anothergroup"),
				},
			},
			{
				RoleRef: rbacv1.RoleRef{Name: "crb-yes4"},
				Subjects: []rbacv1.Subject{
					UserSubject("me"),
				},
			},
		},
	}

	mySubjects := []rbacv1.Subject{
		UserSubject("me"),
		GroupSubject("mygroup"),
		GroupSubject("anothergroup"),
	}

	expected := []string{
		"rb-yes1", "rb-yes2", "rb-yes3", "rb-yes4",
		"crb-yes1", "crb-yes2", "crb-yes3", "crb-yes4",
	}

	got := make([]string, 0)
	for _, rr := range b.ForSubjects(mySubjects...).RoleRefs() {
		got = append(got, rr.RoleRef.Name)
	}
	if d := cmp.Diff(expected, got); d != "" {
		t.Fatalf("unexpected result roles: %v", d)
	}
}
