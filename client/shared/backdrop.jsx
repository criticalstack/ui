"use strict";

import React from "react";
import Trianglify from "react-trianglify";

class Backdrop extends React.Component {
  calcCellSize() {
    let size = 0;
    let min = 30;
    let seed = this.props.seed;

    for (var char of seed) {
      size += char.charCodeAt();
    }

    size = size / 10;

    if (size <= min) {
      return min;
    }

    return size;
  }

  render() {
    let xColors = this.props.hasOwnProperty("xColors") && this.props.xColors.length > 0
      ? this.props.xColors
      : "random";
    let yColors = this.props.hasOwnProperty("yColors") && this.props.yColors.length > 0
      ? this.props.yColors
      : "random";

    return (
      <Trianglify
        width={this.props.width}
        height={this.props.height}
        seed={this.props.seed}
        x_colors={xColors}
        y_colors={yColors}
        cell_size={this.calcCellSize()}
      />
    );
  }
}

export default Backdrop;
