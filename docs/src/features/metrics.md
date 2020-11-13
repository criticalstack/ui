# Resource utilization metrics

The CS UI can display resource utilization metrics if a correctly configured Prometheus instance exists in the cluster.

The following examples show how to set up a either a standalone Prometheus, or a managed instance with Prometheus Operator.

## Standalone Prometheus

A standalone Prometheus can be deployed using the [official Helm chart](https://github.com/prometheus-community/helm-charts) and [this sample values.yaml](https://github.com/criticalstack/ui/blob/main/hack/prometheus/standalone.yaml)

## Operated Prometheus

If a properly configured [Prometheus Operator](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) is running in the cluster already, a suitable instance can be deployed via CRD in the CS UI namespace with this configuration: 

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  tolerations:
    - effect: NoSchedule
      key: node.kubernetes.io/not-ready
      operator: "Exists"
    - effect: NoSchedule
      key: node-role.kubernetes.io/master
      operator: "Exists"
  additionalScrapeConfigs:
  - job_name: kubernetes-service-endpoints
    kubernetes_sd_configs:
    - role: endpoints
    relabel_configs:
    - action: keep
      regex: true
      source_labels:
      - __meta_kubernetes_service_annotation_prometheus_io_scrape
    - action: replace
      regex: (https?)
      source_labels:
      - __meta_kubernetes_service_annotation_prometheus_io_scheme
      target_label: __scheme__
    - action: replace
      regex: (.+)
      source_labels:
      - __meta_kubernetes_service_annotation_prometheus_io_path
      target_label: __metrics_path__
    - action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      source_labels:
      - __address__
      - __meta_kubernetes_service_annotation_prometheus_io_port
      target_label: __address__
    - action: labelmap
      regex: __meta_kubernetes_service_label_(.+)
    - action: replace
      source_labels:
      - __meta_kubernetes_namespace
      target_label: kubernetes_namespace
    - action: replace
      source_labels:
      - __meta_kubernetes_service_name
      target_label: kubernetes_name
    - action: replace
      source_labels:
      - __meta_kubernetes_pod_node_name
      target_label: kubernetes_node
  - job_name: kubernetes-services
    kubernetes_sd_configs:
    - role: service
    metrics_path: /probe
    params:
      module:
      - http_2xx
    relabel_configs:
    - action: keep
      regex: true
      source_labels:
      - __meta_kubernetes_service_annotation_prometheus_io_probe
    - source_labels:
      - __address__
      target_label: __param_target
    - replacement: blackbox
      target_label: __address__
    - source_labels:
      - __param_target
      target_label: instance
    - action: labelmap
      regex: __meta_kubernetes_service_label_(.+)
    - source_labels:
      - __meta_kubernetes_namespace
      target_label: kubernetes_namespace
    - source_labels:
      - __meta_kubernetes_service_name
      target_label: kubernetes_name
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - action: keep
      regex: true
      source_labels:
      - __meta_kubernetes_pod_annotation_prometheus_io_scrape
    - action: replace
      regex: (.+)
      source_labels:
      - __meta_kubernetes_pod_annotation_prometheus_io_path
      target_label: __metrics_path__
    - action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      source_labels:
      - __address__
      - __meta_kubernetes_pod_annotation_prometheus_io_port
      target_label: __address__
    - action: labelmap
      regex: __meta_kubernetes_pod_label_(.+)
    - action: replace
      source_labels:
      - __meta_kubernetes_namespace
      target_label: kubernetes_namespace
    - action: replace
      source_labels:
      - __meta_kubernetes_pod_name
      target_label: kubernetes_pod_name
```

A full sample Prometheus Operator [values.yaml is available here.](https://github.com/criticalstack/ui/blob/main/hack/prometheus/operated.yaml). Note the relabeling configs.


### Configure CS UI

To finish setting up resource metrics in the UI, set the Prometheus endpoint in the CS UI Helm [values.yaml](../../../chart/values.yaml) and deploy. The default value is `http://prometheus-server:9090`.
