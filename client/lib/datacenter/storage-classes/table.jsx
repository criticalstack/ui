"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import moment from "moment";
import h from "../../helpers";

class Table extends React.Component {
  createRow(d) {
    let empty = "-";
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let provisioner = d.provisioner;

    let labels = d.metadata.hasOwnProperty("labels") ?
      <LabelMaker scope="pvc" data={d.metadata.labels} uid={d.metadata.uid} />
      : <span className="labels-empty">{empty}</span>;

    let row = {
      id: d.metadata.name,
      raw: d,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: provisioner
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
        }
      ]
    };

    return row;
  }

  render() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Provisioner"
        },
        {
          value: "Age"
        },
        {
          value: "Labels"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="storage-classes-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

export default Table;
