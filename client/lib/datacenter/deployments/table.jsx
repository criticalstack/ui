"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import SelectorMaker from "../../../shared/selector-maker";
import h from "../../helpers";
import moment from "moment";

class Table extends React.Component {
  createHeadings() {
    var head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Desired"
        },
        {
          value: "Current"
        },
        {
          value: "Up To Date"
        },
        {
          value: "Available"
        },
        {
          value: "Age",
          style: {
            minWidth: "100px"
          }
        },
        {
          value: "Labels"
        },
        {
          value: "Selectors"
        }
      ]
    };

    return head;
  }

  createRow(d) {
    var name = d.metadata.name;
    var desired = d.spec.hasOwnProperty("replicas") ? d.spec.replicas : 0;
    var current = 0;
    var upToDate = 0;
    var available = 0;

    if (d.hasOwnProperty("status")) {
      current = d.status.hasOwnProperty("replicas") ? d.status.replicas : 0;
      upToDate = d.status.hasOwnProperty("updatedReplicas") ? d.status.updatedReplicas : 0;
      available = d.status.hasOwnProperty("availableReplicas") ? d.status.availableReplicas : 0;
    }

    var created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    var uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    var labels = "None";
    var selectors = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="deployments"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    if (d.spec.hasOwnProperty("selector")) {
      selectors = <SelectorMaker scope="deployments"
        data={d.spec.selector} uid={d.metadata.uid} />;
    }

    var row = {
      id: name,
      raw: d,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: desired
        },
        {
          value: current
        },
        {
          value: upToDate
        },
        {
          value: available
        },
        {
          raw: rawTime,
          value: <div
            data-balloon={`created: ${created}`}
            data-balloon-pos="up">
            {uptime}
          </div>
        },
        {
          value: labels
        },
        {
          value: selectors
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <div>
        <TableBuilder
          id="deployments-table"
          route={this.props.route}
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
          closeOnOpen={true}
        />
      </div>
    );
  }
}

export default Table;
