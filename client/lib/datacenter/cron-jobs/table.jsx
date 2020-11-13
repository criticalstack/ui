"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import SelectorMaker from "../../../shared/selector-maker";
import h from "../../helpers";
import _ from "lodash";
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
          value: "Schedule"
        },
        {
          value: "Last Schedule"
        },
        {
          value: "Concurrency"
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
    let schedule = d.spec.schedule;
    let suspend = d.spec.hasOwnProperty("suspend") ? d.spec.suspend : false;

    let statusLast = _.get(d.status, "lastScheduleTime", false);
    let lastSchedule = statusLast ? moment(d.metadata.statusLast).format("YYYY-MM-DD HH:mm:ss") : "Pending";
    let concurrency = d.spec.concurrencyPolicy;

    let statusIcon = <i className="glyphicons glyphicons-roundabout table-job-running" />;
    let statusMessage = "Running";

    // we haven't started running yet (or are broken)
    if (!statusLast) {
      statusIcon = <i className="glyphicons glyphicons-hourglass table-job-pending" />;
      statusMessage = "Pending";
    }

    // we are paused
    if (suspend) {
      statusIcon = <i className="glyphicons glyphicons-pause table-job-paused" />;
      statusMessage = "Paused";
    }

    let labels = "None";
    let selectors = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="cronjobs"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    if (d.spec.hasOwnProperty("selector")) {
      selectors = <SelectorMaker scope="cronjobs"
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
          value: schedule
        },
        {
          value: lastSchedule
        },
        {
          value: concurrency
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
          id="cron-jobs-table"
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
