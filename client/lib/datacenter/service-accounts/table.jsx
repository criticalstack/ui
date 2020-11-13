"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import h from "../../helpers";
import moment from "moment";

class Table extends React.Component {
  createRow(d) {
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    let secrets = d.hasOwnProperty("secrets") ? Object.keys(d.secrets).map(function(key) {
      return d.secrets[key].name;
    }).join(", ") || "-" : "-";

    let labels = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="serviceaccounts"
        data={d.metadata.labels} uid={d.metadata.uid} />;
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
          value: secrets
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
          value: "Secrets"
        },
        {
          value: "Created"
        },
        {
          value: "Labels"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="service-accounts-table"
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
