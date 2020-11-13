package controllers

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	v1alpha1 "github.com/criticalstack/ui/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ktypes "k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var _ = Describe("UserRequestController", func() {
	const timeout = time.Second * 5
	const interval = time.Millisecond * 10

	ctx := context.Background()

	var (
		userReq  v1alpha1.UserRequest
		userName string
	)

	BeforeEach(func() {
		n := "test-userrequest-" + randString(8)

		userReq = v1alpha1.UserRequest{
			TypeMeta: metav1.TypeMeta{
				Kind:       "UserRequest",
				APIVersion: "criticalstack.com/v1alpha1",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name:      n,
				Namespace: "critical-stack",
			},
			Spec: v1alpha1.UserRequestSpec{
				UserTemplate: v1alpha1.UserTemplate{
					Active: true,
					Email:  n + "@test.com",
				},
			},
		}

		userName = userReq.Spec.ResourceName()
	})

	beReady := WithTransform(func(ur v1alpha1.UserRequest) corev1.ConditionStatus {
		for _, c := range ur.Status.Conditions {
			if c.Type == v1alpha1.UserRequestReady {
				return c.Status
			}
		}
		return corev1.ConditionUnknown
	}, Equal(corev1.ConditionTrue))

	userCreatedSuccessfully := func() {
		EventuallyWithOffset(1, func() (ur v1alpha1.UserRequest, err error) {
			return ur, k8sClient.Get(ctx, client.ObjectKey{Name: userReq.Name}, &ur)
		}, timeout, interval).Should(And(beReady, WithTransform(func(ur v1alpha1.UserRequest) string {
			return ur.Status.User
		}, Not(BeEmpty()),
		)))
	}

	clusterRoleFound := func() bool {
		var cr rbacv1.ClusterRole
		return k8sClient.Get(ctx, client.ObjectKey{Name: userName}, &cr) == nil
	}
	clusterRoleBindingFound := func() bool {
		var crb rbacv1.ClusterRoleBinding
		return k8sClient.Get(ctx, client.ObjectKey{Name: userName}, &crb) == nil
	}

	Context("When UserRequest is created", func() {
		JustBeforeEach(func() {
			Expect(k8sClient.Create(ctx, &userReq)).Should(Succeed())
		})

		AfterEach(func() {
			Expect(k8sClient.Delete(ctx, &userReq)).Should(Succeed())
		})

		Context("When User is created or updated", func() {

			Context("When the initial password is set", func() {
				var ns corev1.Namespace
				var password corev1.Secret

				BeforeEach(func() {
					ns = corev1.Namespace{}
					ns.Name = "password-" + randString(8)
					Expect(k8sClient.Create(ctx, &ns)).Should(Succeed())

					password = corev1.Secret{}
					password.Name = "password-" + randString(8)
					password.Namespace = ns.Name
					password.Data = map[string][]byte{
						"password": []byte("U2VjcmV0"),
					}
					Expect(k8sClient.Create(ctx, &password)).Should(Succeed())
				})

				AfterEach(func() {
					Expect(k8sClient.Delete(ctx, &ns)).Should(Succeed())
				})

				Context("When secret is not found", func() {
					Context("When SecretRef is set", func() {
						BeforeEach(func() {
							userReq.Spec.InitialPassword = &v1alpha1.InitialPasswordSpec{
								SecretRef: &v1alpha1.SecretReference{
									Name:      password.Name,
									Namespace: password.Namespace,
								},
							}
						})
						AfterEach(func() {
							if !userReq.Spec.InitialPassword.SecretRef.Consume {
								Expect(k8sClient.Delete(ctx, &password)).Should(Succeed())
							}
						})

						Context("When SecretRef is set to be consumed", func() {
							BeforeEach(func() {
								userReq.Spec.InitialPassword.SecretRef.Consume = true
							})

							It("Should delete referenced secret", func() {
								s := userReq.Spec.InitialPassword.SecretRef.Object()
								Eventually(func() bool {
									return apierrors.IsNotFound(k8sClient.Get(ctx, ktypes.NamespacedName{Name: s.Name, Namespace: s.Namespace}, &s))
								}, timeout, interval).Should(BeTrue())
							})
						})

						It("Should create Secret from SecretRef in the critical-stack namespace", func() {
							Eventually(func() error {
								var s corev1.Secret
								s.SetName(userName)
								s.SetNamespace("critical-stack")
								return k8sClient.Get(ctx, ktypes.NamespacedName{Name: s.Name, Namespace: s.Namespace}, &s)
							}, timeout, interval).Should(Succeed())

							userCreatedSuccessfully()
							// Eventually(readyCondition, timeout, interval).Should(beReady())
						})
					})

					Context("When SecretRef is not set and Password value is set", func() {
						BeforeEach(func() {
							userReq.Spec.InitialPassword = &v1alpha1.InitialPasswordSpec{
								Value: "UGFzc3dvcmQ=",
							}
						})

						It("Should create Secret using password value in the critical-stack namespace", func() {
							Eventually(func() error {
								var s corev1.Secret
								s.SetName(userName)
								s.SetNamespace("critical-stack")
								return k8sClient.Get(ctx, ktypes.NamespacedName{Name: s.Name, Namespace: s.Namespace}, &s)
							}, timeout, interval).Should(Succeed())

							userCreatedSuccessfully()
							// Eventually(readyCondition, timeout, interval).Should(beReady())
						})
					})
				})
			})

			Context("When the initial password is not set", func() {
				Context("When skipping user bindings", func() {
					BeforeEach(func() {
						userReq.Spec.SkipUserBindings = true
					})

					It("Should not create ClusterRole and ClusterRoleBinding", func() {
						userCreatedSuccessfully()
						// Eventually(readyCondition, timeout, interval).Should(beReady())
						Eventually(clusterRoleFound, timeout, interval).Should(BeFalse())
						Eventually(clusterRoleBindingFound, timeout, interval).Should(BeFalse())
					})
				})

				Context("When using user bindings", func() {
					AfterEach(func() {
						var cr rbacv1.ClusterRole
						cr.Name = userName
						Expect(k8sClient.Delete(ctx, &cr)).Should(Succeed())

						var crb rbacv1.ClusterRoleBinding
						crb.Name = userName
						Expect(k8sClient.Delete(ctx, &crb)).Should(Succeed())
					})

					It("Should create ClusterRole and ClusterRoleBinding", func() {
						userCreatedSuccessfully()
						// Eventually(readyCondition, timeout, interval).Should(beReady())
						Eventually(clusterRoleFound, timeout, interval).Should(BeTrue())
						Eventually(clusterRoleBindingFound, timeout, interval).Should(BeTrue())
					})
				})
			})
		})
	})
})
