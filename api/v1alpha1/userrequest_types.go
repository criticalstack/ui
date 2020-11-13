package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:printcolumn:name="Email",type="string",JSONPath=".spec.template.email",description="Email"
// +kubebuilder:printcolumn:name="Active",type="boolean",JSONPath=".spec.template.active",description="Is user account enabled"
// +kubebuilder:printcolumn:name="User",type="string",JSONPath=`.status.user`
// +kubebuilder:printcolumn:name="Ready",type="string",JSONPath=".status.conditions[?(@.type == 'Ready')].status",description="User is ready"
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

type UserRequest struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   UserRequestSpec   `json:"spec"`
	Status UserRequestStatus `json:"status,omitempty"`
}

type SecretReference struct {
	// Name of the secret
	Name string `json:"name"`
	// Namespace of the secret
	Namespace string `json:"namespace"`
	// Key represents the key in the secret to be referenced - if empty, the first field found is used
	Key string `json:"key,omitempty"`
	// Consume indicates that the secret should be deleted
	Consume bool `json:"consume,omitempty"`
}

func (s SecretReference) Object() corev1.Secret {
	return corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      s.Name,
			Namespace: s.Namespace,
		},
	}
}

func (s SecretReference) ObjectKey() client.ObjectKey {
	return client.ObjectKey{Name: s.Name, Namespace: s.Namespace}
}

type InitialPasswordSpec struct {
	// SecretRef points to a secret that should contains the initial password
	SecretRef *SecretReference `json:"secretRef,omitempty"`
	// Value is the string value to be used as a password
	Value string `json:"value,omitempty"`
}

type UserRequestSpec struct {
	UserTemplate     `json:"template"`
	InitialPassword  *InitialPasswordSpec `json:"initialPassword,omitempty"`
	SkipUserBindings bool                 `json:"skipUserBindings,omitempty"`
	SkipKeyCreation  bool                 `json:"skipKeyCreation,omitempty"`
}

type UserRequestStatus struct {
	Conditions []UserRequestCondition `json:"conditions"`
	User       string                 `json:"user,omitempty"`
}

type UserRequestConditionType string

const (
	UserRequestReady UserRequestConditionType = "Ready"
)

type UserRequestCondition struct {
	Type   UserRequestConditionType `json:"type"`
	Status corev1.ConditionStatus   `json:"status"`
}

// +kubebuilder:object:root=true

// UserRequestList contains a list of UserRequest
type UserRequestList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []UserRequest `json:"items"`
}

func init() {
	SchemeBuilder.Register(&UserRequest{}, &UserRequestList{})
}
