"use strict";

import React from "react";
import h from "../../helpers";
import TableBuilder from "../../../shared/table";
import { Link } from "react-router-dom";
import ClipboardEntry from "../../../shared/clipboard-entry";
import moment from "moment";

class ContainerTable extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      data: props.data
    };
  }

  componentDidMount() {
    this.setState({
      data: this.props.data
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.data !== prevProps.data) {
      this.setState({
        data: this.props.data
      });
    }
  }

  createRow(container) {
    let name = container.metadata.name || "-";
    let pod = container.pod.metadata.name;
    let id = pod + "-" + name + "-" + container.pod.metadata.uid;
    let created = moment(container.pod.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let started = "-";
    let localStart = "-";
    let uptime = "-";
    let rawTime = "-";
    let containerId = "-";
    let containerStatus = "-";
    let altStatusIcon = <i className="glyphicons glyphicons-refresh table-loading" />;
    let statusIcon = <i className="glyphicons glyphicons-power container-on" />;
    let restartCount = 0;

    // see if there is a problem with the pod
    let podStatusObj = h.view.helpers.pod.getPodStatus(container.pod, true);

    if (container.hasOwnProperty("status") && container.status.hasOwnProperty("containerID")) {
      let containerIdText = container.status.containerID;
      let containerIdShort = containerIdText.split("://")[1];
      containerId = (
        <ClipboardEntry
          displayText={`${containerIdText}`}
          copyText={containerIdShort}
          uniqueId={`copy-${containerIdShort}`}
          toolTip={containerIdText}
          style={{
            float: "left",
            height: "13px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "200px"
          }}
        />
      );
    }

    if (container.status.hasOwnProperty("restartCount") && container.status.restartCount > 0) {
      restartCount = (
        <span>
          {container.status.restartCount}
          <i className="glyphicons glyphicons-square-empty-alert container-icon-warn" />
        </span>
      );
    }

    if (container.status.ready !== true) {
      statusIcon = altStatusIcon;
      containerStatus = "Not Ready";
    }

    if (podStatusObj.statusProblem) {
      statusIcon = (
        <i className="glyphicons glyphicons-power container-view-status container-off" />
      );
    }

    if (container.status.state && container.status.state.hasOwnProperty("running") && container.status.state.running.hasOwnProperty("startedAt")) {
      started = container.status.state.running.startedAt;
      localStart = moment(started).format("YYYY-MM-DD HH:mm:ss");
      uptime = h.view.helpers.uptime(started);
      rawTime = moment(started).format("x");
    }

    let row = {
      id: id,
      raw: container,
      link: `/datacenter/pods/${pod}/${name}/0`,
      cells: [
        {
          column: "status",
          value: <Link
            to={`/datacenter/pods/${pod}/${name}/2`}
            onClick={h.view.helpers.stopProp}
            >
              <div
                data-balloon={containerStatus}
                data-balloon-pos="right"
              >
              {statusIcon}
            </div>
          </Link>,
          style: {
            textAlign: "center"
          }
        },
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: container.metadata.image
        },
        {
          value: containerId
        },
        {
          raw: rawTime,
          value: <div
            data-balloon={`Created: ${created} Started: ${localStart}`}
            data-balloon-pos="up"
          >
            {uptime}
          </div>
        },
        {
          value: restartCount
        }
      ]
    };

    return row;
  }

  render() {
    let head = {
      main: [
        {
          column: "status",
          value: <i className="glyphicons glyphicons-flash"></i>,
          className: "icon-cell",
          style: {
            width: "4%",
            textAlign: "center"
          }
        },
        {
          value: "Container Name"
        },
        {
          value: "Image"
        },
        {
          value: "Container ID"
        },
        {
          value: "Uptime",
          style: {
            width: "150px"
          }
        },
        {
          value: "Restarts",
          style: {
            width: "88px"
          }
        }
      ]
    };

    return (
        <TableBuilder
          id="containers-table"
          route={this.props.route}
          head={head}
          body={this.state.data.map((d) => this.createRow(d))}
          className={this.props.className}
          subTable={true}
          hasOnRowClick={true}
          hasCheckbox={false}
        />
    );
  }
}

export default ContainerTable;
