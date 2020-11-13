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
          value: "Namespace"
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
    let namespace = d.metadata.namespace;

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    let labels = "None";
    let selectors = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="jobs"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    if (d.spec.hasOwnProperty("selector")) {
      selectors = <SelectorMaker scope="jobs"
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
          value: namespace
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
          id="pod-presets-table"
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
