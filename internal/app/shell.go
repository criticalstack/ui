package app

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func (x *Controller) UserShell(c echo.Context) error {
	u := User(c)
	var tmp struct {
		Name           string `json:"name"`
		Namespace      string `json:"namespace"`
		ServiceAccount string `json:"serviceAccount"`
		Image          string `json:"image"`
	}
	if err := c.Bind(&tmp); err != nil {
		return newStatusError(http.StatusBadRequest, err)
	}
	if tmp.Name == "" {
		// TODO(ktravis): this is less likely to be unique, but probably ok
		tmp.Name = safeEmail(u.Email) + "-shell"
	}
	if tmp.Namespace == "" {
		tmp.Namespace = u.DefaultNamespace
		if tmp.Namespace == "" {
			tmp.Namespace = "default"
		}
	}

	if tmp.Image == "" {
		tmp.Image = "bitnami/kubectl"
	}
	var pvc corev1.PersistentVolumeClaim
	pvc.SetName(tmp.Name)
	pvc.SetNamespace(tmp.Namespace)
	pvc.Spec.AccessModes = []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce}
	pvc.Spec.Resources.Requests = corev1.ResourceList{
		corev1.ResourceStorage: resource.MustParse("1Gi"),
	}
	var j batchv1.Job
	j.SetName(tmp.Name)
	j.SetNamespace(tmp.Namespace)
	one := int32(1)

	v := corev1.Volume{
		Name: "data",
		VolumeSource: corev1.VolumeSource{
			PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{ClaimName: pvc.Name},
		},
	}
	container := corev1.Container{
		Image:   tmp.Image,
		Name:    "shell",
		Command: []string{"/bin/sh", "-is"},
		TTY:     true,
		Stdin:   true,
		VolumeMounts: []corev1.VolumeMount{
			{Name: v.Name, MountPath: "/data"},
		},
	}
	sel := &metav1.LabelSelector{MatchLabels: map[string]string{"criticalstack.com/usershell.owner": u.Name}}
	jobspec := batchv1.JobSpec{
		BackoffLimit:            &one,
		TTLSecondsAfterFinished: &one,
		Template: corev1.PodTemplateSpec{
			Spec: corev1.PodSpec{
				ServiceAccountName: tmp.ServiceAccount,
				RestartPolicy:      corev1.RestartPolicyNever,
				Containers:         []corev1.Container{container},
				Volumes:            []corev1.Volume{v},
			},
		},
	}

	cli, err := x.userClient(c)
	if err != nil {
		return newError(err)
	}
	ctx := c.Request().Context()
	// TODO(ktravis): should this be create or update instead?
	if err := cli.Create(ctx, &pvc); err != nil && !apierrors.IsAlreadyExists(err) {
		return newError(err)
	}

	bg := metav1.DeletePropagationBackground
	g := int64(1)
	do := &client.DeleteOptions{
		PropagationPolicy:  &bg,
		GracePeriodSeconds: &g,
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := cli.Get(ctx, client.ObjectKey{Name: j.Name, Namespace: j.Namespace}, &j); err != nil {
		if !apierrors.IsNotFound(err) {
			return newError(err)
		}
		j.Spec = jobspec
		j.Spec.Template.Labels = sel.MatchLabels
		if err := cli.Create(ctx, &j); err != nil {
			return newError(err)
		}
	} else {
		j.Spec.Template.Spec = jobspec.Template.Spec
		if err := cli.Update(ctx, &j); err != nil {
			if !apierrors.IsInvalid(err) {
				return newError(err)
			}
			if err := cli.Delete(ctx, &j, do); err != nil {
				return newError(err)
			}

			j = batchv1.Job{}
			j.SetName(tmp.Name)
			j.SetNamespace(tmp.Namespace)
			j.Spec = jobspec
			j.Spec.Template.Labels = sel.MatchLabels
			for ctx.Err() == nil {
				if err := cli.Create(ctx, &j); err != nil && !apierrors.IsAlreadyExists(err) {
					return newError(err)
				} else if err == nil {
					break
				}
				time.Sleep(500 * time.Millisecond)
			}
		}
	}
	var pods corev1.PodList

	for ctx.Err() == nil && len(pods.Items) == 0 {
		if j.Status.Failed > 0 {
			var failed *batchv1.JobCondition
			for i, c := range j.Status.Conditions {
				if c.Type == batchv1.JobFailed {
					failed = &j.Status.Conditions[i]
					break
				}
			}
			if failed != nil {
				return newError(fmt.Errorf("shell job failed: %v", failed.Message))
			}
		}

		if err := cli.List(ctx, &pods, client.InNamespace(j.Namespace), client.MatchingLabels(sel.MatchLabels)); err != nil {
			return newError(err)
		}
	}
	if err := ctx.Err(); err != nil {
		return newError(err)
	}
	pod := pods.Items[0]
	for pod.Status.Phase != corev1.PodRunning {
		if err := cli.Get(ctx, client.ObjectKey{Name: pod.Name, Namespace: pod.Namespace}, &pod); err != nil {
			return newError(err)
		}
		time.Sleep(100 * time.Millisecond)
	}

	return x.sendJSONSuccess(c, Map{
		"result": Map{
			"namespace": pod.Namespace,
			"pod":       pod.Name,
			"container": container.Name,
		},
	})
}
