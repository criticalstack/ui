"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";

class DryRunSubTable extends React.Component {

  createHeadings() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Labels"
        }
      ]
    };

    return head;
  }

  createRow(d) {
    let name = d.metadata.name;
    let labels = "None";

    let data = {
      d: d,
      icon: this.props.icon
    };

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="dryrun-resources"
        data={d.metadata.labels} uid={d.metadata.name} />;
    }

    let row = {
      id: name,
      raw: data,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: labels
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <div>
        <TableBuilder
          id="sub-dryrun-table"
          route={this.props.route}
          className={this.props.className}
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          subTable={true}
        />
      </div>
    );
  }
}

export default DryRunSubTable;
