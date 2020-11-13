package v1alpha1

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base32"
	"fmt"

	"golang.org/x/crypto/pbkdf2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type UserType string

const (
	UserTypeLocal UserType = "local"
	UserTypeSSO   UserType = "sso"
)

type UserTemplate struct {
	Active           bool     `json:"active"`
	CustomAvatar     string   `json:"customAvatar,omitempty"`
	DefaultNamespace string   `json:"defaultNamespace,omitempty"`
	Email            string   `json:"email"`
	Groups           []string `json:"groups,omitempty"`
	Type             UserType `json:"type"`
	Username         string   `json:"username"`
}

var encoding = base32.NewEncoding("abcdefghijklmnopqrstuvwxyz234567")

// HashResourceName hashes the input string and returns a valid Kubernetes
// resource name - RFC1123 DNS Label compliant.
// The returned string must:
// - be comprised only of alphanumeric and the "-" character
// - begin and end with an alphanumeric character
// - be entirely lowercase
// - be <= 63 characters in length
// This is currently accomplished by computing the SHA512, encoding to
// lowercase alphanumeric b32, and truncating to 63 bytes (the SHA512
// output is always >63 bytes).
func HashResourceName(s string) string {
	hasher := sha512.New()
	if _, err := hasher.Write([]byte(s)); err != nil {
		// according to the hasher.Hash interface, "it never returns an error"
		panic(err)
	}
	return encoding.EncodeToString(hasher.Sum(nil))[:63]
}

func (t UserTemplate) ResourceName() string {
	return HashResourceName(t.Email)
}

type PasswordData struct {
	Hash string `json:"hash"`
	Salt string `json:"salt"`
}

func (pw PasswordData) Validate(password string) bool {
	return EncodePassword(password, pw.Salt) == pw.Hash
}

func (pw PasswordData) ToMap() map[string][]byte {
	return map[string][]byte{
		"hash": []byte(pw.Hash),
		"salt": []byte(pw.Salt),
	}
}

// EncodePassword encodes password to safe format.
func EncodePassword(pw, salt string) string {
	newPasswd := pbkdf2.Key([]byte(pw), []byte(salt), 10000, 50, sha256.New)
	return fmt.Sprintf("%x", newPasswd)
}

//nolint:unparam
func randString(n int) string {
	const alphanum = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	bb := make([]byte, n)
	if _, err := rand.Read(bb); err != nil {
		// NOTE(ktravis): this is an unlikely case but it needs to be handled,
		// or a vulnerability is introduced (potential entropy exhaustion)
		panic(err)
	}
	for i, b := range bb {
		bb[i] = alphanum[int(b)%len(alphanum)]
	}
	return string(bb)
}

const (
	UserSaltLengthBytes = 10
)

func NewPasswordDataFromMap(in map[string][]byte) *PasswordData {
	return &PasswordData{
		Hash: string(in["hash"]),
		Salt: string(in["salt"]),
	}
}

func NewPasswordData(password string) PasswordData {
	salt := randString(UserSaltLengthBytes)
	return PasswordData{
		Salt: salt,
		Hash: EncodePassword(password, salt),
	}
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:printcolumn:name="Email",type="string",JSONPath=".email",description="Email"
// +kubebuilder:printcolumn:name="Active",type="boolean",JSONPath=".active",description="Is user account enabled"
// +kubebuilder:printcolumn:name="Username",type="string",JSONPath=`.username`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

type User struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	UserTemplate `json:",inline"`
}

// +kubebuilder:object:root=true

// UserList contains a list of User
type UserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []User `json:"items"`
}

func init() {
	SchemeBuilder.Register(&User{}, &UserList{})
}
