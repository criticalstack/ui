"use strict";

import React from "react";
import h from "../../helpers";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import SelectorMaker from "../../../shared/selector-maker";
import moment from "moment";

class Table extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          disableClick: true,
          value: <i className="glyphicons glyphicons-flash"></i>,
          className: "icon-cell",
          style: {
            width: "4%",
            textAlign: "center"
          }
        },
        {
          value: "Name"
        },
        {
          value: "Started"
        },
        {
          value: "Ended"
        },
        {
          value: "Duration"
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

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    let started = d.status.hasOwnProperty("startTime") ? moment(d.status.startTime).format("YYYY-MM-DD HH:mm:ss") : "-";
    let completed = d.status.hasOwnProperty("completionTime") ? moment(d.status.completionTime).format("YYYY-MM-DD HH:mm:ss") : "-";
    let duration = "-";

    let statusIcon = <i className="glyphicons glyphicons-roundabout table-job-running" />;
    let statusMessage = "Running";

    if (d.status.hasOwnProperty("completionTime")) {
      statusIcon = <i className="glyphicons glyphicons-check table-job-complete" />;
      statusMessage = "Completed";
      duration = `${moment(completed).diff(started, "minutes")} minutes`;
    }

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
          value: <div
            data-balloon={statusMessage}
            data-balloon-pos="right"
            style={{
              marginRight: "10px"
            }}>
            {statusIcon}
          </div>,
          style: {
            textAlign: "center"
          }
        },
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: started
        },
        {
          value: completed
        },
        {
          value: duration
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
          id="jobs-table"
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
