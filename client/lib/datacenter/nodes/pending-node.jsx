"use strict";

import React from "react";
import SimpleBar from "../../../shared/charts/simple-bar";

class PendingNode extends React.Component {

  render() {
    let node = this.props.node;

    let barColor = "#6ea7fd";
    let currentStage = "pending";

    return (
      <div className="node">
        <div className="node-header">
          <div className="node-header-parent">
            <div className="node-header-status">
              <i className="glyphicons glyphicons-refresh node-pending" />
            </div>

            <div className="node-header-name">
              {node.infraRef ? `${node.infraRef.kind}: ` : ""}{node.metadata.name}
            </div>
          </div>
        </div>
        <div className="node-pending-parent">
          <div className="node-pending-chart">
            <SimpleBar
              width={0}
              height="25px"
              color={barColor}
              parentStyle={{
                width: "100%",
                height: "100%",
                textAlign: "center",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
            />
          </div>
          <div className="node-pending-stage">
            {currentStage}
          </div>
        </div>
      </div>
    );
  }
}

export default PendingNode;
