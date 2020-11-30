import React from "react";
import Chart from "../../../shared/charts/chart";
// import { ResponsiveSankey } from "@nivo/sankey";

class ContainerSwoll extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      pod: props.pod,
      container: props.container
    };
  }

  render() {
    let self = this;
    let pod = self.props.pod;
    let container = self.props.container;
    console.log(pod);

    let ns = window.localStorage["csos-namespace"];

    let swTotalRateUrl = `/metrics/swoll/metrics/pods/${pod}?namespace=${ns}`;
    // let swErrorsTotalRateUrl = `/metrics/swoll/total_syscall_errors_rate/pods/${pod}?namespace=${ns}&container=${container}`; 
    console.log(swTotalRateUrl);
    return (
      <div className="container-chart-parent">
        <Chart
          name="swoll"
          title="Swoll Metrics"
          parentClass="chart-container"
          fakeData={false}
          url={swTotalRateUrl}
          lineColor="#58a757"
          fillColor="rgba(136, 214, 136, 0.27)"
          dotColor="#58a757"
          dotHoverColor="#58a757"
          yAxisLabel="Cores"
          modifier={(x) => parseFloat(x * 0.001)}
        />
      </div>
    );
  }
}

export default ContainerSwoll;
