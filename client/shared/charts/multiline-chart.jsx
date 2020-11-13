"use strict";

import React from "react";
import _ from "lodash";
import MetricsFetcher from "../metrics-fetcher";
import { Line, defaults } from "react-chartjs-2";
import h from "../../lib/helpers";
import moment from "moment";

class MultilineChart extends React.Component {

  constructor(props) {
    super(props);

    this.data = {};

    this.state = {
      lines: props.lines,
      history: {},
      firstRun: true,
      delay: props.delay || 10,
      lastValue: {},
      lastTimestamp: {},
      maxHistory: 50,
      fakeData: props.fakeData || false,
      connectionFailed: false,
      chart: {
        legend: {
          options: {
            onClick: function() {
            }
          }
        },
        redraw: false,
        onElementsClick: function() {
        }
      }
    };
  }

  shouldComponentUpdate(a, b) {
    var self = this;

    var aa = a.lines[0].endpoint;
    var bb = b.lines[0].endpoint;

    if (aa !== bb) {

      self.setState({
        lines: a.lines
      }, function() {

        self.destroyState(function() {
          self.fetchState();
        });

      });

      return true;
    }

    return true;
  }

  componentDidMount() {
    var self = this;

    self.fetchState();
  }

  componentWillUnmount() {
    this.destroyState();
  }

  fetchState(callback) {
    var self = this;

    if (self.state.connectionFailed) {
      return;
    }

    _.each(self.state.lines, function(line, i) {

      self.data[line.endpoint] = new MetricsFetcher(line.endpoint, i, {
        ignoreTimestamp: false,
        delay: self.state.delay,
        success: function(data) {

          self.formatChartData(data, line.id);

        }, error: function() {
          self.data[line.endpoint].unbind();
        }
      });

      self.data[line.endpoint].bind(function() {
        if (_.isFunction(callback)) {
          return callback();
        }
      });

    });
  }

  destroyState(callback) {
    var self = this;

    h.Vent.removeAllListeners("namespace-change");

    var count = 0;
    var len = _.keys(self.data).length;

    _.forEach(self.data, function(value) {
      count++;

      value.unbind(function() {
        if (len === count) {

          self.setState({
            history: {},
            firstRun: true,
            lastTimestamp: {}
          }, function() {

            if (_.isFunction(callback)) {
              return callback();
            }

          });
        }
      });
    });

  }

  formatChartData(data, id, callback) {
    var self = this;

    if (!data.hasOwnProperty("context")) {
      return [];
    }

    if (!data.context.hasOwnProperty("result")) {
      return [];
    }

    var timestamps = self.state.lastTimestamp;

    var history = self.state.history;

    if (!history.hasOwnProperty(id)) {
      history[id] = [];
    }

    var line = history[id];

    var lastValue = line.length <= 0 ? 0 : line[line.length - 1].value;

    if (data.context.result.hasOwnProperty("metrics")) {

      var metrics = data.context.result.metrics;

      _.each(metrics, function(m) {
        var timestamp = Date.parse(m.timestamp);
        // watch for dupes
        var last = line.length > 0 ? line[line.length - 1].timestamp : false;

        if (last !== timestamp) {
          line.push({
            timestamp: timestamp,
            value: m.value
          });

          if (line.length > self.state.maxHistory) {
            line.shift();
          }

          lastValue = m.value;
        }
      });

      history[id] = line;

      timestamps[id] = Date.parse(data.context.result.latestTimestamp);

      self.setState({
        history: history,
        lastValue: lastValue,
        lastTimestamp: timestamps,
        firstRun: false
      }, function() {
        if (_.isFunction(callback)) {
          return callback();
        }
      });
    }
  }

  render() {
    var self = this;
    var line0 = [];
    var line1 = [];
    var chartLabels = [];

    defaults.global.animation = false;
    defaults.global.responsive = true;
    defaults.global.maintainAspectRatio = false;

    var lines = self.props.lines;

    _.each(self.state.history[lines[0].id], function(v) {
      var value = lines[0].hasOwnProperty("modifier") ? lines[0].modifier(v.value) : v.value;
      line0.push(value);
      chartLabels.push(moment(v.timestamp).format("LTS"));
    });

    _.each(self.state.history[lines[1].id], function(v) {
      var value = lines[1].hasOwnProperty("modifier") ? lines[1].modifier(v.value) : v.value;
      line1.push(value);
    });

    // Because the calls are async it is quite possible for a line to contain more items than another.
    // To address this we simply pop off any excess from the beginning of the longer arrays
    if (line1.length > line0.length) {
      line1.splice(0, (line1.length - line0.length));
    }

    if (line0.length > line1.length) {
      line0.splice(0, (line0.length - line1.length));
      chartLabels.splice(0, (line0.length - line1.length));
    }

    var parentClass = (
      self.props.hasOwnProperty("parentClass") ? self.props.parentClass : "chart-container"
    );

    var lineColor0 = (
      self.props.hasOwnProperty("lineColor0") ? self.props.lineColor0 : "#58a757"
    );

    var lineColor1 = (
      self.props.hasOwnProperty("lineColor1") ? self.props.lineColor1 : "#639dfd"
    );

    var fillColor0 = (
      self.props.hasOwnProperty("fillColor0") ? self.props.fillColor0 : "rgba(136, 214, 136, 0.27)"
    );

    var fillColor1 = (
      self.props.hasOwnProperty("fillColor1") ? self.props.fillColor1 : "rgba(99, 157, 253, 0.25)"
    );

    var dotColor0 = (
      self.props.hasOwnProperty("dotColor0") ? self.props.dotColor0 : "#58a757"
    );

    var dotColor1 = (
      self.props.hasOwnProperty("dotColor1") ? self.props.dotColor1 : "#639dfd"
    );

    var dotHoverColor0 = (
      self.props.hasOwnProperty("dotHoverColor0") ? self.props.dotHoverColor0 : "#58a757"
    );

    var dotHoverColor1 = (
      self.props.hasOwnProperty("dotHoverColor1") ? self.props.dotHoverColor1 : "#639dfd"
    );

    var chartId = window.btoa(self.props.url);

    const data = {
      labels: chartLabels,
      datasets: [
        {
          hidden: false,
          showLine: true,
          label: lines[0].name,
          yAxisID: lines[0].id,
          data: line0,
          fill: true,
          lineTension: 0.1,
          backgroundColor: fillColor0,
          borderColor: lineColor0,
          borderWidth: 1.5,
          pointBorderColor: dotColor0,
          pointBackgroundColor: dotColor0,
          pointHoverBackgroundColor: dotHoverColor0,
          pointHoverBorderColor: dotHoverColor0,
          borderCapStyle: "butt",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderWidth: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          spanGaps: true
        },
        {
          hidden: false,
          showLine: true,
          label: lines[1].name,
          yAxisID: lines[1].id,
          data: line1,
          fill: true,
          lineTension: 0.1,
          backgroundColor: fillColor1,
          borderColor: lineColor1,
          borderWidth: 1.5,
          pointBorderColor: dotColor1,
          pointBackgroundColor: dotColor1,
          pointHoverBackgroundColor: dotHoverColor1,
          pointHoverBorderColor: dotHoverColor1,
          borderCapStyle: "butt",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderWidth: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          spanGaps: true
        }
      ]
    };

    var options = {
      scales: {
        yAxes: [
          {
            display: true,
            position: "left",
            "id": lines[0].id,
            scaleLabel: {
              display: true,
              labelString: lines[0].yAxisLabel
            },
            ticks: {
              userCallback: function(value) {
                value = lines[0].hasOwnProperty("modifier") ? value.toFixed(4) : h.view.helpers.humanFileSize(value);
                return value;
              }
            }
          },
          {
            display: true,
            position: "right",
            "id": lines[1].id,
            scaleLabel: {
              display: true,
              labelString: lines[1].yAxisLabel
            },
            ticks: {
              userCallback: function(value) {
                value = lines[1].hasOwnProperty("modifier") ? value.toFixed(4) : h.view.helpers.humanFileSize(value);
                return value;
              }
            }
          }
        ]
      }
    };

    // make the chart respect the legend toggle on update
    if (_.get(self.chart, "chart_instance.legend.legendItems", false)) {
      _.each(self.chart.chart_instance.legend.legendItems, function(li) {
        _.each(data.datasets, function(ds) {
          if (ds.label === li.text) {
            ds.hidden = li.hidden;
          }
        });
      });
    }

    var chart = (
      chartLabels.length > 0 ?
      <div className={parentClass}>
        <Line
          ref={node => {
            this.chart = node;
          }}
          onElementsClick={self.state.chart.onElementsClick}
          redraw={self.state.chart.redraw}
          id={chartId}
          data={data}
          options={options}
        />
      </div> : null
    );

    return chart;
  }
}

export default MultilineChart;
