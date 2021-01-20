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

func (m *Metric) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		Timestamp string `json:"timestamp"`
		Value     string `json:"value"`
	}{
		Timestamp: m.Timestamp.Format("2006-01-02T15:04:05Z"),
		Value:     m.Value,
	})
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

type swollStats struct {
	metrics            promv1.API
	start, end         time.Time
	ns, pod, container string
	Metrics            map[string]interface{}
}

func newSwollStats(metrics promv1.API, ns, pod, container string) *swollStats {
	return &swollStats{
		metrics:   metrics,
		ns:        ns,
		pod:       pod,
		container: container,
		Metrics:   make(map[string]interface{}),
	}
}

type swollMetrics struct {
	Totals []Metric `json:"totals,omitempty"`
	Errors []Metric `json:"errors,omitempty"`
}

func newSwollMetrics() *swollMetrics {
	return &swollMetrics{
		Totals: make([]Metric, 0),
		Errors: make([]Metric, 0),
	}
}

func (m *swollMetrics) fill(totals []model.SamplePair, errors []model.SamplePair) {
	if len(totals) > 0 {
		for _, val := range totals {
			m.Totals = append(m.Totals, Metric{
				Timestamp: parseMillisecondsFromEpoch(int64(val.Timestamp)),
				Value:     val.Value.String(),
			})
		}
	}

	if len(errors) > 0 {
		for _, val := range errors {
			m.Errors = append(m.Errors, Metric{
				Timestamp: parseMillisecondsFromEpoch(int64(val.Timestamp)),
				Value:     val.Value.String(),
			})
		}
	}
}

func (s *swollStats) queryErrors(cond string, rg promv1.Range) map[string]*swollMetrics {
	pq := fmt.Sprintf("sum(rate(swoll_node_metrics_syscall_count{%s}[5m])) by (err)", cond)
	res, _, err := s.metrics.QueryRange(context.TODO(), pq, rg)
	if err != nil {
		return nil
	}

	ret := make(map[string]*swollMetrics)

	for _, m := range res.(model.Matrix) {
		errstr := string(m.Metric["err"])
		ret[errstr] = newSwollMetrics()
		ret[errstr].fill(m.Values, nil)
	}

	return ret
}

func (s *swollStats) querySingleKey(cond string, rg promv1.Range, key string) map[string]*swollMetrics {
	// create the total count query
	pqtotal := fmt.Sprintf("sum(rate(swoll_node_metrics_syscall_count{%s}[5m])) by (%s)", cond, key)
	res, _, err := s.metrics.QueryRange(context.TODO(), pqtotal, rg)
	if err != nil {
		return nil
	}

	ret := make(map[string]*swollMetrics)

	for _, m := range res.(model.Matrix) {
		class := string(m.Metric[model.LabelName(key)])
		metrics := newSwollMetrics()
		ret[class] = metrics

		metrics.fill(m.Values, nil)
	}

	// create the error (return != OK) count query
	var errcond string

	if cond != "" {
		// we have conditions already, so append with a ','
		errcond = fmt.Sprintf("%s,err!=\"OK\"", cond)
	} else {
		// no conditions passed, set a static conditional here.
		errcond = "err!=\"OK\""
	}

	pqerror := fmt.Sprintf("sum(rate(swoll_node_metrics_syscall_count{%s}[5m])) by (%s)", errcond, key)
	res, _, err = s.metrics.QueryRange(context.TODO(), pqerror, rg)
	if err != nil {
		return nil
	}

	for _, m := range res.(model.Matrix) {
		class := string(m.Metric[model.LabelName(key)])

		if _, ok := ret[class]; !ok {
			ret[class] = newSwollMetrics()
		}

		ret[class].fill(nil, m.Values)
	}

	return ret
}

func (s *swollStats) querySyscalls(cond string, rg promv1.Range) map[string]*swollMetrics {
	return s.querySingleKey(cond, rg, "syscall")
}

func (s *swollStats) queryClassifications(cond string, rg promv1.Range) map[string]*swollMetrics {
	return s.querySingleKey(cond, rg, "class")
}

func (s *swollStats) Query(start, end time.Time) *swollStats {
	cond := []string{}

	if s.ns != "" {
		cond = append(cond, fmt.Sprintf("namespace=\"%s\"", s.ns))
	}

	if s.pod != "" {
		cond = append(cond, fmt.Sprintf("pod=\"%s\"", s.pod))
	}

	if s.container != "" {
		cond = append(cond, fmt.Sprintf("container=\"%s\"", s.container))
	}

	prange := promv1.Range{
		Start: start,
		End:   end,
		Step:  60 * time.Second,
	}
	conditions := strings.Join(cond, ",")

	s.Metrics["classifications"] = s.queryClassifications(conditions, prange)
	s.Metrics["errors"] = s.queryErrors(conditions, prange)
	s.Metrics["syscalls"] = s.querySyscalls(conditions, prange)

	return s

}

func (x *Controller) SwollMetrics(c echo.Context) error {
	namespace := c.Param("namespace")
	container := c.Param("container")
	pod := c.Param("pod")

	start, err := time.Parse("2006-01-02T15:04:05Z", c.QueryParam("start"))
	if err != nil {
		start = time.Now().UTC().Add(-5 * time.Minute).Truncate(time.Minute)
	}

	end, err := time.Parse("2006-01-02T15:04:05Z", c.QueryParam("end"))
	if err != nil {
		end = time.Now().UTC().Truncate(time.Minute)
	}

	s := newSwollStats(x.metrics, namespace, pod, container)
	return x.sendJSONSuccess(c, Map{"result": s.Query(start, end)})
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
	case "/system/syscall_rate":
		query = fmt.Sprintf("sum(rate(swoll_node_metrics_syscall_count{%s}[5m]))", labels)
	case "/system/syscall_errors_rate":
		query = fmt.Sprintf("sum(rate(swoll_node_metrics_syscall_count{%s, err!=\"OK\"}[5m]))", labels)
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
	default:
		return errors.Errorf("invalid metrics name: %#v", metricsName)
	}
	return x.sendMetrics(c, query, start, end)
}
