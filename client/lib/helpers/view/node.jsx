"use strict";

import React from "react";
import moment from "moment";
import Tooltip from "react-tooltip";
import _ from "lodash";

var NodeHelpers = {
  createNodeConditions(node, type) {

    var errorCount = 0;
    var errorDetail = [];

    if (node.hasOwnProperty("status")) {
      if (node.status.hasOwnProperty("conditions") && node.status.conditions.length > 0) {
        node.status.conditions.map(function(n, i) {
          if (n.type === "Ready") {
            if (n.status === "False" || n.status === "Unknown") {
              errorCount++;
            }
          } else {
            if (n.status === "True" || n.status === "Unknown") {
              errorCount++;
            }
          }

          errorDetail.push(
            <tr key={i}>
              <td>{n.status}</td>
              <td>{n.type}</td>
              <td>{n.reason}</td>
              <td>{moment(n.lastHeartbeatTime).format("YYYY-MM-DD HH:mm:ss")}</td>
              <td>{moment(n.lastTransitionTime).format("YYYY-MM-DD HH:mm:ss")}</td>
            </tr>
          );
        });
      }
    }

    var conditions = (errorCount > 0 ?
      <div
        data-tip
        data-for={`tip-${node.metadata.name}`}>

        <Tooltip
          id={`tip-${node.metadata.name}`}
          effect="float">
          <table className="node-conditions">
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Last Heartbeat</th>
                <th>Last Transition</th>
              </tr>
            </thead>
            <tbody>
              {errorDetail}
            </tbody>
          </table>
        </Tooltip>

        {type === "card" ?
          <div className="status-tag">
            <span>{errorCount}</span>
            <i className="glyphicons glyphicons-circle-empty-alert" />
          </div> : <i className="glyphicons glyphicons-power container-off" />
        }
      </div> : ""
    );

    return conditions;
  },

  nodeMachine(node) {
    let a = _.get(node, "metadata.annotations", null);
    if (!a) {
      return false;
    }
    let j = a["machine.crit.sh/machine"];
    try {
      let m = JSON.parse(j);
      return m;
    } catch (e) {}
    return false;
  },

  isControlPlane(node) {
    return _.get(node, "metadata.labels", {}).hasOwnProperty("node-role.kubernetes.io/master");
  }
};

export default NodeHelpers;
