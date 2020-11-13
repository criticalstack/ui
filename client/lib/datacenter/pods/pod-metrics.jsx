"use strict";

import React from "react";
import MultiLineChart from "../../../shared/charts/multiline-chart";
import h from "../../helpers";

class PodMetrics extends React.Component {
  render() {
    var lines = [
      {
        id: "cpu",
        name: "CPU Usage",
        yAxisLabel: "CPU (cores)",
        modifier: (x) => parseFloat(x * 0.001),
        endpoint: h.ns("/metrics/cpu/usage_rate/pods")
      },
      {
        id: "mem",
        name: "Memory Usage",
        yAxisLabel: "Memory (bytes)",
        endpoint: h.ns("/metrics/memory/usage/pods")
      }
    ];

    return (
      <div className="chart-parent">
        <MultiLineChart
          parentClass="chart-all-pods"
          fakeData={false}
          lines={lines}
        />
      </div>
    );
  }
}

export default PodMetrics;
