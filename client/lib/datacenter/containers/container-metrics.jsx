"use strict";

import React from "react";
import Chart from "../../../shared/charts/chart";

class ContainerMetrics extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      pod: props.pod,
      container: props.container
    };
  }

  render() {
    var self = this;
    var pod = self.props.pod;
    var container = self.props.container;

    let ns = window.localStorage["csos-namespace"];

    var cpuUsageRateUrl = `/metrics/cpu/usage_rate/pods/${pod}?namespace=${ns}&container=${container}`;
    var memUsageUrl = `/metrics/memory/usage/pods/${pod}?namespace=${ns}&container=${container}`;
    var txRateUrl = `/metrics/network/tx_rate/pods/${pod}?namespace=${ns}`;
    var rxRateUrl = `/metrics/network/rx_rate/pods/${pod}?namespace=${ns}`;
    var txErrorsRateUrl = `/metrics/network/tx_errors_rate/pods/${pod}?namespace=${ns}`;
    var rxErrorsRateUrl = `/metrics/network/rx_errors_rate/pods/${pod}?namespace=${ns}`;

    return (
      <div className="container-chart-parent">
        <Chart
          name="cpu"
          title="CPU Utilization"
          parentClass="chart-container"
          fakeData={false}
          url={cpuUsageRateUrl}
          lineColor="#58a757"
          fillColor="rgba(136, 214, 136, 0.27)"
          dotColor="#58a757"
          dotHoverColor="#58a757"
          yAxisLabel="Cores"
          modifier={(x) => parseFloat(x * 0.001)}
        />
        <Chart
          name="mem"
          title="Memory Utilization"
          parentClass="chart-container"
          fakeData={false}
          url={memUsageUrl}
          yAxisLabel="Bytes"
        />
        <Chart
          name="txr"
          title="Tx Rate"
          parentClass="chart-container"
          fakeData={false}
          url={txRateUrl}
          lineColor="#f0ad4e"
          fillColor="rgba(240, 173, 78, 0.4)"
          dotColor="#f0ad4e"
          dotHoverColor="#f0ad4e"
          yAxisLabel="Bytes"
        />
        <Chart
          name="txe"
          title="Tx Errors Rate"
          parentClass="chart-container"
          fakeData={false}
          url={txErrorsRateUrl}
          lineColor="#f0ad4e"
          fillColor="rgba(240, 173, 78, 0.4)"
          dotColor="#f0ad4e"
          dotHoverColor="#f0ad4e"
          yAxisLabel="Count"
        />
        <Chart
          name="rxr"
          title="Rx Rate"
          parentClass="chart-container"
          fakeData={false}
          url={rxRateUrl}
          lineColor="#b72b2b"
          fillColor="rgba(183, 43, 43, 0.34)"
          dotColor="#b72b2b"
          dotHoverColor="#b72b2b"
          yAxisLabel="Bytes"
        />
        <Chart
          name="rxe"
          title="Rx Errors Rate"
          parentClass="chart-container"
          fakeData={false}
          url={rxErrorsRateUrl}
          lineColor="#b72b2b"
          fillColor="rgba(183, 43, 43, 0.34)"
          dotColor="#b72b2b"
          dotHoverColor="#b72b2b"
          yAxisLabel="Count"
        />
      </div>
    );
  }
}

export default ContainerMetrics;
