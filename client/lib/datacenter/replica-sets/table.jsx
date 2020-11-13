"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import SelectorMaker from "../../../shared/selector-maker";
import h from "../../helpers";
import moment from "moment";

class Table extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Desired",
          style: {
            width: "80px"
          }
        },
        {
          value: "Current",
          style: {
            width: "80px"
          }
        },
        {
          value: "Ready",
          style: {
            width: "80px"
          }
        },
        {
          value: "Age"
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
    let name = d.metadata.name;
    let desired = d.spec.hasOwnProperty("replicas") ? d.spec.replicas : 0;
    let current = 0;
    let ready = 0;

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    if (d.hasOwnProperty("status")) {
      current = d.status.hasOwnProperty("replicas") ? d.status.replicas : 0;
      ready = d.status.hasOwnProperty("readyReplicas") ? d.status.readyReplicas : 0;
    }

    let labels = "None";
    let selectors = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="replicasets"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    if (d.spec.hasOwnProperty("selector")) {
      selectors = <SelectorMaker scope="replicasets"
        data={d.spec.selector} uid={d.metadata.uid} />;
    }

    let rowDisabled = desired > 0 ? false : true;

    let row = {
      id: name,
      raw: d,
      disabled: rowDisabled,
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
          value: ready
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
          id="replica-sets-table"
          route={this.props.route}
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

export default Table;
