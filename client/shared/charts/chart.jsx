"use strict";

import React from "react";
import _ from "lodash";
import MetricsFetcher from "../metrics-fetcher";
import { Line, defaults } from "react-chartjs-2";
import h from "../../lib/helpers";

import moment from "moment";

class Chart extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      name: props.name,
      url: props.url,
      firstRun: true,
      delay: props.delay || 10,
      data: [],
      history: [],
      lastValue: 0,
      lastTimestamp: "",
      maxHistory: 50,
      fakeData: props.fakeData || false,
      connectionFailed: false
    };
  }

  UNSAFE_componentWillReceiveProps(props) {
    var self = this;

    if (props.url.includes(CSOS.ns("/"))) {

      self.setState({
        name: props.name,
        url: props.url,
        delay: props.delay,
        fakeData: props.fakeData || false,
        firstRun: true,
        lastTimestamp: "",
        data: [],
        history: []
      });

      self.destroyState(function() {
        self.fetchState();
      });

    }
  }

  componentDidMount() {
    this.fetchState();
  }

  componentWillUnmount() {
    this.destroyState();
  }

  fetchState(callback) {
    var self = this;

    if (self.state.connectionFailed) {
      console.log("exiting");
      return;
    }

    self.data = new MetricsFetcher(self.state.url, self.state.name, {
      delay: self.state.delay,
      success: function(data) {

        if (self.props.hasOwnProperty("debug")) {
          console.log(Date.parse(data.context.result.latestTimestamp));
        }

        if (self.state.firstRun) {

          self.formatChartData(data);

        } else if (Date.parse(data.context.result.latestTimestamp) !== self.state.lastTimestamp) {

          self.formatChartData(data);

        } else {

          var history = self.state.history;

          if (history.length > 0) {

            if (self.state.fakeData) {
              history.push({
                timestamp: Date.parse(new Date()),
                value: self.state.lastValue
              });

              if (history.length >= self.state.maxHistory) {
                history.shift();
              }

              self.setState({
                history: history
              });
            }
          }
        }

      }, error: function() {
        self.data.unbind();
      }
    });

    self.data.bind(function() {
      if (_.isFunction(callback)) {
        return callback();
      }
    });
  }

  destroyState(callback) {
    var self = this;

    self.data.unbind(function() {

      self.setState({
        data: [],
        history: [],
        lastTimestamp: "",
        firstRun: true
      }, function() {

        if (_.isFunction(callback)) {
          return callback();
        }

      });
    });

  }

  formatChartData(data, callback) {
    var self = this;

    if (!data.hasOwnProperty("context")) {
      return [];
    }

    if (!data.context.hasOwnProperty("result")) {
      return [];
    }

    var history = self.state.history;
    var lastValue = self.state.history[self.state.history.length - 1] || 0;

    if (data.context.result.hasOwnProperty("metrics")) {
      var metrics = data.context.result.metrics;

      _.each(metrics, function(m) {
        var timestamp = Date.parse(m.timestamp);
        // watch for dupes
        var last = history.length > 0 ? history[history.length - 1].timestamp : false;
        if (last !== timestamp) {
          history.push({
            timestamp: Date.parse(m.timestamp),
            value: m.value
          });

          if (history.length >= self.state.maxHistory) {
            history.shift();
          }

          lastValue = m.value;
        }
      });
    }

    self.setState({
      data: data.context.result.metrics,
      history: history,
      lastValue: lastValue,
      firstRun: false,
      lastTimestamp: Date.parse(data.context.result.latestTimestamp)
    }, function() {
      if (_.isFunction(callback)) {
        return callback();
      }
    });

  }

  render() {
    var self = this;
    var chartData = [];
    var chartLabels = [];

    defaults.global.animation = false;
    defaults.global.responsive = true;
    defaults.global.maintainAspectRatio = false;

    var history = self.state.history;

    _.each(history, function(v) {
      var value = self.props.hasOwnProperty("modifier") ? self.props.modifier(v.value) : v.value;
      chartData.push(value);
      chartLabels.push(moment(v.timestamp).format("LTS"));
    });

    var parentClass = (
      self.props.hasOwnProperty("parentClass") ? self.props.parentClass : "chart-container"
    );

    var title = (
      self.props.hasOwnProperty("title") ? self.props.title : ""
    );

    var lineColor = (
      self.props.hasOwnProperty("lineColor") ? self.props.lineColor : "#639dfd"
    );

    var fillColor = (
      self.props.hasOwnProperty("fillColor") ? self.props.fillColor : "rgba(0, 120, 231, 0.37)"
    );

    var dotColor = (
      self.props.hasOwnProperty("dotColor") ? self.props.dotColor : "#639dfd"
    );

    var dotHoverColor = (
      self.props.hasOwnProperty("dotHoverColor") ? self.props.dotHoverColor : "#3e67ab"
    );

    var chartId = window.btoa(self.props.url);

    const data = {
      labels: chartLabels,
      datasets: [
        {
          label: title,
          id: chartId,
          fill: true,
          lineTension: 0.1,
          backgroundColor: fillColor,
          borderColor: lineColor,
          borderWidth: 1.5,
          pointBorderColor: dotColor,
          pointBackgroundColor: dotColor,
          pointHoverBackgroundColor: dotHoverColor,
          pointHoverBorderColor: dotHoverColor,
          borderCapStyle: "butt",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderWidth: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: chartData
        }
      ]
    };

    var options = {};

    if (self.props.hasOwnProperty("yAxisLabel")) {
      options = {
        scales: {
          yAxes: [
            {
              position: "left",
              id: chartId,
              scaleLabel: {
                display: true,
                labelString: self.props.yAxisLabel
              },
              ticks: {
                userCallback: function(value) {
                  switch (self.props.yAxisLabel) {
                    case "Bytes":
                      value = h.view.helpers.humanFileSize(value);
                      break;
                    case "Cores":
                      value = value.toFixed(5);
                      break;
                    default:
                      value = value;
                      break;
                  }

                  return value;
                }
              }
            }
          ]
        }
      };
    }

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
      chartData.length > 0 ?
      <div className={parentClass}>
        <Line
          ref={node => {
            this.chart = node;
          }}
          id={chartId}
          data={data}
          options={options}
        />
      </div>
      :
      <div className={parentClass}>
        <div className="chart-pending">
          <i className="glyphicons glyphicons-stats"></i>
          <span>waiting for data...</span>
        </div>
      </div>
    );

    return chart;
  }
}

export default Chart;
