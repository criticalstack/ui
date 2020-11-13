package rbac

import (
	"context"
	"strings"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// TODO(ktravis): audit where these are applied and if it is duplicated effort

var DefaultGroups = []string{
	"system:authenticated",
}

type Bindings struct {
	Roles        []rbacv1.RoleBinding
	ClusterRoles []rbacv1.ClusterRoleBinding
}

func (b Bindings) RoleRefs() []NamespacedRoleRef {
	refs := make([]NamespacedRoleRef, 0)
	for _, rb := range b.Roles {
		refs = append(refs, NamespacedRoleRef{
			RoleRef:   rb.RoleRef,
			Namespace: rb.Namespace,
		})
	}
	for _, crb := range b.ClusterRoles {
		refs = append(refs, NamespacedRoleRef{
			RoleRef:              crb.RoleRef,
			Namespace:            crb.Namespace,
			IsClusterRoleBinding: true,
		})
	}
	return refs
}

type NamespacedRoleRef struct {
	rbacv1.RoleRef
	Namespace            string `json:"namespace,omitempty"`
	IsClusterRoleBinding bool   `json:"isClusterRoleBinding"`
}

type SubjectRoles struct {
	rbacv1.Subject
	RoleRefs []NamespacedRoleRef
}

func (b Bindings) Subjects() []*SubjectRoles {
	type key struct {
		Kind string
		Name string
	}
	m := make(map[key]*SubjectRoles)
	for _, rb := range b.Roles {
		for _, sub := range rb.Subjects {
			k := key{sub.Kind, sub.Name}
			if _, ok := m[k]; !ok {
				m[k] = &SubjectRoles{
					Subject:  sub,
					RoleRefs: make([]NamespacedRoleRef, 0),
				}
			}
			m[k].RoleRefs = append(m[k].RoleRefs, NamespacedRoleRef{
				RoleRef:              rb.RoleRef,
				Namespace:            rb.Namespace,
				IsClusterRoleBinding: false,
			})
		}
	}
	for _, crb := range b.ClusterRoles {
		for _, sub := range crb.Subjects {
			k := key{sub.Kind, sub.Name}
			if _, ok := m[k]; !ok {
				m[k] = &SubjectRoles{
					Subject:  sub,
					RoleRefs: make([]NamespacedRoleRef, 0),
				}
			}
			m[k].RoleRefs = append(m[k].RoleRefs, NamespacedRoleRef{
				RoleRef:              crb.RoleRef,
				IsClusterRoleBinding: true,
			})
		}
	}
	subs := make([]*SubjectRoles, 0)
	for _, sub := range m {
		subs = append(subs, sub)
	}
	return subs
}

func SubjectNamespaceMatches(s rbacv1.Subject, ns string) bool {
	switch s.Kind {
	// non-namespaced
	case rbacv1.UserKind, rbacv1.GroupKind:
		return true
	default:
	}
	return s.Namespace == "" || ns == "" || s.Namespace == ns
}

func SubjectsMatch(match, s rbacv1.Subject) bool {
	return s.Kind == match.Kind && s.Name == match.Name && SubjectNamespaceMatches(s, match.Namespace)
}

func AnySubjectsMatch(match rbacv1.Subject, subs ...rbacv1.Subject) bool {
	for _, sub := range subs {
		if SubjectsMatch(match, sub) {
			return true
		}
	}
	return false
}

func SubjectsMatchingNamespace(subs []rbacv1.Subject, ns string) []rbacv1.Subject {
	matches := make([]rbacv1.Subject, 0)
	for _, sub := range subs {
		if SubjectNamespaceMatches(sub, ns) {
			matches = append(matches, sub)
		}
	}
	return matches
}

func AnyMatchSubjectNamespace(ns string, subs ...rbacv1.Subject) bool {
	for _, sub := range subs {
		if SubjectNamespaceMatches(sub, ns) {
			return true
		}
	}
	return false
}

func (b Bindings) ForUser(u *v1alpha1.User) Bindings {
	subs := []rbacv1.Subject{
		{Kind: rbacv1.UserKind, Name: u.Email},
	}
	for _, g := range u.Groups {
		subs = append(subs, rbacv1.Subject{
			Kind: rbacv1.GroupKind,
			Name: g,
		})
	}
	return b.ForSubjects(subs...)
}

//func BoundRoles(b Bindings, kind, name, ns string) []rbacv1.RoleRef {
//return b.ForSubject(rbacv1.Subject{Kind: kind, Name: name, Namespace: ns}).RoleRefs()
//}

func (b Bindings) ForSubjects(subs ...rbacv1.Subject) Bindings {
	var result Bindings
	for _, rb := range b.Roles {
		for _, sub := range subs {
			if AnySubjectsMatch(sub, rb.Subjects...) {
				result.Roles = append(result.Roles, rb)
				break
			}
		}
	}
	for _, crb := range b.ClusterRoles {
		for _, sub := range subs {
			if AnySubjectsMatch(sub, crb.Subjects...) {
				result.ClusterRoles = append(result.ClusterRoles, crb)
				break
			}
		}
	}
	return result
}

func (b Bindings) ForSubject(sub rbacv1.Subject) Bindings {
	var result Bindings
	for _, rb := range b.Roles {
		if AnySubjectsMatch(sub, rb.Subjects...) {
			result.Roles = append(result.Roles, rb)
		}
	}
	for _, crb := range b.ClusterRoles {
		if AnySubjectsMatch(sub, crb.Subjects...) {
			result.ClusterRoles = append(result.ClusterRoles, crb)
		}
	}
	return result
}

func (b Bindings) ForNamespace(ns string) Bindings {
	var result Bindings
	for _, rb := range b.Roles {
		if ns != "" && rb.Namespace != ns {
			continue
		}
		if matches := SubjectsMatchingNamespace(rb.Subjects, ns); len(matches) > 0 {
			cp := rb.DeepCopy()
			cp.Subjects = matches
			result.Roles = append(result.Roles, *cp)
		}
	}
	for _, crb := range b.ClusterRoles {
		if matches := SubjectsMatchingNamespace(crb.Subjects, ns); len(matches) > 0 {
			cp := crb.DeepCopy()
			cp.Subjects = matches
			result.ClusterRoles = append(result.ClusterRoles, *cp)
		}
	}
	return result
}

func contains(ss []string, match string) bool {
	for _, s := range ss {
		if s == match {
			return true
		}
	}
	return false
}

func containsAny(ss []string, matches ...string) bool {
	for _, s := range ss {
		for _, m := range matches {
			if m == s {
				return true
			}
		}
	}
	return false
}

func containsAll(ss []string, matches ...string) bool {
	for _, m := range matches {
		if !contains(ss, m) {
			return false
		}
	}
	return true
}

func RulesGrantClusterRBAC(rules []rbacv1.PolicyRule) bool {
	for _, rule := range rules {
		if !containsAny(rule.APIGroups, rbacv1.APIGroupAll, "rbac.k8s.io") {
			continue
		}
		if len(rule.ResourceNames) > 0 && !contains(rule.ResourceNames, rbacv1.ResourceAll) {
			// NOTE(ktravis): right now we are considering a restricted resource list to be constrained access
			continue
		}
		if len(rule.Resources) > 0 && !contains(rule.Resources, rbacv1.ResourceAll) && !containsAll(rule.Resources, "RoleBinding", "ClusterRoleBinding") {
			// resources are restricted but do not contain RB or CRB
			continue
		}
		if len(rule.Verbs) > 0 && !contains(rule.Verbs, rbacv1.VerbAll) && !containsAll(rule.Verbs, "CREATE", "UPDATE") {
			continue
		}
		return true
	}
	return false
}

func RulesGrantRBAC(rules []rbacv1.PolicyRule) bool {
	for _, rule := range rules {
		if !containsAny(rule.APIGroups, rbacv1.APIGroupAll, "rbac.k8s.io") {
			continue
		}
		if len(rule.ResourceNames) > 0 && !contains(rule.ResourceNames, rbacv1.ResourceAll) {
			// NOTE(ktravis): right now we are considering a restricted resource list to be constrained access
			continue
		}
		if len(rule.Resources) > 0 && !contains(rule.Resources, rbacv1.ResourceAll) && !containsAll(rule.Resources, "RoleBinding") {
			// resources are restricted but do not contain RB
			continue
		}
		if len(rule.Verbs) > 0 && !contains(rule.Verbs, rbacv1.VerbAll) && !containsAll(rule.Verbs, "CREATE", "UPDATE") {
			continue
		}
		return true
	}
	return false
}

func dedupeSubjects(subs []rbacv1.Subject) (result []rbacv1.Subject) {
	type key struct {
		Name, Kind, NS string
	}
	m := make(map[key]rbacv1.Subject)
	for _, s := range subs {
		k := key{Name: s.Name, Kind: s.Kind}
		// namespace should only be considered for service accounts
		if s.Kind == rbacv1.ServiceAccountKind {
			k.NS = s.Namespace
		}
		if _, ok := m[k]; ok {
			continue
		}
		result = append(result, s)
		m[k] = s
	}
	return result
}

func mergeSubjects(a, b []rbacv1.Subject) (result []rbacv1.Subject) {
	return dedupeSubjects(append(a, b...))
}

func UserSubject(name string) rbacv1.Subject {
	return rbacv1.Subject{
		Kind: rbacv1.UserKind,
		Name: name,
	}
}

func GroupSubject(name string) rbacv1.Subject {
	return rbacv1.Subject{
		Kind: rbacv1.GroupKind,
		Name: name,
	}
}

func ClusterRoleRef(name string) rbacv1.RoleRef {
	return rbacv1.RoleRef{
		APIGroup: rbacv1.GroupName,
		Kind:     "ClusterRole",
		Name:     name,
	}
}

func RoleRef(name string) rbacv1.RoleRef {
	return rbacv1.RoleRef{
		APIGroup: rbacv1.GroupName,
		Kind:     "Role",
		Name:     name,
	}
}

func AddClusterRoleBindingSubjects(ctx context.Context, cli client.Client, name string, ref rbacv1.RoleRef, owners []metav1.OwnerReference, subs ...rbacv1.Subject) (*rbacv1.ClusterRoleBinding, error) {
	crb := rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:            name,
			OwnerReferences: owners,
		},
		Subjects: dedupeSubjects(subs),
		RoleRef:  ref,
	}
	existing := crb.DeepCopy()
	if err := cli.Get(ctx, client.ObjectKey{Name: name}, existing); err == nil {
		// add existing subjects if they aren't the same as the one we're creating
		crb.Subjects = mergeSubjects(crb.Subjects, existing.Subjects)
		existing.Subjects = crb.Subjects

		if err := cli.Update(ctx, existing); err != nil && !strings.Contains(err.Error(), "cannot change roleRef") {
			// need to refresh the cluster role binding, warn and continue
			log.Warn("existing role referred to in cluster role binding was incompatible with current changes. Deleting existing cluster role binding and re-creating")
		} else {
			// normal success or failure case
			return existing, err
		}
		if err := cli.Delete(ctx, existing); err != nil {
			return nil, err
		}
		// re-create below
	} else if client.IgnoreNotFound(err) != nil {
		return nil, err
	}
	if err := cli.Create(ctx, &crb); err != nil {
		return nil, err
	}
	return &crb, nil
}

func AddRoleBindingSubjects(ctx context.Context, cli client.Client, name, ns string, ref rbacv1.RoleRef, owners []metav1.OwnerReference, subs ...rbacv1.Subject) (*rbacv1.RoleBinding, error) {
	rb := rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:            name,
			Namespace:       ns,
			OwnerReferences: owners,
		},
		Subjects: dedupeSubjects(subs),
		RoleRef:  ref,
	}
	existing := rb.DeepCopy()
	if err := cli.Get(ctx, client.ObjectKey{Name: name, Namespace: ns}, existing); err == nil {
		// add existing subjects if they aren't the same as the one we're creating
		rb.Subjects = mergeSubjects(rb.Subjects, existing.Subjects)
		existing.Subjects = rb.Subjects

		if err := cli.Update(ctx, existing); err != nil && !strings.Contains(err.Error(), "cannot change roleRef") {
			// need to refresh the role binding, warn and continue
			log.Warn("existing role referred to in role binding was incompatible with current changes. Deleting existing role binding and re-creating")
		} else {
			// normal success or failure case
			return existing, err
		}
		if err := cli.Delete(ctx, existing); err != nil {
			return nil, err
		}
		// re-create below
	} else if client.IgnoreNotFound(err) != nil {
		return nil, err
	}
	if err := cli.Create(ctx, &rb); err != nil {
		return nil, err
	}
	return &rb, nil
}
