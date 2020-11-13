package kube

import (
	"context"
	"strings"

	"github.com/pkg/errors"
	meta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type ListOptions struct {
	Resources       []*metav1.APIResourceList
	ClientOptions   *client.ListOptions
	ResourceFilters ResourceFilters
	ObjectFilters   ObjectFilters
}

type ResourceFilter interface {
	Match(string, metav1.APIResource) bool
}

// ResourceFilterFunc returns true if a resource passes the filter, or false if it should be skipped
type ResourceFilterFunc func(string, metav1.APIResource) bool

var _ ResourceFilter = (ResourceFilterFunc)(nil)

func (f ResourceFilterFunc) Match(group string, res metav1.APIResource) bool {
	// ResourceFilterFunc (f) returns true if a resource passes the filter, or false if it should be skipped
	return f(group, res)
}

type ResourceFilters []ResourceFilter

var _ ResourceFilter = (ResourceFilters)(nil)

func (l ResourceFilters) Match(group string, res metav1.APIResource) bool {
	// ResourceFilterFunc (f) returns true if a resource passes the filter, or false if it should be skipped
	for _, f := range l {
		if !f.Match(group, res) {
			return false
		}
	}
	return true
}

var (
	Namespaced = ResourceFilterFunc(func(group string, res metav1.APIResource) bool {
		return res.Namespaced
	})

	IgnoreResourceList = []string{
		"events",
		"authcodes.dex.coreos.com",
		"offlinesessionses.dex.coreos.com",
		"authrequests.dex.coreos.com",
		"refreshtokens.dex.coreos.com",
		"passwords.dex.coreos.com",
	}

	DefaultServiceAccounts = ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		return u.GetAPIVersion() == "v1" && u.GetKind() == "ServiceAccount" && u.GetName() == "default"
	})

	ServiceAccountTokens = SecretType("kubernetes.io/service-account-token")

	HelmReleases = Any(
		SecretType("helm.sh/release.v1"),
		ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
			return (strings.HasPrefix(u.GetAPIVersion(), "marketplace.criticalstack.com/") && u.GetKind() == "Release")
		}),
	)

	HasController = ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		return metav1.GetControllerOf(u) != nil
	})
)

func WithVerbs(vv ...string) ResourceFilter {
	return ResourceFilterFunc(func(group string, res metav1.APIResource) bool {
		for _, v := range vv {
			if !hasVerb(v, res.Verbs) {
				return false
			}
		}
		return true
	})
}

func Ignore(ignore ...string) ResourceFilter {
	ignoreMap := make(map[string]bool)
	for _, g := range ignore {
		ignoreMap[g] = true
	}
	return ResourceFilterFunc(func(group string, res metav1.APIResource) bool {
		name := res.Name
		if group != "" {
			name = res.Name + "." + group
		}
		return !ignoreMap[name]
	})
}

func DefaultIgnoreResources() ResourceFilter {
	return Ignore(IgnoreResourceList...)
}

func IgnoreGroups(ignore ...string) ResourceFilter {
	ignoreMap := make(map[string]bool)
	for _, g := range ignore {
		ignoreMap[g] = true
	}
	return ResourceFilterFunc(func(group string, res metav1.APIResource) bool {
		return !ignoreMap[group]
	})
}

// TODO(ktravis): duplicated
func hasVerb(verb string, verbs []string) bool {
	for _, v := range verbs {
		if strings.ToLower(v) == verb {
			return true
		}
	}
	return false
}

type ObjectFilter interface {
	Match(*unstructured.Unstructured) bool
}

// ObjectFilterFunc returns true if an item passes the filter, or false if it should be skipped
type ObjectFilterFunc func(*unstructured.Unstructured) bool

var _ ObjectFilter = (ObjectFilterFunc)(nil)

func (f ObjectFilterFunc) Match(u *unstructured.Unstructured) bool {
	// ObjectFilterFunc (f) returns true if an item passes the filter, or false if it should be skipped
	return f(u)
}

type ObjectFilters []ObjectFilter

var _ ObjectFilter = (ObjectFilters)(nil)

func (l ObjectFilters) Match(u *unstructured.Unstructured) bool {
	// ResourceFilterFunc (f) returns true if a resource passes the filter, or false if it should be skipped
	for _, f := range l {
		if !f.Match(u) {
			return false
		}
	}
	return true
}

func Any(ff ...ObjectFilter) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		for _, f := range ff {
			if f.Match(u) {
				return true
			}
		}
		return false
	})
}

func Negate(ff ...ObjectFilter) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		return !ObjectFilters(ff).Match(u)
	})
}

func HasLabel(key string) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		labels := u.GetLabels()
		if labels == nil {
			return false
		}
		_, ok := labels[key]
		return ok
	})
}

func HasLabelValue(key, val string) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		labels := u.GetLabels()
		return labels != nil && labels[key] == val
	})
}

func HasAnnotation(key string) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		anno := u.GetAnnotations()
		if anno == nil {
			return false
		}
		_, ok := anno[key]
		return ok
	})
}

func HasAnnotationValue(key, val string) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		anno := u.GetAnnotations()
		return anno != nil && anno[key] == val
	})
}

func ControlledBy(apiVersion, kind string) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		if owner := metav1.GetControllerOf(u); owner != nil {
			return owner.APIVersion == apiVersion && owner.Kind == kind
		}
		return false
	})
}

func ObjectIsType(apiVersion, kind string) ObjectFilter {
	return ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
		return (apiVersion == "*" || u.GetAPIVersion() == apiVersion) && (kind == "*" || u.GetKind() == kind)
	})
}

func SecretType(t string) ObjectFilter {
	return ObjectFilters{
		ObjectIsType("v1", "Secret"),
		ObjectFilterFunc(func(u *unstructured.Unstructured) bool {
			return u.Object["type"] == t
		}),
	}
}

func FilterObjects(objs []unstructured.Unstructured, ff ...ObjectFilter) []unstructured.Unstructured {
	result := make([]unstructured.Unstructured, 0)
	for _, o := range objs {
		if !ObjectFilters(ff).Match(&o) {
			continue
		}
		result = append(result, o)
	}
	return result
}

func SplitFilter(objs []unstructured.Unstructured, ff ...ObjectFilter) (match, rest []unstructured.Unstructured) {
	for _, o := range objs {
		if ObjectFilters(ff).Match(&o) {
			match = append(match, o)
		} else {
			rest = append(rest, o)
		}
	}
	return
}

func ListResources(cli client.Client, opts ListOptions) (*unstructured.UnstructuredList, error) {
	var result unstructured.UnstructuredList
	oi := make(map[types.UID]bool)
	for _, list := range opts.Resources {
		group := ""
		if strings.Contains(list.GroupVersion, "/") {
			group = strings.Split(list.GroupVersion, "/")[0]
		}
		for _, res := range list.APIResources {
			if !opts.ResourceFilters.Match(group, res) {
				continue
			}
			gvk := schema.FromAPIVersionAndKind(list.GroupVersion, res.Kind)
			var l unstructured.UnstructuredList
			l.SetGroupVersionKind(gvk)
			if err := cli.List(context.TODO(), &l, opts.ClientOptions); err != nil {
				if meta.IsNoMatchError(err) {
					continue
				}
				return nil, errors.Wrapf(err, "failed to list %v", gvk)
			}

			for _, u := range l.Items {
				if !opts.ObjectFilters.Match(&u) {
					continue
				}
				if uid := u.GetUID(); !oi[uid] {
					oi[uid] = true
					result.Items = append(result.Items, u)
					if result.GetResourceVersion() == "" {
						result.SetResourceVersion(l.GetResourceVersion())
					}
				}
			}
		}
	}
	return &result, nil
}

// TODO(ktravis): make this a resource filter? but that would require us to run through all of the resources up front
func PreferredResources(lists []*metav1.APIResourceList) []*metav1.APIResourceList {
	// TODO(ktravis): factor this up into the cached resources so we can try to tell the frontend which are deprecated?
	// if a resource exists in multiple groups, we want to ignore the "extensions" version as it is likely deprecated
	prefer := make(map[string]string)
	for _, list := range lists {
		group := strings.Split(list.GroupVersion, "/")[0]
		for _, res := range list.APIResources {
			g, ok := prefer[res.StorageVersionHash]
			if !ok || g == "extensions" {
				prefer[res.StorageVersionHash] = group
			}
		}
	}
	out := make([]*metav1.APIResourceList, 0)
	for _, list := range lists {
		newList := &metav1.APIResourceList{
			GroupVersion: list.GroupVersion,
		}
		group := strings.Split(list.GroupVersion, "/")[0]
		for _, res := range list.APIResources {
			if prefer[res.StorageVersionHash] == group {
				newList.APIResources = append(newList.APIResources, res)
			}
		}
		if len(newList.APIResources) > 0 {
			out = append(out, newList)
		}
	}
	return out
}
