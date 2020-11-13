package app

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	"github.com/criticalstack/ui/internal/rbac"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	authorizationv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

// TODO(ktravis): access audit screen

//nolint:unparam
func (x *Controller) bindings(k kubernetes.Interface, ns string) (rbac.Bindings, error) {
	// TODO(ktravis): make sure this aligns with user permissions, despite being cached
	var b rbac.Bindings
	for _, crb := range x.informerCaches.clusterRoleBindings.GetStore().List() {
		b.ClusterRoles = append(b.ClusterRoles, *(crb.(*rbacv1.ClusterRoleBinding)))
	}

	for _, rb := range x.informerCaches.roleBindings.GetStore().List() {
		b.Roles = append(b.Roles, *(rb.(*rbacv1.RoleBinding)))
	}
	if ns != "" {
		b = b.ForNamespace(ns)
	}
	return b, nil
}

// return namespaces that contain permissions for at least one namespace-level resource
func namespacesWithAccess(serverResources []*metav1.APIResourceList, allRules map[string][]authorizationv1.ResourceRule) []string {
	// There is always at least one rule, which allows "create" on "selfsubjectaccessreviews"
	namespaced := make(map[string]bool)
	for _, resList := range serverResources {
		group := ""
		if gv := resList.GroupVersion; strings.Contains(gv, "/") {
			group = strings.Split(gv, "/")[0]
		}
		for _, res := range resList.APIResources {
			if !res.Namespaced {
				continue
			}
			g := res.Group
			if g == "" {
				g = group
			}
			namespaced[fmt.Sprintf("*/%s", res.Name)] = true
			if g != "" {
				namespaced[fmt.Sprintf("%s/%s", g, res.Name)] = true
			} else {
				namespaced[res.Name] = true
			}
		}
	}
	result := make([]string, 0)
	for ns, rules := range allRules {
	L:
		for _, rule := range rules {
			for _, ag := range rule.APIGroups {
				for _, r := range rule.Resources {
					rg := r
					if ag != "" {
						rg = ag + "/" + r
					}
					if rg == "*" || rg == "*/*" || namespaced[rg] {
						result = append(result, ns)
						break L
					}
				}
			}
		}
	}
	return result
}

func (x *Controller) ListUserNamespaces(ctx context.Context, k kubernetes.Interface) ([]corev1.Namespace, error) {
	_, resLists, err := x.ServerGroupsAndResources(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed listing api resources")
	}
	allRules := make(map[string][]authorizationv1.ResourceRule)
	z := make(map[string]corev1.Namespace)

	for _, n := range x.informerCaches.namespaces.GetStore().List() {
		ns := n.(*corev1.Namespace)
		rules, err := x.SelfSubjectRulesReview(k, ns.Name)
		if err != nil {
			log.Errorf("error performing self subject rules review: %v", err)
			continue
		}
		allRules[ns.Name] = rules
		z[ns.Name] = *ns
	}
	result := make([]corev1.Namespace, 0)
	for _, ns := range namespacesWithAccess(resLists, allRules) {
		result = append(result, z[ns])
	}
	return result, nil
}

func (x *Controller) CheckUserAccess(u *v1alpha1.User, ns, verb string, gvr schema.GroupResource) (bool, error) {
	sar := &authorizationv1.SubjectAccessReview{
		Spec: authorizationv1.SubjectAccessReviewSpec{
			User:   u.Email,
			Groups: u.Groups,
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Namespace: ns,
				Verb:      verb,
				Group:     gvr.Group,
				Resource:  gvr.Resource,
			},
		},
	}
	result, err := x.admin.AuthorizationV1().SubjectAccessReviews().Create(context.TODO(), sar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}
	if errMsg := result.Status.EvaluationError; errMsg != "" {
		return false, errors.New(errMsg)
	}
	return result.Status.Allowed, nil
}

func (x *Controller) canUserNS(user *v1alpha1.User, verb, res, ns string) (bool, error) {
	if user == nil || !user.Active {
		return false, errors.Errorf("Auth failure: no session")
	}
	b, err := x.CheckUserAccess(user, ns, verb, schema.ParseGroupResource(res))
	if err != nil {
		return false, errors.Errorf("Error checking user access: %v", err)
	}
	return b, nil
}

func (x *Controller) CanUserNS(verb, res, ns string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			u := User(c)
			if b, err := x.canUserNS(u, verb, res, ns); err != nil {
				log.Error(err.Error())
				return c.NoContent(http.StatusUnauthorized)
			} else if !b {
				log.Errorf("Auth failure: current user %q cannot %q resource %q", u.Name, verb, res)
				return c.NoContent(http.StatusForbidden)
			}
			return next(c)
		}
	}
}

func (x *Controller) CanUser(verb, res string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			u := User(c)
			if b, err := x.canUserNS(u, verb, res, c.Param("namespace")); err != nil {
				log.Error(err.Error())
				return c.NoContent(http.StatusUnauthorized)
			} else if !b {
				log.Errorf("Auth failure: current user %q cannot %q resource %q", u.Name, verb, res)
				return c.NoContent(http.StatusForbidden)
			}
			return next(c)
		}
	}
}

func (x *Controller) RBACCheckAccess(c echo.Context) error {
	verb := "list"
	if v := c.QueryParam("verb"); v != "" {
		verb = v
	}
	gr := c.QueryParam("res")
	if gr == "" {
		return newStatusError(http.StatusBadRequest, errors.New("must specify 'res'"))
	}

	b, err := x.CheckUserAccess(User(c), c.Param("namespace"), verb, schema.ParseGroupResource(gr))
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	return x.sendJSONSuccess(c, Map{"result": b})
}

func (x *Controller) CheckUserClusterAccess(u *v1alpha1.User, verb string, gvr schema.GroupResource) (bool, error) {
	return x.CheckUserAccess(u, "", verb, gvr)
}

func (x *Controller) SelfSubjectRulesReview(k kubernetes.Interface, ns string) ([]authorizationv1.ResourceRule, error) {
	srr := &authorizationv1.SelfSubjectRulesReview{
		Spec: authorizationv1.SelfSubjectRulesReviewSpec{
			Namespace: ns,
		},
	}
	srr.Namespace = ns
	result, err := k.AuthorizationV1().SelfSubjectRulesReviews().Create(context.TODO(), srr, metav1.CreateOptions{})
	if err != nil {
		return nil, err
	}
	// TODO(ktravis): if a role binding is invalid (missing role) this will
	// return an error in addition to rules. Need to check if Incomplete is
	// false in that case, and just log the error but return the actual results.
	if errMsg := result.Status.EvaluationError; result.Status.Incomplete && errMsg != "" {
		return nil, errors.New(errMsg)
	}
	return result.Status.ResourceRules, nil
}

func (x *Controller) roleRefRules(ns string, rr rbacv1.RoleRef) ([]rbacv1.PolicyRule, error) {
	cache := x.informerCaches.clusterRoles
	key := rr.Name
	if rr.Kind == "Role" {
		cache = x.informerCaches.roles
		key = fmt.Sprintf("%s/%s", ns, rr.Name)
	}
	z, ok, err := cache.GetStore().GetByKey(key)
	if err != nil {
		return nil, err
	}
	if !ok {
		// maybe we want to retry once here?
		return nil, errors.Errorf("role ref not found in cache: %+v", rr)
	}
	switch role := z.(type) {
	case *rbacv1.ClusterRole:
		return role.Rules, nil
	case *rbacv1.Role:
		return role.Rules, nil
	default:
		return nil, errors.Errorf("unrecognized type %T in cache for ref: %+v", z, rr)
	}
}

func (x *Controller) userNamespaceAccess(ctx context.Context, k kubernetes.Interface, u *v1alpha1.User, ns string) (map[string]map[string]bool, error) {
	type key struct {
		group    string
		resource string
		verb     string
	}
	type value struct {
		can                         bool
		grantedByClusterRoleBinding bool
	}

	_, resLists, err := x.ServerGroupsAndResources(ctx)
	if err != nil {
		return nil, newError(err)
	}
	allResources := make(map[schema.GroupResource]metav1.APIResource)
	for _, list := range resLists {
		gv, err := schema.ParseGroupVersion(list.GroupVersion)
		if err != nil {
			log.Errorf("error parsing api resource list: %v", err)
			continue
		}
		for _, res := range list.APIResources {
			if ns == "" && res.Namespaced {
				continue
			}
			allResources[schema.GroupResource{
				Group:    gv.Group,
				Resource: res.Name,
			}] = res
		}
	}

	b, err := x.bindings(k, ns)
	if err != nil {
		return nil, err
	}
	b = b.ForUser(u)
	perms := make(map[key]value)
	for _, ref := range b.RoleRefs() {
		rules, err := x.roleRefRules(ref.Namespace, ref.RoleRef)
		if err != nil {
			return nil, err
		}
	L:
		for _, r := range rules {
			// skip a rule that is scoped to specific names
			for _, n := range r.ResourceNames {
				if n != "" && n != "*" {
					continue L
				}
			}
			for _, g := range r.APIGroups {
				for _, res := range r.Resources {
					for _, v := range r.Verbs {
						perms[key{g, res, v}] = value{
							can:                         true,
							grantedByClusterRoleBinding: ref.IsClusterRoleBinding,
						}
					}
				}
			}
		}
	}

	try := func(g, r, v string, namespaced bool) bool {
		opts := []key{
			{"*", "*", "*"},
			{g, "*", "*"},
			{g, r, "*"},
			{g, r, v},
			{g, "*", v},
			{"*", r, "*"},
			{"*", r, v},
			{"*", "*", v},
		}
		for _, k := range opts {
			if v := perms[k]; v.can && (namespaced || v.grantedByClusterRoleBinding) {
				return true
			}
		}
		return false
	}
	final := make(map[string]map[string]bool)
	for gr, res := range allResources {
		g := gr.Group
		r := gr.Resource
		parentWildcard := ""
		// if we are trying to check a sub-resource, i.e. nodes/status, we must also check for wildcards of the form
		// nodes/*
		if parts := strings.Split(r, "/"); len(parts) > 1 {
			parentWildcard = parts[0] + "/*"
		}
		a := make(map[string]bool)
		for _, v := range res.Verbs {
			if _, ok := a[v]; ok {
				log.Debugf("duplicate resource verb (%q on %q) found in access list", v, gr.String())
				continue
			}
			// for subresources, check the constructed wildcard if an explicit match isn't found
			a[v] = try(g, r, v, res.Namespaced) || (parentWildcard != "" && try(g, parentWildcard, v, res.Namespaced))
		}
		final[gr.String()] = a
	}
	return final, nil
}

func (x *Controller) ListUserAccess(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	user, err := x.getUserByName(c.Request().Context(), cli, c.Param("name"))
	if err != nil {
		return newError(err)
	}
	final, err := x.userNamespaceAccess(c.Request().Context(), x.UserClient(c), user, c.Param("namespace"))
	if err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{"result": final})
}

func (x *Controller) ListMyAccess(c echo.Context) error {
	final, err := x.userNamespaceAccess(c.Request().Context(), x.UserClient(c), User(c), c.Param("namespace"))
	if err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{"result": final})
}

func (x *Controller) ListUsers(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	type userGroup struct {
		Kind  string
		Name  string
		User  *v1alpha1.User
		Roles []rbac.NamespacedRoleRef
		// known user count?
	}
	var users v1alpha1.UserList
	if err := cli.List(c.Request().Context(), &users); err != nil {
		return newError(err)
	}
	usersMap := make(map[string]*v1alpha1.User)
	for _, u := range users.Items {
		u := u
		usersMap[u.Email] = &u
	}

	ns := c.Param("namespace")
	b, err := x.bindings(x.UserClient(c), ns)
	if err != nil {
		return newError(err)
	}
	result := make([]userGroup, 0)
	subs := b.Subjects()
	bound := make(map[string]bool)
	for _, sub := range subs {
		switch sub.Kind {
		case rbacv1.UserKind, rbacv1.GroupKind:
		default:
			continue
		}
		bound[sub.Name] = true
		result = append(result, userGroup{
			Kind:  sub.Kind,
			Name:  sub.Name,
			Roles: sub.RoleRefs,
			User:  usersMap[sub.Name],
		})
	}
	// TODO(ktravis): refactor this to make it better/not stupid
	for name, u := range usersMap {
		for _, g := range u.Groups {
			if bound[g] {
				continue
			}

			// group had no roles/access
			result = append(result, userGroup{
				Kind:  rbacv1.GroupKind,
				Name:  g,
				Roles: make([]rbac.NamespacedRoleRef, 0),
			})
			bound[g] = true
		}
		if bound[name] {
			continue
		}

		// user had no roles/access
		result = append(result, userGroup{
			Kind:  rbacv1.UserKind,
			Name:  name,
			User:  u,
			Roles: make([]rbac.NamespacedRoleRef, 0),
		})
	}
	return x.sendJSONSuccess(c, Map{"result": result})
}

func (x *Controller) getUserRoles(k kubernetes.Interface, u *v1alpha1.User, ns string) (rbac.Bindings, error) {
	b, err := x.bindings(k, ns)
	if err != nil {
		return rbac.Bindings{}, err
	}
	return b.ForUser(u), nil
}

func (x *Controller) ListUserRoles(c echo.Context) error {
	cli, err := x.userClient(c)
	if err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	u, err := x.getUserByName(c.Request().Context(), cli, c.Param("name"))
	if err != nil {
		return newError(err)
	}
	refs, err := x.getUserRoles(x.UserClient(c), u, "") // c.Param("namespace"))
	if err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{"result": refs})
}

func (x *Controller) ListGroupRoles(c echo.Context) error {
	g := c.Param("name")
	b, err := x.bindings(x.UserClient(c), "") // c.Param("namespace"))
	if err != nil {
		return newError(err)
	}
	refs := b.ForSubject(rbacv1.Subject{Kind: "Group", Name: g}).RoleRefs()
	return x.sendJSONSuccess(c, Map{"result": refs})
}

type boundRole struct {
	rbacv1.RoleRef
	BindingName string
}

//nolint:unparam
func (x *Controller) getNamespaceUsers(k kubernetes.Interface, ns string) (map[rbacv1.Subject][]boundRole, error) {
	rbs := make([]rbacv1.RoleBinding, 0)
	for _, rb := range x.informerCaches.roleBindings.GetStore().List() {
		r := *(rb.(*rbacv1.RoleBinding))
		if r.Namespace == ns {
			rbs = append(rbs, r)
		}
	}

	crbs := make([]rbacv1.ClusterRoleBinding, 0)
	for _, crb := range x.informerCaches.clusterRoleBindings.GetStore().List() {
		crbs = append(crbs, *(crb.(*rbacv1.ClusterRoleBinding)))
	}

	// TODO(ktravis): move this stuff into rbac
	bindings := rbac.Bindings{Roles: rbs, ClusterRoles: crbs}.ForNamespace(ns)
	bySubject := make(map[rbacv1.Subject][]boundRole)
	for _, rb := range bindings.Roles {
		for _, sub := range rb.Subjects {
			bySubject[sub] = append(bySubject[sub], boundRole{
				RoleRef:     rb.RoleRef,
				BindingName: rb.Name,
			})
		}
	}
	for _, crb := range bindings.ClusterRoles {
		for _, sub := range crb.Subjects {
			bySubject[sub] = append(bySubject[sub], boundRole{
				RoleRef:     crb.RoleRef,
				BindingName: crb.Name,
			})
		}
	}
	return bySubject, nil
}

// NamespaceUsers returns a list of users that belong
// to a given namespace
func (x *Controller) NamespaceUsers(c echo.Context) error {
	bySubject, err := x.getNamespaceUsers(x.UserClient(c), c.Param("namespace"))
	if err != nil {
		return newError(err)
	}
	type tmp struct {
		Subject rbacv1.Subject
		Roles   []boundRole
	}
	result := make([]tmp, 0)
	for sub, roles := range bySubject {
		result = append(result, tmp{
			Subject: sub,
			Roles:   roles,
		})
	}
	return x.sendJSONSuccess(c, Map{"result": result})
}
