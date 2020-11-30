package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	promv1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
)

type Metric struct {
	Timestamp time.Time `json:"timestamp"`
	Value     string    `json:"value"`
}

type swollMetrics struct {
	Class     string `json:"class"`
	Group     string `json:"group,omitempty"`
	Syscall   string `json:"syscall,omitempty"`
	Container string `json:"container,omitempty"`
	Pod       string `json:"pod,omitempty"`
	Namespace string `json:"namespace,omitempty"`
	Error     string
	Values    []Metric
}

type swollWrapper struct {
	Title   string
	Payload interface{}
}

func (m *Metric) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		Timestamp string `json:"timestamp"`
		Value     string `json:"value"`
	}{
		Timestamp: m.Timestamp.Format("2006-01-02T15:04:05Z"),
		Value:     m.Value,
	})
}

func wrapSwollMetrics(title string, payload interface{}) *swollWrapper {
	return &swollWrapper{
		Title:   title,
		Payload: payload,
	}
}

func (x *Controller) getSwollMetrics(container, pod, ns string, start, end time.Time) (*swollWrapper, error) {
	queries := make([]string, 0)
	groupby := []string{"syscall", "class", "group", "err"}

	if container != "" {
		queries = append(queries, fmt.Sprintf("container=\"%s\"", container))
	} else {
		groupby = append(groupby, "container")
	}

	if pod != "" {
		queries = append(queries, fmt.Sprintf("pod=\"%s\"", pod))
	} else {
		groupby = append(groupby, "pod")
	}

	if ns != "" {
		queries = append(queries, fmt.Sprintf("namespace=\"%s\"", ns))
	} else {
		groupby = append(groupby, "namespace")
	}

	result, _, err := x.metrics.QueryRange(context.TODO(),
		fmt.Sprintf("sum(rate(swoll_node_metrics_syscall_count{%s}[5m])) by (%s)", strings.Join(queries, ","), strings.Join(groupby, ",")),
		promv1.Range{
			Start: start,
			End:   end,
			Step:  60 * time.Second,
		},
	)
	if err != nil {
		return nil, err
	}

	ret := make([]*swollMetrics, 0)

	for _, stream := range result.(model.Matrix) {
		syscall := string(stream.Metric["syscall"])
		errors := string(stream.Metric["err"])
		class := string(stream.Metric["class"])
		group := string(stream.Metric["group"])
		ns := string(stream.Metric["namespace"])
		ctr := string(stream.Metric["container"])

		ent := &swollMetrics{
			Class:     class,
			Group:     group,
			Syscall:   syscall,
			Container: ctr,
			Namespace: ns,
			Error:     errors,
			Values:    make([]Metric, 0)}
		ret = append(ret, ent)

		for _, sample := range stream.Values {
			ent.Values = append(ent.Values, Metric{
				Timestamp: parseMillisecondsFromEpoch(int64(sample.Timestamp)),
				Value:     sample.Value.String(),
			})

			fmt.Println(sample)
		}
	}

	return wrapSwollMetrics("syscall-metrics-total", ret), nil
}

func parseMillisecondsFromEpoch(n int64) time.Time {
	sec := n / int64(time.Second/time.Millisecond)
	nsec := (n % int64(time.Second/time.Millisecond)) * int64(time.Millisecond/time.Nanosecond)
	return time.Unix(sec, nsec)
}

func (x *Controller) queryPrometheusMetrics(ctx context.Context, query string, start, end time.Time) ([]*Metric, error) {
	result, _, err := x.metrics.QueryRange(ctx, query, promv1.Range{
		Start: start,
		End:   end,
		Step:  60 * time.Second,
	})
	if err != nil {
		return nil, err
	}
	metrics := make([]*Metric, 0)
	switch v := result.(type) {
	case *model.Scalar:
		metrics = append(metrics, &Metric{
			Timestamp: parseMillisecondsFromEpoch(int64(v.Timestamp)),
			Value:     v.Value.String(),
		})
	case model.Vector:
		for _, sample := range v {
			metrics = append(metrics, &Metric{
				Timestamp: parseMillisecondsFromEpoch(int64(sample.Timestamp)),
				Value:     sample.Value.String(),
			})
		}
	case model.Matrix:
		for _, stream := range v {
			for _, sample := range stream.Values {
				metrics = append(metrics, &Metric{
					Timestamp: parseMillisecondsFromEpoch(int64(sample.Timestamp)),
					Value:     sample.Value.String(),
				})
			}
		}
	case *model.String:
		metrics = append(metrics, &Metric{
			Timestamp: parseMillisecondsFromEpoch(int64(v.Timestamp)),
			Value:     v.Value,
		})
	}
	return metrics, nil
}

func (x *Controller) sendMetrics(c echo.Context, query string, start, end time.Time) error {
	metrics, err := x.queryPrometheusMetrics(context.TODO(), query, start, end)
	if err != nil {
		return newError(err)
	}
	if len(metrics) == 0 {
		return x.sendJSONSuccess(c, Map{
			"result": Map{
				"latestTimestamp": nil,
				"metrics":         nil,
			},
		})
	}
	var latestTimestamp time.Time
	for _, m := range metrics {
		if m.Timestamp.After(latestTimestamp) {
			latestTimestamp = m.Timestamp
		}
	}
	return x.sendJSONSuccess(c, Map{
		"result": Map{
			"latestTimestamp": latestTimestamp.UTC().Format("2006-01-02T15:04:05Z"),
			"metrics":         metrics,
		},
	})
}

func (x *Controller) sendRawMetrics(c echo.Context, query string, start, end time.Time) error {
	var latestTimestamp time.Time

	result, _, err := x.metrics.QueryRange(context.TODO(), query, promv1.Range{
		Start: start,
		End:   end,
		Step:  60 * time.Second,
	})
	if err != nil {
		return err
	}

	return x.sendJSONSuccess(c, Map{
		"result": Map{
			"latestTimestamp": latestTimestamp.UTC().Format("2006-01-02T15:04:05Z"),
			"metrics":         result,
		},
	})
}

// PodMetrics returns usage metrics for the provided pod/container and metrics
// type.
func (x *Controller) PodMetrics(c echo.Context) error {
	namespace, err := parseNamespace(c)
	if err != nil {
		return err
	}

	podName := c.Param("name")
	containerName := c.QueryParam("container")
	metricsName := fmt.Sprintf("/%s/%s", c.Param("metricsType"), c.Param("metricsName"))
	start, err := time.Parse("2006-01-02T15:04:05Z", c.QueryParam("start"))
	if err != nil {
		start = time.Now().UTC().Add(-5 * time.Minute).Truncate(time.Minute)
	}
	end, err := time.Parse("2006-01-02T15:04:05Z", c.QueryParam("end"))
	if err != nil {
		end = time.Now().UTC().Truncate(time.Minute)
	}
	ll := []string{
		fmt.Sprintf("namespace=\"%s\"", namespace),
	}
	if podName != "" {
		ll = append(ll, fmt.Sprintf("pod=\"%s\"", podName))
	}
	if containerName != "" {
		ll = append(ll, fmt.Sprintf("container=\"%s\"", containerName))
	}
	labels := strings.Join(ll, ",")

	var query string
	switch metricsName {
	case "/cpu/usage_rate":
		query = fmt.Sprintf("sum(1000 * container_cpu_usage_seconds:rate3m{%s})", labels)
	case "/memory/usage":
		query = fmt.Sprintf("sum(container_memory_usage_bytes{%s})", labels)
	case "/network/tx_rate":
		query = fmt.Sprintf("sum(container_network_transmit_bytes_per_second{%s})", labels)
	case "/network/tx_errors_rate":
		query = fmt.Sprintf("sum(container_network_transmit_errors_per_second{%s})", labels)
	case "/network/rx_rate":
		query = fmt.Sprintf("sum(container_network_receive_bytes_per_second{%s})", labels)
	case "/network/rx_errors_rate":
		query = fmt.Sprintf("sum(container_network_receive_errors_per_second{%s})", labels)
	case "/swoll/metrics":
		metrics, err := x.getSwollMetrics(containerName, podName, namespace, start, end)
		if err != nil {
			return err
		}

		return x.sendJSONSuccess(c, Map{
			"result": Map{
				"latestTimestamp": nil,
				"metrics":         metrics,
			},
		})
	default:
		return errors.Errorf("invalid metrics name: %#v", metricsName)
	}
	return x.sendMetrics(c, query, start, end)
}

// NodeMetrics returns usage metrics for the provided node and metrics type.
func (x *Controller) NodeMetrics(c echo.Context) error {
	nodeName := c.Param("nodeName")
	metricsName := fmt.Sprintf("/%s/%s", c.Param("metricsType"), c.Param("metricsName"))
	start, err := time.Parse("2006-01-02T15:04:05Z", c.QueryParam("start"))
	if err != nil {
		start = time.Now().UTC().Add(-5 * time.Minute).Truncate(time.Minute)
	}
	end, err := time.Parse("2006-01-02T15:04:05Z", c.QueryParam("end"))
	if err != nil {
		end = time.Now().UTC().Truncate(time.Minute)
	}
	var query string
	switch metricsName {
	case "/cpu/usage_rate":
		query = fmt.Sprintf("1000 * node_load1{kubernetes_node=\"%s\"}", nodeName)
	case "/memory/usage":
		query = fmt.Sprintf("node_memory_MemUsed_bytes{kubernetes_node=\"%s\"}", nodeName)
	case "/network/tx_rate":
		query = fmt.Sprintf("node_network_transmit_bytes_per_second{kubernetes_node=\"%s\"}", nodeName)
	case "/network/tx_errors_rate":
		query = fmt.Sprintf("node_network_transmit_errors_per_second{kubernetes_node=\"%s\"}", nodeName)
	case "/network/rx_rate":
		query = fmt.Sprintf("node_network_receive_bytes_per_second{kubernetes_node=\"%s\"}", nodeName)
	case "/network/rx_errors_rate":
		query = fmt.Sprintf("node_network_receive_errors_per_second{kubernetes_node=\"%s\"}", nodeName)
	case "/swoll/metrics":
		metrics, err := x.getSwollMetrics("", "", "", start, end)
		if err != nil {
			return err
		}

		return x.sendJSONSuccess(c, Map{
			"result": Map{
				"latestTimestamp": nil,
				"metrics":         metrics,
			},
		})

	default:
		return errors.Errorf("invalid metrics name: %#v", metricsName)
	}
	return x.sendMetrics(c, query, start, end)
}
