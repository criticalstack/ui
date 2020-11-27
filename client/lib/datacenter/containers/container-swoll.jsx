import React from "react";
// import Chart from "../../../shared/charts/chart";
import { ResponsiveSankey } from "@nivo/sankey";

class ContainerSwoll extends React.Component {

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

    // let swTotalRateUrl = `/metrics/swoll/total_syscall_rate/pods/${pod}?namespace=${ns}&container=${container}`;
    // let swErrorsTotalRateUrl = `/metrics/swoll/total_syscall_errors_rate/pods/${pod}?namespace=${ns}&container=${container}`; 

    let swollData = {
      "nodes": [ 
        { "id": "John", "color": "hsl(226, 70%, 50%)" },
        { "id": "Raoul", "color": "hsl(253, 70%, 50%)" },
        { "id": "Jane", "color": "hsl(178, 70%, 50%)" },
        { "id": "Marcel", "color": "hsl(32, 70%, 50%)" },
        { "id": "Ibrahim", "color": "hsl(264, 70%, 50%)" },
        { "id": "Junko", "color": "hsl(307, 70%, 50%)" }
      ],
      "links": [
        { "source": "Junko", "target": "John", "value": 154 },
        { "source": "Junko", "target": "Marcel", "value": 117 },
        { "source": "John", "target": "Marcel", "value": 75 },
        { "source": "Ibrahim", "target": "Jane", "value": 190 },
        { "source": "Ibrahim", "target": "John", "value": 69 },
        { "source": "Marcel", "target": "Jane", "value": 26 },
        { "source": "Raoul", "target": "Junko", "value": 171 },
        { "source": "Raoul", "target": "Ibrahim", "value": 61 }
      ],
    }


    return (
      <div className="container-chart-parent">
        <ResponsiveSankey
        data={swollData}
        margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
        align="justify"
        colors={{ scheme: 'category10' }}
        nodeOpacity={1}
        nodeThickness={18}
        nodeInnerPadding={3}
        nodeSpacing={24}
        nodeBorderWidth={0}
        nodeBorderColor={{ from: 'color', modifiers: [ [ 'darker', 0.8 ] ] }}
        linkOpacity={0.5}
        linkHoverOthersOpacity={0.1}
        enableLinkGradient={true}
        labelPosition="outside"
        labelOrientation="vertical"
        labelPadding={16}
        labelTextColor={{ from: 'color', modifiers: [ [ 'darker', 1 ] ] }}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            translateX: 130,
            itemWidth: 100,
            itemHeight: 14,
            itemDirection: 'right-to-left',
            itemsSpacing: 2,
            itemTextColor: '#999',
            symbolSize: 14,
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: '#000'
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
