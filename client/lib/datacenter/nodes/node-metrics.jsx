"use strict";

import React from "react";
import Chart from "../../../shared/charts/chart";

class NodeMetrics extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      node: props.node
    };
  }

  UNSAFE_componentWillReceiveProps(props) {
    if (this.state.node !== props.node) {
      this.setState({
        node: props.node,
      });
    }
  }

  render() {
    var node = this.state.node;
    var suffix = `nodes/${node}`;

    var cpuUsageRateUrl = `/metrics/cpu/usage_rate/${suffix}`;
    var memUsageUrl = `/metrics/memory/usage/${suffix}`;
    var txRateUrl = `/metrics/network/tx_rate/${suffix}`;
    var rxRateUrl = `/metrics/network/rx_rate/${suffix}`;
    var txErrorsRateUrl = `/metrics/network/tx_errors_rate/${suffix}`;
    var rxErrorsRateUrl = `/metrics/network/rx_errors_rate/${suffix}`;

    return (
      <div key={node}>
        <div className="node-view-content-charts">
          <Chart
            name="cpu"
            title="CPU Utilization"
            parentClass="col"
            fakeData={false}
            url={cpuUsageRateUrl}
            lineColor="#58a757"
            fillColor="rgba(136, 214, 136, 0.27)"
            dotColor="#58a757"
            dotHoverColor="#58a757"
            textColor="#ffffff"
            yAxisLabel="Cores"
            modifier={(x) => parseFloat(x * 0.001)}
          />
          <Chart
            name="mem"
            title="Memory Utilization"
            parentClass="col"
            fakeData={false}
            url={memUsageUrl}
            yAxisLabel="Bytes"
            textColor="#ffffff"
          />
          <Chart
            name="txr"
            title="Tx Rate"
            parentClass="col"
            fakeData={false}
            url={txRateUrl}
            lineColor="#f0ad4e"
            fillColor="rgba(240, 173, 78, 0.4)"
            dotColor="#f0ad4e"
            dotHoverColor="#f0ad4e"
            textColor="#ffffff"
            yAxisLabel="Bytes"
          />
        </div>
        <div className="node-view-content-charts">
          <Chart
            name="txe"
            title="Tx Errors Rate"
            parentClass="col"
            fakeData={false}
            url={txErrorsRateUrl}
            lineColor="#f0ad4e"
            fillColor="rgba(240, 173, 78, 0.4)"
            dotColor="#f0ad4e"
            dotHoverColor="#f0ad4e"
            textColor="#ffffff"
            yAxisLabel="Count"
          />
          <Chart
            name="rxr"
            title="Rx Rate"
            parentClass="col"
            fakeData={false}
            url={rxRateUrl}
            lineColor="#b72b2b"
            fillColor="rgba(183, 43, 43, 0.34)"
            dotColor="#b72b2b"
            dotHoverColor="#b72b2b"
            textColor="#ffffff"
            yAxisLabel="Bytes"
          />
          <Chart
            name="rxe"
            title="Rx Errors Rate"
            parentClass="col"
            fakeData={false}
            url={rxErrorsRateUrl}
            lineColor="#b72b2b"
            fillColor="rgba(183, 43, 43, 0.34)"
            dotColor="#b72b2b"
            dotHoverColor="#b72b2b"
            textColor="#ffffff"
            yAxisLabel="Count"
          />
        </div>
      </div>
    );
  }
}

export default NodeMetrics;
