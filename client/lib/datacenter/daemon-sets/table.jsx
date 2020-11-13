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
          value: "Scheduled"
        },
        {
          value: "Desired"
        },
        {
          value: "Missed"
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
    let scheduled = 0;
    let desired = 0;
    let missed = 0;

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    if (d.hasOwnProperty("status")) {
      scheduled = d.status.hasOwnProperty("currentNumberScheduled") ? d.status.currentNumberScheduled : 0;
      desired = d.status.hasOwnProperty("desiredNumberScheduled") ? d.status.desiredNumberScheduled : 0;
      missed = d.status.hasOwnProperty("numberMisscheduled") ? d.status.numberMisscheduled : 0;
    }

    let labels = "None";
    let selectors = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="daemonsets"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    if (d.spec.hasOwnProperty("selector")) {
      selectors = <SelectorMaker scope="daemonsets"
        data={d.spec.selector} uid={d.metadata.uid} />;
    }

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: scheduled
        },
        {
          value: desired
        },
        {
          value: missed
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
          id="daemon-sets-table"
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
