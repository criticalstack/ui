import Session from "../../lib/helpers/session";
import syscalls from "../../lib/swoll/syscalls";

function templates() {
  var email = Session.user.email.replace(/[\.\@]/g, "-");

  var t = {
    "clusterroles": {
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "ClusterRole",
      "metadata": {
        "name": "secret-reader"
      },
      "rules": [
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "secrets"
          ],
          "verbs": [
            "get",
            "watch",
            "list"
          ]
        }
      ]
    },
    "clusterrolebindings": {
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "ClusterRoleBinding",
      "metadata": {
        "name": "read-secrets-global"
      },
      "subjects": [
        {
          "kind": "Group",
          "name": "manager",
          "apiGroup": "rbac.authorization.k8s.io"
        }
      ],
      "roleRef": {
        "kind": "ClusterRole",
        "name": "secret-reader",
        "apiGroup": "rbac.authorization.k8s.io"
      }
    },
    "configmaps": {
      "kind": "ConfigMap",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "data": {}
    },
    "cronjobs": {
      "kind": "CronJob",
      "apiVersion": "batch/v1beta1",
      "metadata": {
        "name": ""
      },
      "spec": {
        "schedule": "*/1 * * * *",
        "jobTemplate": {
          "spec": {
            "template": {
              "spec": {
                "containers": [
                  {
                    "name": "",
                    "image": "",
                    "args": []
                  }
                ],
                "restartPolicy": "OnFailure"
              }
            }
          }
        }
      }
    },
    "cronjobs-simple": {
      "manifest": {
        "kind": "CronJob",
        "apiVersion": "batch/v1beta1",
        "metadata": {
          "name": "",
          "labels": {
            "created-by": `${email}`
          },
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {
          "successfulJobsHistoryLimit": 0,
          "failedJobsHistoryLimit": 1,
          "schedule": "0 * * * *",
          "concurrencyPolicy": "Allow",
          "suspend": false,
          "jobTemplate": {
            "metadata": {},
            "spec": {
              "template": {
                "metadata": {},
                "spec": {
                  "restartPolicy": "OnFailure",
                  "imagePullSecrets": [],
                  "containers": [
                    {
                      "name": "",
                      "image": "",
                      "imagePullPolicy": "IfNotPresent",
                      "command": [],
                      "args": [],
                      "env": [],
                      "securityContext": {
                        "privileged": false
                      },
                      "volumeMounts": [
                        {
                          "mountPath": "",
                          "name": ""
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      },
      deps: [],
      exData: [
        {
          endpoint: "limitranges"
        },
        {
          endpoint: "persistentvolumeclaims",
        },
        {
          endpoint: "persistentvolumes",
        },
        {
          endpoint: "resourcequotas",
        },
        {
          endpoint: "secrets"
        },
        {
          endpoint: "services"
        },
        {
          endpoint: "storageclasses"
        }
      ],
      form: [
        {
          title: "Cron Job Name",
          key: "metadata.name",
          sub: "spec.jobTemplate.spec.template.spec.containers[0].name",
          label: "metadata.labels.job",
          source: "name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "Cron Job name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for your Cron Job. A label with the name will be added to the Cron Job and Service, if any, that will be deployed.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Schedule",
          key: "spec.schedule",
          type: "cronSimple",
          description: "Select a predefined scheduling definition",
          reference: "https://en.wikipedia.org/wiki/Cron"
        },
        {
          title: "Schedule",
          key: "spec.schedule",
          type: "cronAdvanced",
          description: "Alternatively, if you require more precision you can explicity adjust each interval",
          reference: "https://en.wikipedia.org/wiki/Cron"
        },
        {
          title: "Concurrency Policy",
          key: "spec.concurrencyPolicy",
          type: "select",
          values: [
            "Allow",
            "Forbid",
            "Replace"
          ],
          description: "Specifies how to treat concurrent executions of a job created by this cron job. Allow (default): allows concurrently running jobs. Forbid: forbids concurrent runs, skipping next run if previous hasn’t finished yet. Replace: cancels currently running job and replaces it with a new one.",
          reference: "https://kubernetes.io/docs/concepts/jobs/cron-jobs/#concurrency-policy"
        },
        {
          title: "Container Image",
          key: "spec.jobTemplate.spec.template.spec.containers[0].image",
          label: "spec.jobTemplate.spec.template.metadata.labels.version",
          type: "text",
          test: /^[a-z-][a-z0-9-:\/\.]{0,100}$/,
          errorMsg: "Image name must start with a letter and contain only letters, numbers, and '-'.",
          source: "image",
          description: "The URL of a public Docker container image on any registry, or a private image (commonly hosted on the Google Container Registry or Docker Hub). The container image specification must end with a colon.",
          reference: "http://kubernetes.io/docs/user-guide/images/"
        },
        {
          title: "Run command",
          key: "spec.jobTemplate.spec.template.spec.containers[0].command",
          type: "text",
          description: "By default, your containers run the selected images default entrypoint command. You can use the command options to override the default.",
          reference: "http://kubernetes.io/docs/user-guide/containers/"
        },
        {
          title: "Run command arguments (optional)",
          key: "spec.jobTemplate.spec.template.spec.containers[0].args",
          type: "text",
          description: "Arguments to pass to the command entered above"
        },
        {
          title: "Successful Job History Limit",
          key: "spec.successfulJobsHistoryLimit",
          type: "slider",
          range: {
            min: 0,
            max: 10,
            step: 1,
            default: 0
          },
          description: "This field specifies how many completed jobs should be kept. Under most circumstances you should leave this at 0.",
          reference: "https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#jobs-history-limits"
        },
        {
          title: "Failed Job History Limit",
          key: "spec.failedJobsHistoryLimit",
          type: "slider",
          range: {
            min: 0,
            max: 10,
            step: 1,
            default: 1
          },
          description: "This field specifies how many failed jobs should be kept. This could be helpful for troubleshooting issues with cronjobs",
          reference: "https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#jobs-history-limits"
        },
        {
          title: "Show advanced options", // Toggle advanced controls. Default: false
          key: "advanced.show",
          type: "advanced"
        },
        {
          title: "Service (optional)",
          type: "services",
          description: "Optionally, an internal or external Service can be defined to map an incoming Port to a target Port seen by the container.",
          reference: "http://kubernetes.io/docs/user-guide/services/"
        },
        {
          title: "Labels",
          key: "spec.template.metadata.labels",
          type: "labels",
          description: "Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Image Pull Secret (optional)",
          key: "spec.jobTemplate.spec.template.spec.imagePullSecrets",
          imagePullPolicy: "spec.jobTemplate.spec.template.spec.containers[0].imagePullPolicy",
          type: "secrets",
          description: "The specified image could require a pull secret credential if it is private. You may choose an existing secret or create a new one.",
          reference: "http://kubernetes.io/docs/user-guide/secrets/"
        },
        {
          title: "CPU (cores)",
          key: "spec.jobTemplate.spec.template.spec.containers[0].resources.requests.cpu",
          sub: "spec.jobTemplate.spec.template.spec.containers[0].resources.limits.cpu",
          type: "slider",
          range: {
            calculated: true,
            source: "limitranges",
            resource: "cpu",
            type: "Container",
            min: 0,
            max: 8, // needs to be max available CPU for current namespace
            step: 0.25,
            default: 0.3
          },
          description: "Minimum CPU requirement for the container.",
          reference: "http://kubernetes.io/docs/admin/limitrange/"
        },
        {
          title: "Memory (MiB)",
          key: "spec.jobTemplate.spec.template.spec.containers[0].resources.requests.memory",
          sub: "spec.jobTemplate.spec.template.spec.containers[0].resources.limits.memory",
          type: "slider",
          range: {
            calculated: true,
            source: "limitranges",
            resource: "memory",
            type: "Container",
            min: 0,
            max: 3.221e+10, // needs to be max available mem for current namespace
            step: 250e+3,
            default: 2.097e+8,
            modifier: true
          },
          description: "Minimum memory requirement for the container.",
          reference: "http://kubernetes.io/docs/admin/limitrange/"
        },
        {
          volumeName: "spec.template.spec.containers[0].volumeMounts[0].name",
          title: "Volume Claim (optional)",
          key: "spec.jobTemplate.spec.template.spec.volumes[0].persistentVolumeClaim.claimName",
          claimName: "spec.jobTemplate.spec.template.spec.volumes[0].name",
          volumeName: "spec.jobTemplate.spec.template.spec.containers[0].volumeMounts[0].name",
          type: "persistentVolumeClaim",
          description: "A persistent volume claim that will be used as storage for the pod.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
        {
          title: "Volume Mount Path",
          key: "spec.jobTemplate.spec.template.spec.containers[0].volumeMounts[0].mountPath",
          type: "text",
          description: "The mount path for the volume claim selected above. Will default to /tmp.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
        {
          title: "Run as privileged (optional)",
          key: "spec.jobTemplate.spec.template.spec.containers[0].securityContext.privileged",
          type: "checkbox",
          description: "Processes in privileged containers are equivalent to processes running as root on the host.",
          reference: "http://kubernetes.io/docs/user-guide/pods/#privileged-mode-for-pod-containers"
        },
        {
          title: "Environment variables (optional)",
          key: "spec.jobTemplate.spec.template.spec.containers[0].env",
          type: "variables",
          description: "Environment variables available for use in the container. Values can reference other variables using $(VAR_NAME) syntax.",
          reference: "http://kubernetes.io/docs/user-guide/configuring-containers/#environment-variables-and-variable-expansion"
        }
      ]
    },
    "customresourcedefinitions": {
      "kind": "CustomResourceDefinition",
      "apiVersion": "apiextensions.k8s.io/v1",
      "metadata": {
        "name": "",
        "labels": {},
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "daemonsets": {
      "kind": "DaemonSet",
      "apiVersion": "apps/v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "daemonset-simple": {
      "manifest": {
        "kind": "DaemonSet",
        "apiVersion": "apps/v1",
        "metadata": {
          "name": "",
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {
          "template": {
            "metadata": {
              "labels": {
                "created-by": `${email}`
              }
            },
            "spec": {
              "imagePullSecrets": [],
              "nodeSelector": {},
              "containers": [
                {
                  "name": "",
                  "image": "",
                  "imagePullPolicy": "IfNotPresent",
                  "command": [],
                  "args": [],
                  "env": [],
                  "securityContext": {
                    "privileged": false
                  },
                  "volumeMounts": [
                    {
                      "mountPath": "",
                      "name": ""
                    }
                  ]
                }
              ],
            }
          }
        }
      },
      deps: [],
      exData: [
        {
          endpoint: "services"
        },
        {
          endpoint: "secrets"
        },
        {
          endpoint: "limitranges"
        },
        {
          endpoint: "resourcequotas"
        },
        {
          endpoint: "persistentvolumes"
        },
        {
          endpoint: "persistentvolumeclaims"
        },
        {
          endpoint: "storageclasses"
        }
      ],
      form: [
        {
          title: "Name",
          key: "metadata.name",
          sub: "spec.template.spec.containers[0].name",
          label: "spec.template.metadata.labels.app",
          source: "name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "App name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for this Daemon Set. A label with the name will be added to the Daemon Set and Service, if any.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Container Image",
          key: "spec.template.spec.containers[0].image",
          label: "spec.template.metadata.labels.version",
          type: "text",
          test: /^[a-z-][a-z0-9-:\/\.]{0,100}$/,
          errorMsg: "Image name must start with a letter and contain only letters, numbers, and '-'.",
          source: "image",
          description: "The URL of a public Docker container image on any registry, or a private image (commonly hosted on the Google Container Registry or Docker Hub). The container image specification must end with a colon.",
          reference: "http://kubernetes.io/docs/user-guide/images/"
        },
        {
          title: "Service (optional)",
          type: "services",
          description: "Optionally, an internal or external Service can be defined to map an incoming Port to a target Port seen by the container.",
          reference: "http://kubernetes.io/docs/user-guide/services/"
        },
        {
          title: "Labels",
          key: "spec.template.metadata.labels",
          type: "labels",
          description: "Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Selectors",
          key: "spec.selector.matchLabels",
          type: "selectors",
          description: "You use label selectors to specify the Pods to which a given Pod Preset applies.",
          reference: "https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors"
        },
        {
          title: "Node Selectors",
          key: "spec.template.spec.nodeSelector",
          type: "labels",
          description: "You can constrain a pod to only be able to run on particular nodes or to prefer to run on particular nodes. This is done by using labels that exist on the desired nodes.",
          reference: "https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#nodeselector"
        },
        {
          title: "Show advanced options", // Toggle advanced controls. Default: false
          key: "advanced.show",
          type: "advanced"
        },
        {
          title: "Image Pull Secret (optional)",
          key: "spec.template.spec.imagePullSecrets",
          imagePullPolicy: "spec.template.spec.containers[0].imagePullPolicy",
          type: "secrets",
          description: "The specified image could require a pull secret credential if it is private. You may choose an existing secret or create a new one.",
          reference: "http://kubernetes.io/docs/user-guide/secrets/"
        },
        {
          title: "CPU (cores)",
          key: "spec.template.spec.containers[0].resources.requests.cpu",
          sub: "spec.template.spec.containers[0].resources.limits.cpu",
          type: "slider",
          range: {
            calculated: true,
            source: "limitranges",
            resource: "cpu",
            type: "Container",
            min: 0,
            max: 8, // needs to be max available CPU for current namespace
            step: 0.25,
            default: 0.3
          },
          description: "Minimum CPU requirement for the container.",
          reference: "http://kubernetes.io/docs/admin/limitrange/"
        },
        {
          title: "Memory (MiB)",
          key: "spec.template.spec.containers[0].resources.requests.memory",
          sub: "spec.template.spec.containers[0].resources.limits.memory",
          type: "slider",
          range: {
            calculated: true,
            source: "limitranges",
            resource: "memory",
            type: "Container",
            min: 0,
            max: 3.221e+10, // needs to be max available mem for current namespace
            step: 250e+3,
            default: 2.097e+8,
            modifier: true
          },
          description: "Minimum memory requirement for the container.",
          reference: "http://kubernetes.io/docs/admin/limitrange/"
        },
        {
          title: "Volume Claim (optional)",
          key: "spec.template.spec.volumes[0].persistentVolumeClaim.claimName",
          claimName: "spec.template.spec.volumes[0].name",
          volumeName: "spec.template.spec.containers[0].volumeMounts[0].name",
          type: "persistentVolumeClaim",
          description: "A persistent volume claim that will be used as storage for the pod.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
        {
          title: "Volume Mount Path",
          key: "spec.template.spec.containers[0].volumeMounts[0].mountPath",
          type: "text",
          description: "The mount path for the volume claim selected above. Will default to /tmp.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
        {
          title: "Run command (optional)",
          key: "spec.template.spec.containers[0].command",
          type: "text",
          description: "By default, your containers run the selected images default entrypoint command. You can use the command options to override the default.",
          reference: "http://kubernetes.io/docs/user-guide/containers/"
        },
        {
          title: "Run command arguments (optional)",
          key: "spec.template.spec.containers[0].args",
          type: "text",
          description: "Arguments to pass to the command entered above"
        },
        {
          title: "Run as privileged (optional)",
          key: "spec.template.spec.containers[0].securityContext.privileged",
          type: "checkbox",
          description: "Processes in privileged containers are equivalent to processes running as root on the host.",
          reference: "http://kubernetes.io/docs/user-guide/pods/#privileged-mode-for-pod-containers"
        },
        {
          title: "Environment variables (optional)",
          key: "spec.template.spec.containers[0].env",
          type: "variables",
          description: "Environment variables available for use in the container. Values can reference other variables using $(VAR_NAME) syntax.",
          reference: "http://kubernetes.io/docs/user-guide/configuring-containers/#environment-variables-and-variable-expansion"
        }
      ]
    },
    "deployments": {
      "kind": "Deployment",
      "apiVersion": "apps/v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": "",
          "version": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "deployment-simple": {
      "manifest": {
        "kind": "Deployment",
        "apiVersion": "apps/v1",
        "metadata": {
          "name": "",
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {
          "replicas": 1,
          "template": {
            "metadata": {
              "labels": {
                "created-by": `${email}`
              }
            },
            "spec": {
              "imagePullSecrets": [],
              "nodeSelector": {},
              "containers": [
                {
                  "name": "",
                  "image": "",
                  "imagePullPolicy": "IfNotPresent",
                  "command": [],
                  "args": [],
                  "env": [],
                  "securityContext": {
                    "privileged": false
                  },
                  "volumeMounts": [
                    {
                      "mountPath": "",
                      "name": ""
                    }
                  ]
                }
              ],
            }
          }
        }
      },
      deps: [],
      exData: [
        {
          endpoint: "limitranges"
        },
        {
          endpoint: "persistentvolumeclaims",
        },
        {
          endpoint: "persistentvolumes",
        },
        {
          endpoint: "resourcequotas",
        },
        {
          endpoint: "secrets"
        },
        {
          endpoint: "services"
        },
        {
          endpoint: "storageclasses"
        }
      ],
      form: [
        {
          title: "App Name",
          key: "metadata.name",
          sub: "spec.template.spec.containers[0].name",
          label: "spec.template.metadata.labels.app",
          source: "name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "App name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for your application. A label with the name will be added to the Deployment and Service, if any, that will be deployed.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Container Image",
          key: "spec.template.spec.containers[0].image",
          label: "spec.template.metadata.labels.version",
          type: "auto-text",
          test: /^[a-z-][a-z0-9-:\/\._]{0,100}$/,
          errorMsg: "Image names must start with a letter and contain only letters, numbers, slashes, dashes, or underscores.",
          source: "image",
          description: "The URL of a public Docker container image on any registry, or a private image (commonly hosted on the Google Container Registry or Docker Hub). The container image specification must end with a colon.",
          reference: "http://kubernetes.io/docs/user-guide/images/"
        },
        {
          title: "Number of pods",
          key: "spec.replicas",
          type: "slider",
          range: {
            calculated: true,
            source: "resourcequotas",
            resource: "pods",
            min: 0,
            max: 50,
            step: 1,
            default: 1
          },
          description: "A Deployment will be created to maintain the desired number of pods across your cluster.",
          errorMsg: "You have exhausted available resources. You will need to remove any unused deployments or pods to continue.",
          reference: "http://kubernetes.io/docs/user-guide/replication-controller/"
        },
        {
          title: "Service (optional)",
          key: "spec.template.metadata.labels.app",
          type: "services",
          description: "Optionally, an internal or external Service can be defined to map an incoming Port to a target Port seen by the container.",
          reference: "http://kubernetes.io/docs/user-guide/services/"
        },
        {
          title: "Labels",
          key: "spec.template.metadata.labels",
          type: "labels",
          description: "Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Selectors",
          key: "spec.selector.matchLabels",
          type: "selectors",
          description: "You use label selectors to specify the Pods to which a given Pod Preset applies.",
          reference: "https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors"
        },
        {
          title: "Node Selectors",
          key: "spec.template.spec.nodeSelector",
          type: "labels",
          description: "You can constrain a pod to only be able to run on particular nodes or to prefer to run on particular nodes. This is done by using labels that exist on the desired nodes.",
          reference: "https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#nodeselector"
        },
        {
          title: "Show advanced options", // Toggle advanced controls. Default: false
          key: "advanced.show",
          type: "advanced"
        },
        {
          title: "Image Pull Secret (optional)",
          key: "spec.template.spec.imagePullSecrets",
          imagePullPolicy: "spec.template.spec.containers[0].imagePullPolicy",
          type: "secrets",
          description: "The specified image could require a pull secret credential if it is private. You may choose an existing secret or create a new one.",
          reference: "http://kubernetes.io/docs/user-guide/secrets/"
        },
        {
          title: "CPU (cores)",
          key: "spec.template.spec.containers[0].resources.requests.cpu",
          sub: "spec.template.spec.containers[0].resources.limits.cpu",
          type: "slider",
          range: {
            calculated: true,
            source: "limitranges",
            resource: "cpu",
            type: "Container",
            min: 0,
            max: 8, // needs to be max available CPU for current namespace
            step: 0.25,
            default: 0.3
          },
          description: "Minimum CPU requirement for the container.",
          reference: "http://kubernetes.io/docs/admin/limitrange/"
        },
        {
          title: "Memory (MiB)",
          key: "spec.template.spec.containers[0].resources.requests.memory",
          sub: "spec.template.spec.containers[0].resources.limits.memory",
          type: "slider",
          range: {
            calculated: true,
            source: "limitranges",
            resource: "memory",
            type: "Container",
            min: 0,
            max: 3.221e+10, // needs to be max available mem for current namespace
            step: 250e+3,
            default: 2.097e+8,
            modifier: true
          },
          description: "Minimum memory requirement for the container.",
          reference: "http://kubernetes.io/docs/admin/limitrange/"
        },
        {
          title: "Volume Claim (optional)",
          key: "spec.template.spec.volumes[0].persistentVolumeClaim.claimName",
          claimName: "spec.template.spec.volumes[0].name",
          volumeName: "spec.template.spec.containers[0].volumeMounts[0].name",
          type: "persistentVolumeClaim",
          description: "A persistent volume claim that will be used as storage for the pod.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
        {
          title: "Volume Mount Path",
          key: "spec.template.spec.containers[0].volumeMounts[0].mountPath",
          type: "text",
          description: "The mount path for the volume claim selected above. Will default to /tmp.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
        {
          title: "Run command (optional)",
          key: "spec.template.spec.containers[0].command",
          type: "text",
          description: "By default, your containers run the selected images default entrypoint command. You can use the command options to override the default.",
          reference: "http://kubernetes.io/docs/user-guide/containers/"
        },
        {
          title: "Run command arguments (optional)",
          key: "spec.template.spec.containers[0].args",
          type: "text",
          description: "Arguments to pass to the command entered above"
        },
        {
          title: "Run as privileged (optional)",
          key: "spec.template.spec.containers[0].securityContext.privileged",
          type: "checkbox",
          description: "Processes in privileged containers are equivalent to processes running as root on the host.",
          reference: "http://kubernetes.io/docs/user-guide/pods/#privileged-mode-for-pod-containers"
        },
        {
          title: "Environment variables (optional)",
          key: "spec.template.spec.containers[0].env",
          type: "variables",
          description: "Environment variables available for use in the container. Values can reference other variables using $(VAR_NAME) syntax.",
          reference: "http://kubernetes.io/docs/user-guide/configuring-containers/#environment-variables-and-variable-expansion"
        }
      ]
    },
    "endpoints": {
      "kind": "Endpoints",
      "apiVersion": "v1",
      "metadata": {
        "name": "my-service"
      },
      "subsets": [
        {
          "addresses": [
            {
              "ip": "192.0.2.42"
            }
          ],
          "ports": [
            {
              "port": 9376
            }
          ]
        }
      ]
    },
    "horizontalpodautoscalers": {
      "apiVersion": "autoscaling/v2beta2",
      "kind": "HorizontalPodAutoscaler",
      "metadata": {
        "name": "",
        "labels": {
          "created-by": `${email}`
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {
        "scaleTargetRef": {
          "apiVersion": "apps/v1",
          "kind": "",
          "name": ""
        },
        "minReplicas": 1,
        "maxReplicas": 10,
        "metrics": [
          {
            "type": "Resource",
            "resource": {
              "name": "cpu",
              "target": {
                "type": "Utilization",
                "averageUtilization": 50
              }
            }
          }
        ]
      },
      "status": {
        "observedGeneration": 1,
        "lastScaleTime": "",
        "currentReplicas": 1,
        "desiredReplicas": 1,
        "currentMetrics": [
          {
            "type": "Resource",
            "resource": {
              "name": "cpu",
              "current": {
                "averageUtilization": 0,
                "averageValue": 0
              }
            }
          }
        ]
      }
    },
    "ingresses": {
      "kind": "Ingress",
      "apiVersion": "networking.k8s.io/v1beta1",
      "metadata": {
        "name": "",
        "labels": {
          "created-by": `${email}`
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "ingresses-simple": {
      "manifest": {
        "kind": "Ingress",
        "apiVersion": "networking.k8s.io/v1beta1",
        "metadata": {
          "name": "",
          "labels": {
            "created-by": `${email}`
          },
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {}
      },
      form: [
        {
          title: "Ingress Name",
          key: "metadata.name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "Name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for your ingress resource.",
          reference: "https://kubernetes.io/docs/user-guide/ingress/"
        },
        {
          title: "Labels",
          key: "metadata.labels",
          type: "labels",
          description: "Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
      ]
    },
    "jobs": {
      "kind": "Job",
      "apiVersion": "batch/v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "limitranges": {
      "apiVersion": "v1",
      "kind": "LimitRange",
      "metadata": {
        "name": "limit-mem-cpu-per-container",
        "labels": {
          "created-by": `${email}`
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {
        "limits": [
          {
            "max": {
              "cpu": "800m",
              "memory": "1Gi"
            },
            "min": {
              "cpu": "100m",
              "memory": "99Mi"
            },
            "default": {
              "cpu": "700m",
              "memory": "900Mi"
            },
            "defaultRequest": {
              "cpu": "110m",
              "memory": "111Mi"
            },
            "type": "Container"
          }
        ]
      }
    },
    "limitranges-simple": {
      "manifest": {
        "kind": "Limit Range",
        "apiVersion": "v1",
        "metadata": {
          "name": "",
          "labels": {
            "created-by": `${email}`
          },
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {
          "limits": [{
            "type": "Container"
          }]
        }
      },
      deps: [],
      form: [
        {
          title: "Limit Range Name",
          key: "metadata.name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          description: "The name of a Limit Range must be a valid DNS subdomain name.",
          reference: "https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-subdomain-names"
        },
        {
          title: "Min CPU Constraints",
          key: "spec.limits[0].min.cpu",
          type: "slider",
          range: {
            calculated: true,
            min: 0,
            max: 10,
            step: 0.25,
            default: 0
          },
          description: "Minimum CPU limit values used by Containers and Pods in a Namespace.",
          reference: "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-constraint-namespace/"
        },
        {
          title: "Max CPU Constraints",
          key: "spec.limits[0].max.cpu",
          type: "slider",
          range: {
            calculated: true,
            min: 0,
            max: 10,
            step: 0.25,
            default: 0
          },
          description: "Maximum CPU limit values used by Containers and Pods in a Namespace.",
          reference: "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-constraint-namespace/"
        },
        {
          title: "Min Memory",
          key: "spec.limits[0].min.memory",
          type: "slider",
          range: {
            calculated: true,
            min: 0,
            max: 3.221e+10,
            step: 250e+3,
            default: 0,
            modifier: true
          },
          description: "Minimum memory limit values used by Containers running in a Namespace.",
          reference: "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-constraint-namespace/"
        },
        {
          title: "Max Memory",
          key: "spec.limits[0].max.memory",
          type: "slider",
          range: {
            min: 0,
            max: 3.221e+10,
            step: 250e+3,
            default: 0,
            modifier: true,
          },
          description: "Maximum memory limit values used by Containers running in a Namespace.",
          reference: "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-constraint-namespace/"
        },
      ]
    },
    "machineconfigs-simple": {
      "manifest": {
        "kind": "Config",
        "apiVersion": "machine.crit.sh/v1alpha1",
        "metadata": {
          "name": "",
          "labels": {
            "created-by": `${email}`
          },
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {
          "config": `apiVersion: crit.sh/v1alpha2
kind: WorkerConfiguration`,
        },
      },
      deps: [],
      exData: [],
      form: [
        {
          title: "Config Name",
          key: "metadata.name",
          source: "name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "Name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for your worker config.",
        },
        {
          title: "Config",
          key: "spec.config",
          type: "textarea",
          description: "Worker Configuration",
          reference: "https://docs.crit.sh/crit-guide/configuration.html"
        },
        {
          title: "Show advanced options", // Toggle advanced controls. Default: false
          key: "advanced.show",
          type: "advanced"
        },
        {
          title: "Labels",
          key: "spec.template.metadata.labels",
          type: "labels",
          description: "Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
      ]
    },
    "namespaces": {
      "kind": "Namespace",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "created-by": `${email}`
        },
        "annotations": {
          "created-by": `${email}`
        }
      }
    },
    "namespaces-simple": {
      "manifest": {
        "kind": "Namespace",
        "apiVersion": "v1",
        "metadata": {
          "name": "",
          "labels": {
            "created-by": `${email}`
          },
          "annotations": {
            "created-by": `${email}`
          }
        }
      },
      form: [
        {
          title: "Namespace Name",
          key: "metadata.name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "Name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for your new namespace",
          reference: "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/"
        },
        {
          title: "Labels",
          key: "metadata.labels",
          type: "labels",
          description: "Labels are key/value pairs that are attached to objects. Labels are intended to be used to specify identifying attributes of objects that are meaningful and relevant to users, but do not directly imply semantics to the core system.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
      ]
    },
    "networkpolicies": {
      "apiVersion": "networking.k8s.io/v1",
      "kind": "NetworkPolicy",
      "metadata": {
        "name": "test-network-policy",
        "namespace": "default"
      },
      "spec": {
        "podSelector": {
          "matchLabels": {
            "role": "db"
          }
        },
        "policyTypes": [
          "Ingress",
          "Egress"
        ],
        "ingress": [
          {
            "from": [
              {
                "ipBlock": {
                  "cidr": "172.17.0.0/16",
                  "except": [
                    "172.17.1.0/24"
                  ]
                }
              },
              {
                "namespaceSelector": {
                  "matchLabels": {
                    "project": "myproject"
                  }
                }
              },
              {
                "podSelector": {
                  "matchLabels": {
                    "role": "frontend"
                  }
                }
              }
            ],
            "ports": [
              {
                "protocol": "TCP",
                "port": 6379
              }
            ]
          }
        ],
        "egress": [
          {
            "to": [
              {
                "ipBlock": {
                  "cidr": "10.0.0.0/24"
                }
              }
            ],
            "ports": [
              {
                "protocol": "TCP",
                "port": 5978
              }
            ]
          }
        ]
      }
    },
    "persistentvolumes": {
      "kind": "PersistentVolume",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "persistentvolumeclaims": {
      "kind": "PersistentVolumeClaim",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {}
      },
      "spec": {}
    },
    "pods": {
      "kind": "Pod",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": "",
          "version": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {
        "containers": [
          {
            "name": "",
            "image": "",
            "command": [],
            "args": [],
            "env": [
              {
                "name": "",
                "value": ""
              }
            ],
            "imagePullPolicy": "",
            "ports": [
              {
                "containerPort": 0,
                "name": "",
                "protocol": ""
              }
            ],
            "resources": {
              "requests": {
                "cpu": "300m",
                "memory": "50Mi"
              },
              "limits": {
                "cpu": "300m",
                "memory": "50Mi"
              }
            }
          }
        ],
        "restartPolicy": "",
        "volumes": [
          {
            "name": "",
            "emptyDir": {
              "medium": ""
            },
            "secret": {
              "secretName": ""
            }
          }
        ]
      }
    },
    "podpreset-simple": {
      "manifest": {
        "kind": "PodPreset",
        "apiVersion": "settings.k8s.io/v1alpha1",
        "metadata": {
          "name": "",
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {
          "selector": {
            "matchLabels": {}
          },
          "volumeMounts": [
            {
              "mountPath": "",
              "name": ""
            }
          ],
          "volumes": []
        }
      },
      deps: [],
      exData: [
        {
          endpoint: "configmaps"
        },
        {
          endpoint: "limitranges"
        },
        {
          endpoint: "persistentvolumeclaims",
        },
        {
          endpoint: "persistentvolumes",
        },
        {
          endpoint: "resourcequotas",
        },
        {
          endpoint: "secrets"
        },
        {
          endpoint: "services"
        },
        {
          endpoint: "storageclasses"
        }
      ],
      form: [
        {
          title: "Name",
          key: "metadata.name",
          label: "metadata.labels.pod-preset",
          source: "name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "Name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for the Pod Preset.",
          reference: "https://kubernetes.io/docs/tasks/inject-data-application/podpreset/"
        },
        {
          title: "Selectors",
          key: "spec.selector.matchLabels",
          type: "selectors",
          description: "You use label selectors to specify the Pods to which a given Pod Preset applies.",
          reference: "https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors"
        },
        {
          title: "Config Map (optional)",
          key: "spec.envFrom[0].configMapRef.name",
          type: "configMap",
          description: "Apply settings from an existing Config Map or create a new one. The ConfigMap API resource provides mechanisms to inject containers with configuration data while keeping containers agnostic of Kubernetes.",
          reference: "https://kubernetes.io/docs/tasks/configure-pod-container/configmap/"
        },
        {
          title: "Environment variables (optional)",
          key: "spec.env",
          type: "variables",
          description: "Environment variables available for use in the container. Values can reference other variables using $(VAR_NAME) syntax.",
          reference: "http://kubernetes.io/docs/user-guide/configuring-containers/#environment-variables-and-variable-expansion"
        },
        {
          title: "Labels",
          key: "metadata.labels",
          type: "labels",
          description: "Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Volume Claim (optional)",
          key: "spec.volumes[0].persistentVolumeClaim.claimName",
          claimName: "spec.volumes[0].name",
          volumeName: "spec.volumeMounts[0].name",
          type: "persistentVolumeClaim",
          description: "A persistent volume claim that will be used as storage for the pod.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
        {
          title: "Volume Mount Path",
          key: "spec.volumeMounts[0].mountPath",
          type: "text",
          description: "The mount path for the volume claim selected above. Will default to /tmp.",
          reference: "https://kubernetes.io/docs/user-guide/persistent-volumes/"
        },
      ]
    },
    "podpresets": {
      "kind": "PodPreset",
      "apiVersion": "settings.k8s.io/v1alpha1",
      "metadata": {
        "name": "allow-database",
        "namespace": "myns"
      },
      "spec": {
        "selector": {
          "matchLabels": {
            "role": "frontend"
          }
        },
        "env": [],
        "volumeMounts": [],
        "volumes": [],
      }
    },
    "podsecuritypolicies": {
      "apiVersion": "policy/v1beta1",
      "kind": "PodSecurityPolicy",
      "metadata": {
        "name": "permissive"
      },
      "spec": {
        "seLinux": {
          "rule": "RunAsAny"
        },
        "supplementalGroups": {
          "rule": "RunAsAny"
        },
        "runAsUser": {
          "rule": "RunAsAny"
        },
        "fsGroup": {
          "rule": "RunAsAny"
        },
        "hostPorts": [
          {
            "min": 8000,
            "max": 8080
          }
        ],
        "volumes": [
          "*"
        ]
      }
    },
    "replicasets": {
      "apiVersion": "apps/v1",
      "kind": "ReplicaSet",
      "metadata": {
        "name": "frontend",
        "labels": {
          "created-by": `${email}`,
          "app": "guestbook",
          "tier": "frontend"
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {
        "replicas": 3,
        "selector": {
          "matchLabels": {
            "tier": "frontend"
          }
        },
        "template": {
          "metadata": {
            "labels": {
              "tier": "frontend"
            }
          },
          "spec": {
            "containers": [
              {
                "name": "php-redis",
                "image": "gcr.io/google_samples/gb-frontend:v3"
              }
            ]
          }
        }
      }
    },
    "replicationcontrollers": {
      "kind": "ReplicationController",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "resourcequotas": {
      "kind": "ResourceQuota",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "created-by": `${email}`
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {
        "hard": {
          "configmaps": "4",
          "persistentvolumeclaims": "2",
          "pods": "2",
          "requests.storage": "10Gi",
          "resourcequotas": "5",
          "secrets": "4",
          "services": "2",
          "services.loadbalancers": "2",
          "services.nodeports": "2",
          "requests.cpu": "1",
          "requests.memory": "1Gi",
          "limits.cpu": "2",
          "limits.memory": "2Gi",
          "requests.nvidia.com/gpu": 4
        }
      }
    },
    "resourcequotas-simple": {
      "manifest": {
        "kind": "ResourceQuota",
        "apiVersion": "v1",
        "metadata": {
          "name": "",
          "labels": {
            "created-by": `${email}`
          },
          "annotations": {
            "created-by": `${email}`
          }
        },
        "spec": {
        }
      },
      deps: [],
      form: [
        {
          title: "Resource Quota Name",
          key: "metadata.name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          description: "The name of a Resource Quota must be a valid DNS subdomain name.",
          reference: "https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-subdomain-names"
        },
        {
          title: "CPU requests",
          key: "spec.hard.[\"requests.cpu\"]",
          sub: "spec.hard.[\"limits.cpu\"]",
          type: "slider",
          range: {
            calculated: true,
            min: 0,
            max: 8,
            step: 0.25,
            default: 0
          },
          description: "CPU request quota for a Namespace.",
          reference: "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/"
        },
        {
          title: "Memory (MiB)",
          key: "spec.hard.[\"requests.memory\"]",
          type: "slider",
          range: {
            min: 0,
            max: 3.221e+10,
            step: 250e+3,
            default: 0,
            modifier: true,
          },
          description: "Memory request quota for a Namespace.",
          reference: "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/"
        },
        {
          title: "Number of pods",
          key: "spec.hard.pods",
          type: "slider",
          range: {
            min: 0,
            max: 50,
            step: 1,
            default: 0
          },
          description: "Pod quota for a Namespace.",
          reference: "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-pod-namespace/"
        },
        {
          title: "Show advanced options", // Toggle advanced controls. Default: false
          key: "advanced.show",
          type: "advanced"
        },
        {
          title: "Persistent volume claims",
          key: "spec.hard.persistentvolumeclaims",
          type: "slider",
          range: {
            min: 0,
            max: 20,
            step: 1,
            default: 0
          },
          description: "Number of persistent volume claims for a Namespace.",
          reference: "https://kubernetes.io/docs/concepts/storage/#persistentvolumeclaim"
        },
        {
          title: "Config Maps",
          key: "spec.hard.configmaps",
          type: "slider",
          range: {
            min: 0,
            max: 50,
            step: 1,
            default: 0
          },
          description: "Number of config maps for a Namespace.",
          reference: "https://kubernetes.io/docs/concepts/configuration/configmap/"
        },
        {
          title: "Services",
          key: "spec.hard.services",
          type: "slider",
          range: {
            min: 0,
            max: 30,
            step: 1,
            default: 0
          },
          description: "Number of services for a Namespace.",
          reference: "https://kubernetes.io/docs/concepts/services-networking/service/#service-resource"
        },
        {
          title: "Service Type: Load Balancers",
          key: "spec.hard.[\"services.loadbalancers\"]",
          type: "slider",
          range: {
            min: 0,
            max: 10,
            step: 1,
            default: 0
          },
          description: "Number of load balancers for a Namespace.",
          reference: "https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer"
        },
        {
          title: "Service Type: Node Ports",
          key: "spec.hard.[\"services.nodeports\"]",
          type: "slider",
          range: {
            min: 0,
            max: 10,
            step: 1,
            default: 0
          },
          description: "Number of node ports for a Namespace.",
          reference: "https://kubernetes.io/docs/concepts/services-networking/service/#nodeport"
        },
        {
          title: "Secrets",
          key: "spec.hard.secrets",
          type: "slider",
          range: {
            min: 0,
            max: 100,
            step: 1,
            default: 0
          },
          description: "Number of secrets for a Namespace.",
          reference: "https://kubernetes.io/docs/concepts/configuration/secret/"
        }
      ],
    },
    "roles": {
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "Role",
      "metadata": {
        "namespace": "default",
        "name": "pod-reader"
      },
      "rules": [
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "pods"
          ],
          "verbs": [
            "get",
            "watch",
            "list"
          ]
        }
      ]
    },
    "rolebindings": {
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "RoleBinding",
      "metadata": {
        "name": "read-pods",
        "namespace": "default"
      },
      "subjects": [
        {
          "kind": "User",
          "name": "jane",
          "apiGroup": "rbac.authorization.k8s.io"
        }
      ],
      "roleRef": {
        "kind": "Role",
        "name": "pod-reader",
        "apiGroup": "rbac.authorization.k8s.io"
      }
    },
    "secrets": {
      "kind": "Secret",
      "apiVersion": "v1",
      "metadata": {
        "name": "mysecret"
      },
      "type": "Opaque",
      "stringData": {
        "config.yaml": "apiUrl: \"https://my.api.com/api/v1\"\nusername: {{username}}\npassword: {{password}}"
      }
    },
    "services": {
      "kind": "Service",
      "apiVersion": "v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {
        "ports": [],
        "type": "None"
      }
    },
    "sources.marketplace.criticalstack.com": {
      "kind": "Source",
      "apiVersion": "marketplace.criticalstack.com/v1alpha2",
      "metadata": {
        "name": "",
        "labels": {
          "created-by": `${email}`
        },
      },
      "spec": {
        "url": "",
        "username": "",
        "password": "",
      }
    },
    "stackapps": {
      "kind": "StackApp",
      "metadata": {
        "name": "",
        "labels": {
          "created-by": `${email}`
        },
        "annotations": {
          "created-by": `${email}`
        }
      }
    },
    "stackapp-simple": {
      "manifest": {
        "name": "",
        "labels": {
          "created-by": `${email}`
        },
        "annotations": {
          "created-by": `${email}`
        },
        "version": "1",
        "signingKeys": [],
        "resources": []
      },
      exData: [
        {
          key: "resources",
          endpoint: "resources",
          resUrl: false,
          query: {
            for: "stackapp"
          }
        },
        {
          key: "secrets",
          endpoint: "secrets?namespace=stackapps-system",
          query: {
            fieldSelector: "type=features.criticalstack.com/signing-key"
          },
          absolute: true
        }
      ],
      form: [
        {
          title: "StackApp Name",
          key: "name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "Name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "The name of your new StackApp"
        },
        {
          title: "Version",
          key: "version",
          type: "text",
          test: /^[0-9\.]{0,24}$/,
          default: "1",
          errorMsg: "Must be a number",
          description: "The major version of your StackApp"
        },
        {
          title: "Labels",
          key: "labels",
          type: "labels",
          description: "Labels are key/value pairs that are attached to objects. Labels are intended to be used to specify identifying attributes of objects that are meaningful and relevant to users, but do not directly imply semantics to the core system.",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Signing Keys",
          key: "signingKeys",
          type: "select-multiple",
          source: "secrets",
          placeholder: "Select signing keys (optional)",
          description: "Additional signing keys used to sign the StackApp content during creation. If none are selected, a default key will be generated and selected for the current user.",
          reference: "https://criticalstack.github.io/stackapps/stackapps-guide/technicaloverview.html",
        },
        {
          key: "resources",
          type: "transfer",
          description: "Select the resources that will comprise this StackApp",
          secondaryText: "Select the resources within the left pane and click the right arrow to transfer them into the right pane. When you are satisfied with your selection, click the create button. Some resources are excluded by default as they are not likely candidates for a StackApp. If you really know what your are doing, click the checkbox below to access them.",
          stacked: true
        }
      ]
    },
    "statefulsets": {
      "kind": "StatefulSet",
      "apiVersion": "apps/v1",
      "metadata": {
        "name": "",
        "labels": {
          "name": ""
        },
        "annotations": {
          "created-by": `${email}`
        }
      },
      "spec": {}
    },
    "storageclasses": {
      "kind": "StorageClass",
      "apiVersion": "storage.k8s.io/v1",
      "metadata": {
        "name": "",
        "annotations": {
          "created-by": `${email}`
        }
      },
      "provisioner": "",
      "parameters": {}
    },
    "trace-simple": {
      "manifest": {
        "kind": "Trace",
        "apiVersion": "tools.swoll.criticalstack.com/v1alpha1",
        "metadata": {
          "name": "",
        },
        "spec": {
          "syscalls": [],
          "labelSelector": {
          },
          "fieldSelector": {
          },
          "hostSelector": []
        }
      },
      exData: [
        {
          key: "pods",
          endpoint: "pods"
        }
      ],
      form: [
        {
          title: "Trace Name",
          key: "metadata.name",
          type: "text",
          test: /^[a-z-][a-z0-9-]{0,24}$/,
          errorMsg: "Name must start with a lowercase letter and contain only lowercase letters, numbers, and '-' between words. It can be no longer than 24 characters.",
          description: "Name for your new trace",
          reference: "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/"
        },
        {
          title: "syscalls",
          key: "spec.syscalls",
          type: "select-multiple",
          source: "hard-coded",
          data: syscalls,
          placeholder: "Select syscalls",
          description: "A list of system-calls in which to monitor",
          reference: "https://criticalstack.github.io/stackapps/stackapps-guide/technicaloverview.html",
        },
        {
          title: "Label Selectors",
          key: "spec.labelSelector.matchLabels",
          type: "labels",
          description: "Matches containers within pods that match these labels",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        {
          title: "Field Selectors",
          key: "spec.fieldSelector.matchLabels",
          type: "labels",
          description: "Matches containers within pods that match these labels",
          reference: "http://kubernetes.io/docs/user-guide/labels/"
        },
        // {
          // title: "Host Selector",
          // key: "spec.hostSelector",
          // type: "host-selector",
          // description: "Match specific hostnames (not really the best idea)",
          // reference: "http://kubernetes.io/docs/user-guide/configuring-containers/#environment-variables-and-variable-expansion"
        // },
        {
          title: "Host Selector",
          key: "spec.hostSelector",
          type: "select-multiple",
          source: "pods",
          path: "spec.containers",
          placeholder: "Select host selectors",
          description: "Match specific hostnames (not really the best idea)",
          reference: "http://kubernetes.io/docs/user-guide/configuring-containers/#environment-variables-and-variable-expansion"
        },
      ]
    }
  };

  return t;
};

export default templates;
