import ConfigMapCreate from "../../lib/datacenter/config-maps/create";
import ConnectorCreate from "../../lib/settings/general/sso/create";
import CronJobCreate from "../../lib/datacenter/cron-jobs/create";
import DaemonSetCreate from "../../lib/datacenter/daemon-sets/create";
import DeploymentCreate from "../../lib/datacenter/deployments/create";
import HorizontalPodAutoscalerCreate from "../../lib/datacenter/horizontal-pod-autoscalers/create";
import IngressCreate from "../../lib/datacenter/ingress/create";
import LimitRangeCreate from "../../lib/datacenter/limit-ranges/create";
import MarketplaceSourceCreate from "../../lib/settings/marketplace/sources/create";
import NamespaceCreate from "../../lib/cluster/namespaces/create";
import NodeWorkerCreate from "../../lib/datacenter/nodes/create";
import PVCStorageClassCreate from "../../lib/datacenter/persistent-volume-claims/sc-create";
import PVCPersistentVolumeCreate from "../../lib/datacenter/persistent-volume-claims/pv-create";
import PodPresetCreate from "../../lib/datacenter/pod-presets/create";
import RBACCreate from "../../lib/cluster/rbac/create";
import ResourceQuotaCreate from "../../lib/datacenter/resource-quotas/create";
import SecretCreate from "../../lib/datacenter/secrets/create";
import ServiceAccountCreate from "../../lib/datacenter/service-accounts/create";
import ServiceCreate from "../../lib/datacenter/services/form";
import StorageClassCreate from "../../lib/datacenter/storage-classes/create";
import StackAppCreate from "../../lib/stackapps/create";
import TraceCreate from "../../lib/swoll/traces/create";
import UserCreate from "../../lib/settings/general/create";

const resourceMetadata = {
  AppRevision: {
    icon: "glyphicons glyphicons-layers",
    route: "apprevisions",
    menu: "stackapps"
  },
  ClusterRole: {
    icon: "glyphicons glyphicons-file-lock",
    doc: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/#clusterrole-example",
    route: "clusterroles",
    wizard: RBACCreate,
    resourceAccess: "clusterroles.rbac.authorization.k8s.io"
  },
  ClusterRoleBinding: {
    icon: "glyphicons glyphicons-paired",
    doc: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/#clusterrolebinding-example",
    route: "clusterrolebindings",
    wizard: RBACCreate,
    resourceAccess: "clusterrolebindings.rbac.authorization.k8s.io"
  },
  ConfigMap: {
    icon: "csicon csicon-config-maps",
    doc: "https://kubernetes.io/docs/user-guide/configmap/",
    route: "configmaps",
    menu: "config-maps",
    wizard: ConfigMapCreate,
    resourceAccess: "configmaps"
  },
  Connector: {
    icon: "glyphicons glyphicons-power-cord-plug",
    route: "connectors",
    path: "sso-provider",
    menu: "connectors",
    wizard: ConnectorCreate,
    resourceAccess: "connectors.dex.coreos.com"
  },
  CronJob: {
    icon: "csicon csicon-cron-jobs",
    doc: "https://kubernetes.io/docs/user-guide/cron-jobs/",
    route: "cronjobs",
    menu: "cron-jobs",
    wizard: CronJobCreate,
    resourceAccess: "cronjobs.batch"
  },
  DaemonSet: {
    icon: "csicon csicon-daemon-sets",
    doc: "https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/",
    route: "daemonsets",
    menu: "daemon-sets",
    wizard: DaemonSetCreate,
    resourceAccess: "daemonsets.apps"
  },
  Deployment: {
    icon: "csicon csicon-deployments",
    doc: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
    route: "deployments",
    menu: "deployments",
    wizard: DeploymentCreate,
    resourceAccess: "deployments.apps"
  },
  Endpoints: {
    icon: "csicon csicon-endpoints",
    doc: "https://kubernetes.io/docs/concepts/services-networking/service/",
    route: "endpoints"
  },
  HorizontalPodAutoscaler: {
    icon: "csicon csicon-autoscale",
    doc: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/",
    route: "horizontalpodautoscalers",
    menu: "horizontal-pod-autoscalers",
    wizard: HorizontalPodAutoscalerCreate,
    resourceAccess: "horizontalpodautoscalers.autoscaling"
  },
  Ingress: {
    icon: "csicon csicon-ingress",
    doc: "https://kubernetes.io/docs/concepts/services-networking/ingress/",
    route: "ingresses",
    menu: "ingress",
    wizard: IngressCreate,
    resourceAccess: "ingresses.extensions"
  },
  Job: {
    icon: "csicon csicon-jobs",
    doc: "https://kubernetes.io/docs/concepts/jobs/run-to-completion-finite-workloads/",
    route: "jobs",
    menu: "jobs"
  },
  LimitRange: {
    icon: "csicon csicon-limit-ranges",
    doc: "https://kubernetes.io/docs/tasks/configure-pod-container/limit-range/",
    route: "limitranges",
    menu: "limit-ranges",
    wizard: LimitRangeCreate,
    resourceAccess: "limitranges"
  },
  MarketplaceSource: {
    icon: "glyphicons glyphicons-folder-cogwheel",
    route: "sources",
    wizard: MarketplaceSourceCreate,
    resourceAccess: "sources.marketplace.criticalstack.com"
  },
  Namespace: {
    icon: "csicon csicon-namespace",
    doc: "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/",
    route: "namespaces",
    wizard: NamespaceCreate,
    resourceAccess: "namespaces"
  },
  NetworkPolicy: {
    icon: "csicon csicon-mp-networking",
    doc: "https://kubernetes.io/docs/concepts/services-networking/network-policies/",
    route: "networkpolicies",
    menu: "network-policies"
  },
  Node: {
    icon: "glyphicons glyphicons-vector-path",
    doc: "https://kubernetes.io/docs/concepts/nodes/node/",
    route: "nodes",
    wizard: NodeWorkerCreate,
    resourceAccess: "nodes"
  },
  PersistentVolume: {
    icon: "csicon csicon-persistent-volumes",
    doc: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/",
    route: "persistentvolumes",
    menu: "persistent-volumes"
  },
  PersistentVolumeClaim: {
    icon: "csicon csicon-persistent-volume-claims",
    doc: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims",
    route: "persistentvolumeclaims",
    menu: "persistent-volume-claims",
  },
  PVCStorageClass: {
    icon: "csicon csicon-persistent-volume-claims",
    doc: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims",
    route: "persistentvolumeclaims",
    menu: "persistent-volume-claims",
    wizard: PVCStorageClassCreate
  },
  PVCPersistentVolume: {
    icon: "csicon csicon-persistent-volume-claims",
    doc: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims",
    route: "persistentvolumeclaims",
    menu: "persistent-volume-claims",
    wizard: PVCPersistentVolumeCreate
  },
  Pod: {
    icon: "csicon csicon-pods",
    doc: "https://kubernetes.io/docs/concepts/workloads/pods/pod/",
    route: "pods",
    menu: "pods"
  },
  PodPreset: {
    icon: "csicon csicon-pod-presets",
    doc: "https://kubernetes.io/docs/tasks/run-application/podpreset/",
    route: "podpresets",
    menu: "pod-presets",
    wizard: PodPresetCreate,
    resourceAccess: "podpresets.settings.k8s.io"
  },
  PodSecurityPolicy: {
    icon: "csicon csicon-pod-security-policies",
    doc: "https://kubernetes.io/docs/concepts/policy/pod-security-policy/",
    route: "podsecuritypolicies",
    menu: "pod-security-policies"
  },
  ReplicaSet: {
    icon: "csicon csicon-replica-sets",
    doc: "https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/",
    route: "replicasets",
    menu: "replica-sets"
  },
  ResourceQuota: {
    icon: "csicon csicon-resource-quotas",
    doc: "https://kubernetes.io/docs/concepts/policy/resource-quotas/",
    route: "resourcequotas",
    menu: "resource-quotas",
    wizard: ResourceQuotaCreate,
    resourceAccess: "resourcequotas"
  },
  Role: {
    icon: "glyphicons glyphicons-file-lock",
    doc: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-example",
    route: "roles",
    wizard: RBACCreate,
    resourceAccess: "roles.rbac.authorization.k8s.io"
  },
  RoleBinding: {
    icon: "glyphicons glyphicons-paired",
    doc: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/#rolebinding-example",
    route: "rolebindings",
    wizard: RBACCreate,
    resourceAccess: "rolebindings.rbac.authorization.k8s.io"
  },
  Secret: {
    icon: "csicon csicon-secrets",
    doc: "https://kubernetes.io/docs/concepts/configuration/secret/",
    route: "secrets",
    menu: "secrets",
    wizard: SecretCreate,
    resourceAccess: "secrets"
  },
  SecretDocker: {
    doc: "https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#registry-secret-existing-credentials"
  },
  Service: {
    icon: "csicon csicon-services",
    doc: "https://kubernetes.io/docs/concepts/services-networking/service/",
    route: "services",
    menu: "services",
    wizard: ServiceCreate.newService,
    resourceAccess: "services"
  },
  ServiceAccount: {
    icon: "csicon csicon-service-accounts",
    doc: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/",
    route: "serviceaccounts",
    menu: "service-accounts",
    wizard: ServiceAccountCreate,
    resourceAccess: "serviceaccounts"
  },
  SigningKey: {
    icon: "glyphicons glyphicons-key",
    route: false
  },
  StackApp: {
    icon: "glyphicons glyphicons-layers",
    route: "stackapps",
    menu: "stackapps",
    wizard: StackAppCreate
  },
  StackValue: {
    icon: "glyphicons glyphicons-layers-cogwheel",
    route: "stackapps",
  },
  StatefulSet: {
    icon: "csicon csicon-stateful-sets",
    doc: "https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/",
    route: "statefulsets",
    menu: "stateful-sets"
  },
  StorageClass: {
    icon: "csicon csicon-storage-classes",
    doc: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/#storageclasses",
    route: "storageclasses",
    menu: "storage-classes",
    wizard: StorageClassCreate,
    resourceAccess: "storageclasses.storage.k8s.io"
  },
  Trace: {
    icon: "swollicon swollicon-swoll_icon",
    route: "traces",
    wizard: TraceCreate
  },
  Rbac: {
    doc: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/"
  },
  User: {
    icon: "glyphicons glyphicons-user",
    route: "manage-users",
    wizard: UserCreate,
    resourceAccess: "users.criticalstack.com"
  },
  UserRequest: {
    icon: "glyphicons glyphicons-group",
    route: "userrequests",
    menu: "userrequests",
  },
  VerificationKey: {
    icon: "glyphicons glyphicons-key",
    route: "verificationkeys",
    menu: "verificationkeys",
  }
};

export default resourceMetadata;
