"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import h from "../../helpers";
import moment from "moment";
import LabelMaker from "../../../shared/label-maker";

class Table extends React.Component {
  createRow(d) {
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created) || "-";
    let rawTime = moment(created).format("x");
    let labels = "None";
    let scope = d.spec.scope;
    let icon;

    if (scope === "Namespaced") {
      icon = <i className="csicon csicon-namespace"
        style={{
          color: "#686868",
          fontSize: "18px"
        }}
        />;
    } else {
      icon = <i className="glyphicons glyphicons-cluster"
        style={{
          color: "#e91e63",
          fontSize: "20px"
        }}
      />;
    }

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="namespaces"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    let row = {
      id: name,
      raw: d,
      filter: [name, scope],
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          raw: scope,
          value: <span
            data-balloon={scope}
            data-balloon-pos="up">
            {icon}
          </span>,
          style: {
            width: "4%",
            textAlign: "center"
          }
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
          value: "Scope"
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
          id="custom-resource-definitions-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map(this.createRow.bind(this))}
          hasCheckbox={false}
          sort={true}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

export default Table;
