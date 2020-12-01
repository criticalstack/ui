import React from "react";
import h from "../../helpers";
import { ResponsiveLine } from '@nivo/line'

class ContainerSwoll extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      pod: props.pod,
      container: props.container,
      data: [],
      plot: [],
      type: "totals",
      kind: "classifications"
    };
  }

  componentDidMount() {
    this.getSwollData();
  };

  processData(data) {
    const type = this.state.type;
    const kind = this.state.kind;
    let result = Object.keys(data[kind]).map((key) => {
      let entry = {
        id: key,
        color: "#ffa",
        data: []
      };
      data[kind][key][type].map((plot) => {
        entry.data.push({
          x: plot.timestamp,
          y: Number(plot.value)
        });

      });
      return entry;
    });
    console.log(result, "ishere");
    return result;
  }

  getSwollData() {
    let self = this;
    let pod = self.props.pod;
    let container = self.props.container;

    let ns = window.localStorage["csos-namespace"];

    let swTotalRateUrl = `/swoll/metrics/namespaces/${ns}/pods/${pod}/containers/${container}`;

    self.tmpRequest = h.fetch({
      dataType: "json",
      endpoint: swTotalRateUrl,
      resUrl: false,
      success: function(data) {
        self.tmpRequest = null;

        if (data.context.result) {
          data = data.context.result;
        }

        const plot = self.processData(data.Metrics);
        console.log(plot);

        self.setState({
          data,
          plot
        });
        console.log(self.state.plot, "isplot");
      }

    });

  };


  render() {
    let self = this;
    console.log(self.state.type, "hi");
    let data = self.state.plot; 
    return (
      <div className="container-swoll-parent">
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
