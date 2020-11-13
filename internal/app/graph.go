package app

import (
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type resourceLink struct {
	Type   string            `json:"type"`
	Source resourceReference `json:"source"`
	Target resourceReference `json:"target"`
	// ExtraData map[string]interface{} `json:"extraData"`
}

func computeResourceLinks(res unstructured.Unstructured) []resourceLink {
	links := make([]resourceLink, 0)
	this := unstructuredReference(res)
	lonePod := res.GetKind() == "Pod" && res.GetAPIVersion() == "v1"
	for _, ref := range res.GetOwnerReferences() {
		links = append(links, resourceLink{
			Type: "owns",
			Source: resourceReference{
				UID:        string(ref.UID),
				Name:       ref.Name,
				APIVersion: ref.APIVersion,
				Kind:       ref.Kind,
			},
			Target: this,
		})
		if strings.HasPrefix(ref.APIVersion, "apps/") {
			lonePod = false
		}
	}

	vols, ok, _ := unstructured.NestedSlice(res.Object, "spec", "template", "spec", "volumes")
	if !ok && lonePod {
		vols, ok, _ = unstructured.NestedSlice(res.Object, "spec", "volumes")
	}
	if ok {
		for _, x := range vols {
			if v, ok := x.(map[string]interface{}); ok {
				if s, ok, _ := unstructured.NestedString(v, "secret", "secretName"); ok {
					links = append(links, resourceLink{
						Type:   "mounts",
						Source: this,
						Target: resourceReference{
							Name:       s,
							APIVersion: "v1",
							Kind:       "Secret",
						},
					})
				} else if s, ok, _ := unstructured.NestedString(v, "configMap", "name"); ok {
					links = append(links, resourceLink{
						Type:   "mounts",
						Source: this,
						Target: resourceReference{
							Name:       s,
							APIVersion: "v1",
							Kind:       "ConfigMap",
						},
					})
				} else if s, ok, _ := unstructured.NestedString(v, "persistentVolumeClaim", "claimName"); ok {
					links = append(links, resourceLink{
						Type:   "mounts",
						Source: this,
						Target: resourceReference{
							Name:       s,
							APIVersion: "v1",
							Kind:       "PersistentVolumeClaim",
						},
					})
				}
			}
		}
	}
	// TODO(ktravis): add more ownership types
	return links
}
