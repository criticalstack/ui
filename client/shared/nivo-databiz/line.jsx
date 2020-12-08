import React from "react";
import { ResponsiveLine } from "@nivo/line";
import { ThemeProvider, SvgWrapper } from "@nivo/core";

const MyResponsiveLine = (props) => {

  return (
    <ResponsiveLine
        data={props.data}
        margin={{ top: 50, right: 200, bottom: 100, left: 80 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: "auto", max: "auto", stacked: true, reverse: false }}
        yFormat=" >-.2f"
        curve="monotoneY"
        axisTop={null}
        axisRight={null}
        axisBottom={{
            orient: "bottom",
            tickSize: 5,
            tickPadding: 8,
            tickRotation: 0,
            legend: "Timestamp",
            legendOffset: 50,
            legendPosition: "middle"
        }}
        axisLeft={{
            orient: "left",
            tickSize: 5,
            tickPadding: 8,
            tickRotation: 0,
            legend: "Value",
            legendOffset: -50,
            legendPosition: "middle"
        }}
        theme={{ background: "#fff"}}
        colors={{ scheme: "paired" }}
        pointSize={10}
        pointColor={{ from: "color", modifiers: [] }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "color", modifiers: [] }}
        pointLabelYOffset={-12}
        enableSlices={false}
        areaBaselineValue={20}
        areaOpacity={0.15}
        useMesh={true}
        legends={[
            {
                anchor: "right",
                direction: "column",
                justify: false,
                overflow: "scroll",
                top: "regular",
                bottom: 50,
                translateX: 100,
                translateY: 0,
                itemsSpacing: 5,
                itemDirection: "left-to-right",
                itemWidth: 75,
                itemHeight: 25,
                itemOpacity: 0.75,
                symbolSize: 12,
                symbolShape: "square",
                symbolBorderColor: "rgba(0, 0, 0, .5)",
                effects: [
                    {
                        on: "hover",
                        style: {
                            itemBackground: "rgba(0, 0, 0, .03)",
                            itemOpacity: 1
                        }
                    }
                ]
            }
        ]}
    />
  );
};

export default MyResponsiveLine;

