"use strict";

import React from "react";
import _ from "lodash";
import Tooltip from "react-tooltip";
import MetricsFetcher from "../metrics-fetcher";
import h from "../../lib/helpers";
import {
  Sparklines,
  SparklinesLine,
  SparklinesReferenceLine,
  SparklinesNormalBand,
  SparklinesSpots
} from "react-sparklines";

class SparkLineChart extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      name: props.name,
      namespace: props.namespace,
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

    self.data = new MetricsFetcher(self.state.url, self.state.name, {
      delay: self.state.delay,
      success: function(data) {
        if (self.props.hasOwnProperty("debug")) {
          console.log("debug:", data);
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
                value: Number(self.state.lastValue)
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
        history.push({
          timestamp: Date.parse(m.timestamp),
          value: Number(m.value)
        });

        if (history.length >= self.state.maxHistory) {
          history.shift();
        }

        lastValue = m.value;
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

    _.each(self.state.history, function(v) {
      chartData.push(v.value);
    });

    var units = self.props.hasOwnProperty("units") ? self.props.units : "none";

    var modifier;

    switch (units) {
      case "cpu":
        modifier = (x) => parseFloat((x * 0.001).toFixed(3));
        break;
      default:
        modifier = (x) => h.view.helpers.humanFileSize(x);
        break;
    }

    var chartLow = modifier(_.min(chartData));
    var chartHigh = modifier(_.max(chartData));
    var chartLast = modifier(chartData[chartData.length - 1]);

    var svgStyle = (
      self.props.hasOwnProperty("svgStyle") ? self.props.svgStyle : {}
    );

    var lineStyle = (
      self.props.hasOwnProperty("lineStyle") ? self.props.lineStyle :
      {
        stroke: "#639DFD",
        fill: "#639DFD",
        fillOpacity: 0.3
      }
    );

    var bandStyle = (
      self.props.hasOwnProperty("bandStyle") ? self.props.bandStyle :
      {
        fill: "#2991c8",
        fillOpacity: 0.1
      }
    );

    var referenceStyle = (
      self.props.hasOwnProperty("referenceStyle") ? self.props.referenceStyle :
      {
        stroke: "#000",
        strokeDasharray: "2, 2"
      }
    );

    var parentClass = (
      self.props.hasOwnProperty("parentClass") ? self.props.parentClass : "sparkchart-parent-default"
    );

    var height = (
      self.props.hasOwnProperty("height") ? self.props.height : 60
    );

    var width = (
      self.props.hasOwnProperty("width") ? self.props.width : 240
    );

    var chartId = window.btoa(self.props.url);
    var toolTip = (
      <div>
        <div className="sparkchart-tip">
          <div className="sparkchart-tip-key">
            min
          </div>
          <div className="sparkchart-tip-val">
            {chartLow}
          </div>
        </div>
        <div className="sparkchart-tip">
          <div className="sparkchart-tip-key">
            max
          </div>
          <div className="sparkchart-tip-val">
            {chartHigh}
          </div>
        </div>
        <div className="sparkchart-tip">
          <div className="sparkchart-tip-key">
            last
          </div>
          <div className="sparkchart-tip-val">
            {chartLast}
          </div>
        </div>
      </div>
    );

    const chartOverlays = {
      chartLast: `Last: ${chartLast}`
    };

    let leftOverlay = this.props.leftOverlay ?
      <div className="sparkchart-overlay-msg-left">
        {this.props.leftOverlay}
      </div>
      : "";

    let rightOverlay = this.props.rightOverlay ?
      <div className="sparkchart-overlay-msg-right">
        {_.get(chartOverlays, self.props.rightOverlay, "")}
      </div>
      : "";

    var chart = (
      chartData.length > 1 ?
      <div
        className={parentClass}
        data-tip
        data-for={`tip-${chartId}`}>

        <Tooltip
          id={`tip-${chartId}`}
          effect="float">
          {toolTip}
        </Tooltip>

        {self.props.hasOwnProperty("title") ? <div className="sparkchart-title-normal">{self.props.title}</div> : null}
        {leftOverlay}
        {rightOverlay}
        <Sparklines
          style={svgStyle}
          data={chartData}
          height={height}
          width={width}
         >
          <SparklinesLine style={lineStyle} />
          {self.props.hasOwnProperty("referenceLine") ? <SparklinesReferenceLine type="mean" style={referenceStyle} /> : []}
          {self.props.hasOwnProperty("normalBand") ? <SparklinesNormalBand style={bandStyle} /> : []}
          {self.props.hasOwnProperty("spots") ? <SparklinesSpots /> : []}
        </Sparklines>
      </div>
      :
      <div className="sparkchart-pending">
        <i className="glyphicons glyphicons-stats"></i>
        <span>waiting for data...</span>
      </div>
    );

    return chart;

  }
}

export default SparkLineChart;
