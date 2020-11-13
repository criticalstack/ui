"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import moment from "moment";
import h from "../../helpers";

const csTypes = {
  Available: "glyphicons glyphicons-lock-open",
  Bound: "glyphicons glyphicons-lock",
  Released: "glyphicons glyphicons-roundabout",
  Failed: "glyphicons glyphicons-menu-close",
  Pending: "glyphicons glyphicons-history",
  Unknown: "glyphicons glyphicons-question-sign"
};

class Table extends React.Component {
  createRow(d) {
    let empty = "-";
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    let status = d.hasOwnProperty("status") ? d.status.phase : "Unknown";
    let statusIcon = csTypes[status];

    let labels = d.metadata.hasOwnProperty("labels") ?
      <LabelMaker scope="pvc" data={d.metadata.labels} uid={d.metadata.uid} />
      : <span className="labels-empty">-</span>;

    let requests = d.hasOwnProperty("spec") ? d.spec.resources.requests.storage : empty;
    let accessMode = d.hasOwnProperty("spec") ? d.spec.accessModes[0] : empty;

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          value: <div
            data-balloon={status}
            data-balloon-pos="up"
            style={{
              textAlign: "center"
            }}>
            <i
              style={{
                color: "#c9c9c9",
                fontSize: "20px",
                textAlign: "center"
              }}
              className={statusIcon}
            />
          </div>,
          style: {
            paddingLeft: 0
          }
        },
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          raw: requests,
          value: h.view.helpers.humanFileSize(requests)
        },
        {
          value: accessMode
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
          disableClick: true,
          value: <i className="glyphicons glyphicons-flash"></i>,
          className: "icon-cell",
          style: {
            width: "65px",
            textAlign: "center"
          }
        },
        {
          value: "Name"
        },
        {
          value: "Requests"
        },
        {
          value: "Access Mode"
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
          id="persistent-volume-claims-table"
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
