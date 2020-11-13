"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import moment from "moment";
import h from "../../helpers";
import _ from "lodash";

class Table extends React.Component {
  createRow(d) {
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let addresses = [{ip: "N/A"}];
    let ports = [{port: "N/A"}];
    let portDetail = "-";
    let pending = true;

    if (d.hasOwnProperty("subsets") && d.subsets !== null) {
      if (d.subsets.length > 0) {
        if (d.subsets[0].hasOwnProperty("notReadyAddresses")) {
          addresses = [{ip: "Pending"}];
          ports = [{port: "-"}];
        } else {
          pending = false;
          addresses = d.subsets[0].addresses || [{ip: "N/A"}];
          ports = d.subsets[0].ports || [{port: "N/A"}];
        }
      }
    }

    let labels = (
      <span className="labels-empty">-</span>
    );

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="endpoints" data={d.metadata.labels} uid={name} />;
    }

    let endpoints = _.keys(addresses).map(function(key) {
      return `${addresses[key].ip}`;
    }).join(", ");

    if (pending === false) {
      portDetail = _.keys(ports).map(function(key) {
        let port = ports[key].port || "-";
        let protocol = ports[key].protocol || "-";
        let portName = ports[key].name || "-";

        return `${port} (${protocol}/${portName})`;

      }).join(", ");
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
          value: endpoints
        },
        {
          value: portDetail
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
          value: "Endpoints"
        },
        {
          value: "Ports"
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
          id="endpoints-table"
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
