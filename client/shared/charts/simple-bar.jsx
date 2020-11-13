"use strict";

import React from "react";

class SimpleBar extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let self = this;

    let width = self.props.width || 0;
    let value = width || 0;
    let height = self.props.height || "25px";
    let color = self.props.color || "#6ea7fd";
    let parentStyle = self.props.hasOwnProperty("parentStyle")
      ? self.props.parentStyle
      : {};

    if (value > 100) {
      width = 100;
    }

    return (
      <div style={parentStyle}>
        <div
          style={{
            width: "70%",
            height: height,
            borderRadius: "4px",
            backgroundColor: "#e6e6e6",
            float: "left"
          }}>
          <div
            style={{
              width: `${width}%`,
              height: height,
              borderRadius: "4px",
              backgroundColor: color
            }}>
          </div>
        </div>
        <div
          style={{
            color: "#777676",
            height: "25px",
            float: "left",
            marginLeft: "10px",
            fontWeight: "bold",
            paddingTop: "5px",
            fontSize: "12px"
          }}>
          {value}%
        </div>
      </div>
    );
  }
}

export default SimpleBar;
