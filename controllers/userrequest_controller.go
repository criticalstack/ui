package controllers

import (
	"context"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/criticalstack/ui/internal/rbac"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

type UserRequestReconciler struct {
	client.Client
	Log    *zap.SugaredLogger
	Scheme *runtime.Scheme
}

func (r *UserRequestReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.UserRequest{}).
		Owns(&v1alpha1.User{}).
		Owns(&rbacv1.ClusterRole{}).
		Owns(&rbacv1.ClusterRoleBinding{}).
		Complete(r)
}

func (r *UserRequestReconciler) Reconcile(req ctrl.Request) (ctrl.Result, error) {
	ctx := context.Background()
	log := r.Log.With("userrequest", req.NamespacedName)

	var ur v1alpha1.UserRequest
	if err := r.Get(ctx, req.NamespacedName, &ur); err != nil {
		return ctrl.Result{}, errors.Wrap(client.IgnoreNotFound(err), "unable to get UserRequest")
	}
	log.Info("reconciling")

	resName := ur.Spec.ResourceName()

	var u v1alpha1.User
	u.SetName(resName)

	var ready *v1alpha1.UserRequestCondition
	for i, c := range ur.Status.Conditions {
		if c.Type == v1alpha1.UserRequestReady {
			ready = &ur.Status.Conditions[i]
			break
		}
	}
	if ready == nil {
		ur.Status.Conditions = append(ur.Status.Conditions, v1alpha1.UserRequestCondition{
			Type: v1alpha1.UserRequestReady,
		})
		ready = &ur.Status.Conditions[len(ur.Status.Conditions)-1]
	}
	ready.Status = corev1.ConditionFalse
	if err := r.Get(ctx, client.ObjectKey{Name: u.Name}, &u); err == nil {
		ready.Status = corev1.ConditionTrue
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, errors.Wrap(err, "failed finding user")
	}
	ur.Status.User = u.Name
	if err := r.Status().Update(ctx, &ur); err != nil {
		return ctrl.Result{}, errors.Wrap(err, "unable to update user request status")
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &u, func() error {
		u.UserTemplate = ur.Spec.UserTemplate
		return controllerutil.SetControllerReference(&ur, &u, r.Scheme)
	}); err != nil {
		return ctrl.Result{}, errors.Wrap(err, "unable to create or updated User")
	}

	if ur.Spec.InitialPassword != nil {
		var s corev1.Secret
		s.SetName(u.Name)
		s.SetNamespace("critical-stack")
		if err := r.Get(ctx, client.ObjectKey{Name: s.Name, Namespace: s.Namespace}, &s); err != nil {
			if client.IgnoreNotFound(err) == nil {
				log.Info("setting an initial password for user")
				pw := ur.Spec.InitialPassword.Value
				ref := ur.Spec.InitialPassword.SecretRef
				if ref != nil {
					s := ref.Object()
					if err := r.Get(ctx, ref.ObjectKey(), &s); err != nil {
						return ctrl.Result{}, errors.Wrap(err, "failed to retrieve referenced secret")
					}
					if ref.Key != "" {
						pw = string(s.Data[ref.Key])
					} else {
						for _, d := range s.Data {
							pw = string(d)
							break
						}
					}
				}
				if pw == "" {
					return ctrl.Result{}, errors.Errorf("no initial password value found")
				}
				s.Type = "users.criticalstack.com/password-data"
				s.Data = v1alpha1.NewPasswordData(pw).ToMap()
				if err := controllerutil.SetControllerReference(&ur, &s, r.Scheme); err != nil {
					return ctrl.Result{}, errors.Wrap(err, "unable to set password secret controller reference")
				}
				if err := r.Create(ctx, &s); err != nil {
					return ctrl.Result{}, errors.Wrap(err, "fialed to create passward Secret")
				}

				if ref != nil && ref.Consume {
					log.Info("'consume' set, deleting referenced secret", "ref", ref)
					s := ref.Object()
					if err := r.Delete(ctx, &s); err != nil {
						return ctrl.Result{}, errors.Wrap(err, "failed to retrieve referenced secret")
					}
				}

				// update which will trigger a requeue, now that initial password has been created
				ur.Spec.InitialPassword = nil
				if err := r.Update(ctx, &ur); err != nil {
					return ctrl.Result{}, errors.Wrap(err, "failed to update user request after initial password has been created")
				}
				return ctrl.Result{}, nil
			}
			return ctrl.Result{}, errors.Wrap(err, "failed to get initial password secret")
		}
	}

	if ur.Spec.SkipUserBindings {
		log.Info("skipUserBindings set, not creating/updating user rbac")
	} else {
		var cr rbacv1.ClusterRole
		cr.Name = resName
		if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &cr, func() error {
			cr.Rules = []rbacv1.PolicyRule{
				{
					APIGroups:     []string{"criticalstack.com"},
					Verbs:         []string{"get", "update", "patch"},
					Resources:     []string{"userrequests"},
					ResourceNames: []string{ur.Name},
				},
				{
					APIGroups:     []string{"criticalstack.com"},
					Verbs:         []string{"get"},
					Resources:     []string{"users"},
					ResourceNames: []string{u.Name},
				},
			}
			return controllerutil.SetControllerReference(&ur, &cr, r.Scheme)
		}); err != nil {
			return ctrl.Result{}, errors.Wrap(err, "unable to update or create cluster role")
		}

		var crb rbacv1.ClusterRoleBinding
		crb.Name = resName
		if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &crb, func() error {
			crb.RoleRef = rbac.ClusterRoleRef(cr.Name)
			crb.Subjects = []rbacv1.Subject{rbac.UserSubject(u.Email)}
			return controllerutil.SetControllerReference(&ur, &crb, r.Scheme)
		}); err != nil {
			return ctrl.Result{}, errors.Wrap(err, "unable to update or create cluster role binding")
		}
	}

	return ctrl.Result{}, nil
}
