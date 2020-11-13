"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import h from "../../helpers";
import _ from "lodash";
import moment from "moment";

class MPInstallationsSubTable extends React.Component {

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
          value: "Version"
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
    let name = d.metadata.name;

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    let status = _.get(d.spec, "info.status", "unknown");
    let statusMessage = _.get(d.spec, "info.description", "unknown");

    let statusIcon;

    switch (status) {
        case "deployed":
            statusIcon = <i className="glyphicons glyphicons-circle-empty-check table-release deployed" />;
            break;
        case "uninstalled":
            statusIcon = <i className="glyphicons glyphicons-minus table-release uninstalled" />;
            break;
        case "superseded":
            statusIcon = <i className="glyphicons glyphicons-history table-release superseded" />;
            break;
        case "failed":
            statusIcon = <i className="glyphicons glyphicons-circle-empty-alert table-release failed" />;
            break;
        case "uninstalling":
            statusIcon = <i className="glyphicons glyphicons-restart table-release uninstalling" />;
            break;
        case "pending-install":
            statusIcon = <i className="glyphicons glyphicons-refresh table-loading table-release pending-install" />;
            break;
        case "pending-upgrade":
            statusIcon = <i className="glyphicons glyphicons-refresh table-loading table-release pending-upgrade" />;
            break;
        case "pending-rollback":
            statusIcon = <i className="glyphicons glyphicons-refresh table-loading table-release pending-rollback" />;
            break;
        case "unknown":
        default:
            statusIcon = <i className="glyphicons glyphicons-refresh table-loading table-release job-running" />;
            break;
    }

    let labels = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="releases"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          value: <div
            data-balloon={`${status}: ${statusMessage}`}
            data-balloon-pos="right">
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
          value: d.spec.chart.metadata.version
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
          id="releases-table"
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

export default MPInstallationsSubTable;
