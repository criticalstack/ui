"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import h from "../../helpers";
import _ from "lodash";
import moment from "moment";

class Table extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Type"
        },
        {
          value: "Service"
        },
        {
          value: "Hosts"
        },
        {
          value: "Address"
        },
        {
          value: "Ports"
        },
        {
          value: "Age"
        },
        {
          value: "Labels"
        }
      ]
    };

    return head;
  }

  createRow(d) {
    let empty = "-";
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let hosts = [];
    let address = empty;
    let service = [];
    let ports = [];
    let type = empty;

    if (!d.metadata.hasOwnProperty("labels")) {
      d.metadata.labels = {};
    }

    // currently can be simple, or fanout
    if (d.spec.hasOwnProperty("backend")) {
      type = "Simple";
      hosts.push("*");
      ports.push(_.get(d, "spec.backend.servicePort", empty));
      service.push(_.get(d, "spec.backend.serviceName", empty));
    } else {
      type = "Fanout";
      let rules = d.spec.rules || [];

      _.forEach(rules, function(r) {
        hosts.push(r.host);
        _.forEach(r.http.paths, function(p) {
          service.push(p.backend.serviceName);
          ports.push(p.backend.servicePort);
        });
      });
    }

    let labels = (
      <span className="labels-empty">-</span>
    );

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="ingress" data={d.metadata.labels} uid={d.metadata.uid} />;
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
          value: type
        },
        {
          value: service.join()
        },
        {
          value: hosts.join()
        },
        {
          value: address
        },
        {
          value: ports.join()
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
    return (
      <div>
        <TableBuilder
          id="ingress-table"
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
