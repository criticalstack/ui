package app

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/log"
	"github.com/criticalstack/ui/internal/rbac"
	"github.com/criticalstack/ui/internal/sso"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"golang.org/x/oauth2"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var (
	errUnknownUser = errors.New("unknown user session")

	safeEmailRegexp = regexp.MustCompile(`[^a-zA-Z0-9]+`)
)

func safeEmail(email string) string {
	return strings.ToLower(safeEmailRegexp.ReplaceAllString(email, "-"))
}

type localUser struct {
	v1alpha1.UserTemplate
	Labels      map[string]string `json:"labels"`
	Password    string            `json:"password"`
	RoleID      string            `json:"roleID"`
	ClusterWide bool              `json:"clusterWide"`
}

func (u localUser) validate() error {
	if u.Password == "" {
		return errors.New("user password may not be empty")
	}
	if u.RoleID != "" {
		if !u.ClusterWide && u.DefaultNamespace == "" {
			return errors.Errorf("must set namespace for chosen role")
		}
	}
	return nil
}

// UserAdd adds a new user to the system
func (x *Controller) UserAdd(c echo.Context) error {
	ctx := c.Request().Context()
	u := &localUser{}
	if err := c.Bind(u); err != nil {
		return newError(err)
	}
	u.Type = v1alpha1.UserTypeLocal
	self := User(c)
	if self == nil {
		return newError(errUnknownUser)
	}
	if u.Labels == nil {
		u.Labels = make(map[string]string)
	}
	u.Labels["criticalstack.com/user.createdBy"] = self.Name

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	if err := u.validate(); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	// TODO(ktravis): give the user permissions for verification keys etc
	ur, err := CreateUser(ctx, cli, u.UserTemplate)
	if err != nil {
		return newError(err)
	}
	if err := CreateUserPassword(ctx, cli, ur, u.Password); err != nil {
		return newError(err)
	}
	if u.RoleID != "" {
		ns := u.DefaultNamespace
		if u.ClusterWide {
			ns = ""
		}
		if err := applyUserRole(ctx, cli, ur, ns, rbac.ClusterRoleRef(u.RoleID)); err != nil {
			return errors.Wrap(err, "failed to setup initial user access")
		}
	}
	return x.sendJSONSuccess(c, Map{"result": ur})
}

func applyUserRole(ctx context.Context, cli client.Client, u *v1alpha1.UserRequest, ns string, role rbacv1.RoleRef) error {
	bindName := u.Name + "-" + role.Name
	if len(bindName) > 253 { // bindings have a max name length of 253
		bindName = bindName[:253]
	}
	owner := []metav1.OwnerReference{UserOwnerReference(u)}
	sub := rbac.UserSubject(u.Spec.Email)
	var err error
	if ns == "" {
		_, err = rbac.AddClusterRoleBindingSubjects(ctx, cli, bindName, role, owner, sub)
	} else {
		_, err = rbac.AddRoleBindingSubjects(ctx, cli, bindName, ns, role, owner, sub)
	}
	return err
}

func (x *Controller) GetUserKubeConfig(c echo.Context) error {
	kubeconfigRedirect := c.Scheme() + "://" + c.Request().Host + "/kubeconfig/download"
	conn, err := x.ssoConnector(func(oc *oauth2.Config) {
		oc.RedirectURL = kubeconfigRedirect
	})
	if err != nil {
		log.Errorf("SSO connector creation failed: %v", err)
		return displayLoginError(c, "SSO login temporarily unavailable")
	}
	opts := []sso.URLParam{sso.SetQuery("connector_id", proxyConnectorID)}

	b := make([]byte, SessionSSOStateLength)
	if _, err := rand.Read(b); err != nil {
		log.Errorf("failed to read random bytes: %v", err)
		return displayLoginError(c, "Failed to establish session")
	}
	state := base64.StdEncoding.EncodeToString(b)

	enc, err := x.cookie.Encode(SessionSSOStateKey, state)
	if err != nil {
		log.Errorf("failed to read random bytes: %v", err)
		return displayLoginError(c, "Failed to establish session")
	}
	c.SetCookie(&http.Cookie{
		Name:  SessionSSOStateKey,
		Value: enc,
		Path:  "/",
	})

	// NOTE(ktravis): do not let the browser cache this redirect under any
	// circumstances, or the state cookie will be invalid
	c.Response().Header().Set("Cache-Control", "no-cache")
	return c.Redirect(http.StatusPermanentRedirect, conn.RedirectURL(state, opts...))
}

func (x *Controller) GetUserKubeConfigCallback(c echo.Context) error {
	ck, err := c.Cookie(SessionSSOStateKey)
	if err != nil {
		return displayLoginError(c, "Session state invalid")
	}
	var state string
	if err := x.cookie.Decode(SessionSSOStateKey, ck.Value, &state); err != nil {
		return displayLoginError(c, "Session state invalid")
	}
	if state == "" || c.QueryParam("state") != state {
		return displayLoginError(c, "Session state invalid")
	}

	kubeconfigRedirect := c.Scheme() + "://" + c.Request().Host + "/kubeconfig/download"
	conn, err := x.ssoConnector(func(oc *oauth2.Config) {
		oc.RedirectURL = kubeconfigRedirect
	})
	if err != nil {
		if errors.Cause(err) == sso.ErrNoConfiguration {
			return c.Redirect(http.StatusFound, "/login")
		}
		log.Errorf("SSO connector creation failed: %v", err)
		return displayLoginError(c, "SSO login temporarily unavailable")
	}

	info, err := conn.Authenticate(c.QueryParam("code"))
	if err != nil {
		log.Errorf("SSO auth failed: %v", err)
		return displayLoginError(c, "Authentication failure")
	}
	if info.Email == "" {
		log.Errorf("no email returned with user information")
		return displayLoginError(c, "Authentication failure")
	}
	user := User(c)
	if user == nil {
		return newError(errUnknownUser)
	}
	s, err := x.buildKubeConfig(x.kubeconfigTemplate(), kubeconfigArgs{
		Namespace: user.DefaultNamespace,
		Username:  safeEmail(user.Email),
		Token:     info.Token,
		//RefreshToken: info.RefreshToken,
	})
	if err != nil {
		return newError(err)
	}
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename=\"kubeconfig\"")
	return c.Blob(http.StatusOK, "application/yaml", []byte(s))
}

func (x *Controller) modifyUser(c echo.Context, fn func(client.Client, *v1alpha1.UserTemplate) error) error {
	ctx := c.Request().Context()
	user := User(c)
	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	ref := metav1.GetControllerOf(user)
	if ref == nil {
		if err := fn(cli, &user.UserTemplate); err != nil {
			return newError(err)
		}
		if err := cli.Update(ctx, user); err != nil {
			return newError(err)
		}
		return x.sendJSONSuccess(c, Map{"result": user})
	}
	var ur v1alpha1.UserRequest
	if err := cli.Get(ctx, client.ObjectKey{Name: ref.Name}, &ur); err != nil {
		return newError(err)
	}
	if err := fn(cli, &ur.Spec.UserTemplate); err != nil {
		return newError(err)
	}
	if err := cli.Update(ctx, &ur); err != nil {
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{"result": ur.Spec.UserTemplate})
}

// UploadAvatar will resize and save a new user avatar
func (x *Controller) UploadAvatar(c echo.Context) error {
	var tmp struct {
		Avatar string `json:"avatar"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	return x.modifyUser(c, func(cli client.Client, u *v1alpha1.UserTemplate) error {
		u.CustomAvatar = tmp.Avatar
		return nil
	})
}

// UpdateDefaultNamespace will change the user's default namespace
func (x *Controller) UpdateDefaultNamespace(c echo.Context) error {
	var tmp struct {
		Namespace string `json:"namespace"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	return x.modifyUser(c, func(cli client.Client, u *v1alpha1.UserTemplate) error {
		u.DefaultNamespace = tmp.Namespace
		return nil
	})
}

// UserChangePassword will update the users password
// if the current password is valid
func (x *Controller) UserChangePassword(c echo.Context) error {
	var tmp struct {
		Current  string `json:"current"`
		Password string `json:"password"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}

	user := User(c)
	if user.Type != v1alpha1.UserTypeLocal {
		return errors.New("cannot set password on non-local user")
	}

	// NOTE(ktravis): use the server's access here, not the user's
	cli, err := client.New(x.config.KubeConfig, client.Options{})
	if err != nil {
		return newStatusError(401, err)
	}

	u, err := x.getUserByName(c.Request().Context(), cli, user.Name)
	if err != nil {
		return err
	}
	if u.Type != v1alpha1.UserTypeLocal {
		return errors.New("cannot set password on non-local user")
	}

	u, err = x.validatePassword(c.Request().Context(), cli, user.Email, tmp.Current)
	if err != nil {
		return err
	}
	if err := x.userChangePassword(c.Request().Context(), cli, u, tmp.Password); err != nil {
		return err
	}
	x.logoutUser(c)
	return x.sendJSONSuccess(c, Map{"result": user})
}

// ResetPassword allows a super admin or admin to reset a users password.
func (x *Controller) ResetPassword(c echo.Context) error {
	var tmp struct {
		Password string `json:"password"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	cli, err := x.userClient(c)
	if err != nil {
		return err
	}
	user, err := x.getUserByName(c.Request().Context(), cli, c.Param("name"))
	if err != nil {
		return errors.Errorf("error finding user")
	}
	if user.Type != v1alpha1.UserTypeLocal {
		return errors.New("cannot set password on non-local user")
	}
	if err := x.userChangePassword(c.Request().Context(), cli, user, tmp.Password); err != nil {
		if apierrors.IsForbidden(err) {
			return newStatusError(http.StatusForbidden, errors.Errorf("you are not allowed to reset this user's password"))
		}
		return newError(err)
	}
	return x.sendJSONSuccess(c, Map{"result": user})
}

func (x *Controller) getUserByName(ctx context.Context, cli client.Client, name string) (*v1alpha1.User, error) {
	var u v1alpha1.User
	if err := cli.Get(ctx, client.ObjectKey{Name: name}, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (x *Controller) getUserByEmail(ctx context.Context, cli client.Client, email string) (*v1alpha1.User, error) {
	name := v1alpha1.HashResourceName(email)
	if len(name) == 0 {
		return nil, errors.Errorf("failed to format email as resource name")
	}
	return x.getUserByName(ctx, cli, name)
}

// createUser creates the UserRequest CRD
func CreateUser(ctx context.Context, cli client.Client, u v1alpha1.UserTemplate, mut ...func(*v1alpha1.UserRequest)) (*v1alpha1.UserRequest, error) {
	var ur v1alpha1.UserRequest
	ur.Name = u.ResourceName()
	ur.Spec.UserTemplate = u
	for _, fn := range mut {
		fn(&ur)
	}
	if err := cli.Create(ctx, &ur); err != nil {
		return nil, err
	}
	if _, err := waitForUser(ctx, cli, &ur); err != nil {
		log.Errorf("waitForUser failed: %v", err)
		return nil, err
	}
	return &ur, nil
}

func waitForUser(ctx context.Context, cli client.Client, ur *v1alpha1.UserRequest) (*v1alpha1.User, error) {
	key, err := client.ObjectKeyFromObject(ur)
	if err != nil {
		return nil, err
	}
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	for ur.Status.User == "" {
		select {
		case <-tick.C:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		if err := cli.Get(ctx, key, ur); err != nil {
			return nil, err
		}
	}
	var u v1alpha1.User
	if err := cli.Get(ctx, client.ObjectKey{Name: ur.Status.User}, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func updateOwningUserRequest(ctx context.Context, cli client.Client, u *v1alpha1.User) error {
	for _, ref := range u.OwnerReferences {
		if ref.Kind == "UserRequest" {
			// TODO(ktravis): make this a PATCH instead?
			var ur v1alpha1.UserRequest
			if err := cli.Get(ctx, client.ObjectKey{Name: ref.Name}, &ur); err != nil {
				return err
			}
			ur.Spec.UserTemplate = u.UserTemplate
			return cli.Update(ctx, &ur)
		}
	}
	log.Errorf("owning UserRequest not found: %v", u)
	return nil
}

// createUserPassword creates the User password Secret
func CreateUserPassword(ctx context.Context, cli client.Client, u *v1alpha1.UserRequest, password string) error {
	if password == "" {
		return errors.New("password may not be empty")
	}
	pw := v1alpha1.NewPasswordData(password)
	s := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:            u.Name,
			Namespace:       "critical-stack",
			OwnerReferences: []metav1.OwnerReference{UserOwnerReference(u)},
		},
		Data: pw.ToMap(),
	}
	return cli.Create(ctx, s)
}

func UserOwnerReference(u *v1alpha1.UserRequest) metav1.OwnerReference {
	return metav1.OwnerReference{
		APIVersion: v1alpha1.GroupVersion.String(),
		Kind:       "UserRequest",
		Name:       u.Name,
		UID:        u.UID,
	}
}

func (x *Controller) validatePassword(ctx context.Context, cli client.Client, email, password string) (*v1alpha1.User, error) {
	u, err := x.getUserByEmail(ctx, cli, email)
	if err != nil {
		return nil, err
	}
	if !u.Active {
		return nil, errors.Errorf("user is not active")
	}
	s := &corev1.Secret{}
	if err := cli.Get(ctx, client.ObjectKey{Name: u.Name, Namespace: "critical-stack"}, s); err != nil {
		return nil, err
	}
	pw := v1alpha1.NewPasswordDataFromMap(s.Data)
	if !pw.Validate(password) {
		return nil, errors.Errorf("authentication error")
	}
	return u, nil
}

// ChangePassword for user
func (x *Controller) userChangePassword(ctx context.Context, cli client.Client, u *v1alpha1.User, password string) error {
	pw := v1alpha1.NewPasswordData(password)
	s := &corev1.Secret{}
	if err := cli.Get(ctx, client.ObjectKey{Name: u.Name, Namespace: "critical-stack"}, s); err != nil {
		return err
	}
	s.Data = pw.ToMap()
	return cli.Update(ctx, s)
}
