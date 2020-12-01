import React from "react";
import { ResponsiveLine } from '@nivo/line'

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
        <ResponsiveLine
        data = {data}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: true, reverse: false }}
        yFormat=" >-.2f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          orient: 'bottom',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'timestamp',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
        axisLeft={{
          orient: 'left',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'value',
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        colors={{ scheme: 'dark2' }}
        lineWidth={5}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        areaBaselineValue={30}
        areaOpacity={0.3}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
      />
        </div>
    );
  }
}

export default ContainerSwoll;
