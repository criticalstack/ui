"use strict";

import React from "react";
import h from "../../helpers";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import ContainerTable from "../containers/container-table";
import moment from "moment";
import Sparklines from "../../../shared/charts/sparklines";
import PodMetrics from "./pod-metrics";
import _ from "lodash";

class PodTable extends React.Component {
  createRow(pod, i) {
    let self = this;
    let node = pod.spec.nodeName || "-";
    let name = pod.metadata.name || "-";
    let namespace = pod.metadata.namespace;
    let uid = pod.metadata.uid || "0000";
    let created = moment(pod.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let rawTime = moment(created).format("x");
    let started = "-";
    let localStart = "-";
    let uptime = "-";
    let statusIcon = <i className="glyphicons glyphicons-power container-on" />;
    let altStatusIcon = <i className="glyphicons glyphicons-refresh table-loading" />;
    let jobStatusIcon = <i className="glyphicons glyphicons-check table-job-complete" />;
    let podEvents = h.view.helpers.pod.createPodEvents(pod);
    let statusPhase = pod.status.hasOwnProperty("phase") ? pod.status.phase : false;
    let labels = (
      <span className="labels-empty">-</span>
    );

    if (pod.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="pod" data={pod.metadata.labels} uid={uid}/>;
    }

    let podStatusObj = h.view.helpers.pod.getPodStatus(pod, true);
    let podState = !podStatusObj.statusProblem ? podStatusObj.status : "Problem";
    let podStateBody = !podStatusObj.statusProblem ? `[${podStatusObj.total - podStatusObj.pending}/${podStatusObj.total}] ${podStatusObj.conditions}`
      :
      podStatusObj.statusMessage;

    switch (podState) {
      case "Problem":
        statusIcon = <i className="glyphicons glyphicons-power container-off" />;
        break;
      case "Running":
        started = pod.status.startTime;
        localStart = moment(started).format("YYYY-MM-DD HH:mm:ss");
        uptime = h.view.helpers.uptime(started);
        break;
      case "Pending":
        if (podEvents) {
          statusIcon = podEvents;
        } else {
          statusIcon = statusPhase === "Succeeded" ? jobStatusIcon : altStatusIcon;
        }

        break;
      case "Terminating":
        statusIcon = altStatusIcon;

        break;
      default:
        statusIcon = altStatusIcon;
    }

    let cpuChart = (
      <Sparklines
        namespace={namespace}
        name={name}
        height={30}
        width={180}
        delay={10}
        url={`/metrics/cpu/usage_rate/pods/${name}`}
        units="cpu"
        rightOverlay="chartLast"
        lineStyle={{
          stroke: "#58a757",
          fill: "#88d688",
          fillOpacity: 0.3
        }}
        svgStyle={{
          backgroundColor: "transparent"
        }}
        showLastValue={true}
      />
    );

    let memChart = (
      <Sparklines
        namespace={namespace}
        name={name}
        height={30}
        width={180}
        delay={10}
        url={`/metrics/memory/usage/pods/${name}`}
        rightOverlay="chartLast"
        lineStyle={{
          stroke: "#639DFD",
          fill: "#639DFD",
          fillOpacity: 0.3
        }}
        svgStyle={{
          backgroundColor: "transparent"
        }}
        showLastValue={true}
      />
    );

    let numContainers = pod.spec.containers.length;

    let row = {
      id: name,
      raw: pod,
      cells: [
      ]
    };

    let statusDetail = podEvents ?
      statusIcon
      :
      <div
        data-balloon={podStateBody}
        data-balloon-pos="right">
        {statusIcon}
      </div>;

    row.cells.push({
      value: statusDetail,
      style: {
        textAlign: "center",
        paddingLeft: 0
      }
    });

    row.cells.push({
      raw: name,
      value: <div className="row-count-wrapper">
        <strong>{name}</strong>
      </div>
    });

    if (self.props.includeMetrics) {
      row.cells.push({
        raw: cpuChart,
        value: <div key={`${name}-cpu`}>
          {cpuChart}
        </div>
      });
      row.cells.push({
        raw: memChart,
        value: <div key={`${name}-mem`}>
          {memChart}
        </div>
      });
    }

    row.cells.push({
      raw: numContainers,
      value: numContainers
    });

    row.cells.push({
      raw: node,
      value: node
    });

    row.cells.push({
      raw: rawTime,
      value: <div
        data-balloon={`created: ${created} started: ${localStart}`}
        data-balloon-pos="up">
        {uptime}
      </div>
    });

    row.cells.push({
      value: labels
    });

    return row;
  }

  render() {
    let head = {
      main: []
    };

    head.main.push({
      disableClick: true,
      value: <i className="glyphicons glyphicons-flash"></i>,
      className: "icon-cell",
      style: {
        width: "4%",
        textAlign: "center"
      }
    });

    head.main.push({
      value: "Pod Name"
    });

    if (this.props.includeMetrics) {
      head.main.push({
        value: "CPU(cores)",
        style: {
          width: "200px"
        }
      });

      head.main.push({
        value: "Memory(bytes)",
        style: {
          width: "200px"
        }
      });
    }

    head.main.push({
      value: "Containers",
      style: {
        textAlign: "center",
        width: "94px"
      }
    });

    head.main.push({
      value: "Node"
    });

    head.main.push({
      value: "Age",
      style: {
        minWidth: "100px"
      }
    });

    head.main.push({
      value: "Labels"
    });

    return (
      <div>
        {this.props.includeMetrics ? <PodMetrics /> : null}
        <TableBuilder
          id="pods-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
          hasOnRowClick={true}
          closeOnOpen={true}
          onRowClickRenderFunction={function(row) {
            let data = [];
            let pod = row.raw;
            let containers = row.raw.spec.containers;
            let containerStatuses = row.raw.status.containerStatuses || [];

            _.each(containers, function(c) {

              let name = c.name;
              let tmp;

              if (containerStatuses.length === 0) {
                // we are likely downloading
                tmp = {};
                tmp.metadata = c;
                tmp.status = [];
                tmp.pod = pod;
                data.push(tmp);
              } else {
                _.each(containerStatuses, function(cs) {
                  if (cs.name === name) {
                    tmp = {};
                    tmp.metadata = c;
                    tmp.status = cs;
                    tmp.pod = pod;
                    data.push(tmp);
                  }
                });
              }
            });

            return (
              <tr key="containers-table-tr-1">
                <td
                  className="sub-table-container"
                  colSpan="100%">
                  <div className="sub-table-arrow-box"></div>
                  <ContainerTable
                    data={data}
                    className="sub-table"
                  />
                </td>
              </tr>
            );

          }}
          sortOnRender={{
            enable: false,
            index: 4
          }}
        />
      </div>
    );
  }
}

export default PodTable;
