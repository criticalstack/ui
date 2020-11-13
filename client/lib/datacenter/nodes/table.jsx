"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import NoResult from "../../../shared/no-result";
import LabelMaker from "../../../shared/label-maker";
import CopyToClipboard from "react-copy-to-clipboard";
import Tooltip from "react-tooltip";
import Sparklines from "../../../shared/charts/sparklines";
import NodeMetrics from "./node-metrics";
import _ from "lodash";
import h from "../../helpers";
import moment from "moment";

class Table extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      params: {
        tab: 0
      }
    };
  }

  handleSelect(index) {
    let params = this.state.params;
    params.tab = index;

    this.setState({
      params: params
    });
  }

  renderLabels(labels) {
    let html = [];

    _.each(labels, function(value, key) {

      let separator = value.length > 0 ? <span className="tag-split">=</span> : null;
      let tooltip = value.length > 0 ? `${key}=${value}` : key;

      html.push(<span key={key}
        className="clipboard-icon-container"
        onClick={function(e) {
          h.view.helpers.stopProp(e);

          h.Vent.emit("notification", {
            message: `${h.view.helpers.truncate(value, 20)} was copied to clipboard`
          });
        }}>
        <CopyToClipboard text={value}>
          <span className="tag" data-tip
            data-for={`node-tag-${value}-${key}`}>
            <Tooltip
              id={`node-tag-${value}-${key}`}
              effect="float">
              {tooltip}
            </Tooltip>

            <span className="tag-key">{key}</span>
            {separator}
            {value.length > 0 ? <span className="tag-value">{value}</span> : null}
          </span>
        </CopyToClipboard>
      </span>);
    });

    return html;
  }

  createRow(d) {
    let self = this;
    let node = d;
    let name = node.metadata.name;
    let nodeConditions = h.view.helpers.node.createNodeConditions(node, "table");
    let nodeKernelVersion = node.status.nodeInfo.kernelVersion;
    let nodeCreated = moment(node.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let nodeUptime = h.view.helpers.uptime(node.metadata.creationTimestamp);
    let pods = d.pods || [];
    let numPods = pods.length;
    let cpus = `${node.status.capacity.cpu} xCPU`;
    let mems = h.view.helpers.humanFileSize(node.status.capacity.memory.replace("Ki", "") * 1024, false);
    let statusDetail = !nodeConditions ?
      <div
        data-balloon="Online"
        data-balloon-pos="right">
        <i className="glyphicons glyphicons-power container-on" />
      </div>
      : nodeConditions;

    let labels = (
      <div className="node-tags" style={{textAlign: "left"}}>
        {self.renderLabels(node.metadata.labels)}
      </div>
    );

    let cpuChart = (
      <Sparklines
        namespace={"table"}
        name={name}
        height={40}
        width={200}
        delay={10}
        spots={true}
        url={`/metrics/cpu/usage_rate/nodes/${name}`}
        units="cpu"
        id="cpu-"
        leftOverlay={cpus}
        rightOverlay="chartLast"
        lineStyle={{
          stroke: "#58a757",
          fill: "#88d688",
          fillOpacity: 0.3
        }}
      />
    );

    let memChart = (
      <Sparklines
        namespace={"table"}
        name={name}
        height={40}
        width={200}
        delay={10}
        spots={true}
        url={`/metrics/memory/usage/nodes/${name}`}
        units="mem"
        leftOverlay={mems}
        rightOverlay="chartLast"
        lineStyle={{
          stroke: "#639DFD",
          fill: "#639DFD",
          fillOpacity: 0.3
        }}
      />
    );

    let row = {
      id: name,
      raw: d,
      cells: [
      ],
      nodeMetrics: <NodeMetrics node={name} />
    };

    row.cells.push({
      value: statusDetail,
      style: {
        textAlign: "center"
      }
    });

    row.cells.push({
      raw: name,
      value: <strong>{name}</strong>
    });

    row.cells.push({
      raw: nodeKernelVersion,
      value: nodeKernelVersion
    });

    if (self.props.includeMetrics) {
      row.cells.push({
        raw: cpuChart,
        value: cpuChart
      });
      row.cells.push({
        raw: memChart,
        value: memChart
      });
    }

    row.cells.push({
      raw: numPods,
      value: numPods
    });

    row.cells.push({
      raw: nodeUptime,
      value: <div
        data-balloon={`created: ${nodeCreated}`}
        data-balloon-pos="up">
        {nodeUptime}
      </div>
    });

    row.cells.push({
      value: labels
    });

    return row;
  }

  createSubRow(p) {
    let self = this;
    let pods = p.raw.pods || [];
    let subBody = [];
    let subHead = {
      main: []
    };

    subHead.main.push({
      disableClick: true,
      value: <i className="glyphicons glyphicons-flash"></i>,
      className: "icon-cell",
      style: {
        width: "4%",
        textAlign: "center"
      }
    });

    subHead.main.push({
      value: "Pod Name"
    });

    subHead.main.push({
      value: "Pod IP"
    });

    if (self.props.includeMetrics) {
      subHead.main.push({
        value: "CPU(cores)",
        style: {
          width: "200px"
        }
      });
      subHead.main.push({
        value: "Memory(bytes)",
        style: {
          width: "200px"
        }
      });
    }

    subHead.main.push({
      value: "Containers",
      style: {
        textAlign: "center",
        width: "94px"
      }
    });

    subHead.main.push({
      value: "Node"
    });

    subHead.main.push({
      value: "Age",
      style: {
        minWidth: "100px"
      }
    });

    subHead.main.push({
      value: "Labels"
    });

    _.each(pods, function(pod) {
      let node = pod.spec.nodeName || "-";
      let name = pod.metadata.name || "-";
      let namespace = pod.metadata.namespace;
      let uid = pod.metadata.uid || "0000";
      let created = moment(pod.metadata.creationtimestamp).format("YYYY-MM-DD HH:mm:ss");
      let started = "-";
      let localStart = "-";
      let uptime = "-";
      let statusIcon = <i className="glyphicons glyphicons-power container-on" />;
      let altStatusIcon = <i className="glyphicons glyphicons-refresh table-loading" />;
      let podEvents = h.view.helpers.pod.createPodEvents(pod);
      let podIP = pod.status.podIP || "-";
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
            statusIcon = altStatusIcon;
          }

          break;
        case "Terminating":
          statusIcon = altStatusIcon;

          break;
        default:
          statusIcon = altStatusIcon;
      }

      let ns = window.localStorage["csos-namespace"];

      let cpuChart = (
        <Sparklines
          namespace={namespace}
          name={name}
          height={30}
          width={180}
          delay={10}
          url={`/metrics/cpu/usage_rate/pods/${name}?namespace=${ns}`}
          units="cpu"
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
          url={`/metrics/memory/usage/pods/${name}?namespace=${ns}`}
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
        search: name,
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
          textAlign: "center"
        }
      });

      let container = _.get(pod.spec.containers[0], "name", "unknown");
      let containerUrl = `/datacenter/pods/${pod.metadata.name}/${container}/0`;

      row.cells.push({
        raw: name,
        value: <div className="row-count-wrapper">
          <span
            className="container-name"
            onClick={() => h.Vent.emit("link", containerUrl)}
          >
              <strong>{name}</strong>
            </span>
          </div>
      });

      row.cells.push({
        raw: podIP,
        value: podIP
      });

      if (self.props.includeMetrics) {
        row.cells.push({
          raw: cpuChart,
          value: cpuChart
        });
        row.cells.push({
          raw: memChart,
          value: memChart
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
        raw: uptime,
        value: <div
          data-balloon={`created: ${created} started: ${localStart}`}
          data-balloon-pos="up">
          {uptime}
        </div>
      });

      row.cells.push({
        value: labels
      });

      subBody.push(row);
    });

    let podTable = (
      <NoResult
        title="No Pods"
        body="No Pods were found"
        icon="csicon csicon-pods"
        status={"warning"}
        style={{
          backgroundColor: "#f1f2f6",
          minHeight: "500px",
          border: "1pt solid #5d6e79",
          borderRadius: "3px"
        }}
      />
    );

    if (pods.length > 0) {
      podTable = (
        <TableBuilder
          id="sub-nodes-table"
          loading={false}
          head={subHead}
          body={subBody}
          className={"sub-table"}
          hasOnRowClick={false}
          closeOnOpen={true}
          sort={true}
          filter={false}
          subTable={true}
          hasCheckBox={false}
        />
      );
    }

    let activeTab = Number(self.state.params.tab) || 0;
    let nodeMetrics = p.nodeMetrics;

    return (
      <tr key="nodes-subtable">
        <td
          className="sub-table-container"
          colSpan="100%">
          <div className="cs-tabs-parent">
            <Tabs
              onSelect={(index) => this.handleSelect(index)}
              className="cs-tabs"
              selectedIndex={activeTab}>
              <TabList>
                <Tab>
                  <span className="tab-label">
                    <i className="csicon csicon-pods tab-icon" />
                    Pods
                  </span>
                </Tab>

                {self.props.includeMetrics ? (
                  <Tab>
                    <span className="tab-label">
                      <i className="glyphicons glyphicons-stats tab-icon" />
                      Metrics
                    </span>
                  </Tab>
                ) : null}

                </TabList>

                <TabPanel>
                  {podTable}
                </TabPanel>

                {self.props.includeMetrics ? (
                  <TabPanel>
                    {nodeMetrics}
                  </TabPanel>
                ) : null}

                </Tabs>
              </div>
            </td>
          </tr>
    );
  }

  render() {
    let main = [];
    main.push(
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
        value: "Node Name",
        style: {
          width: "200px"
        }
      },
      {
        value: "Version",
        style: {
          width: "200px"
        }
      }
    );

    if (this.props.includeMetrics) {
      main.push(
        {
          value: "CPU (core)"
        },
        {
          value: "Memory (bytes)"
        }
      );
    }

    main.push(
      {
        value: "Pods"
      },
      {
        value: "Age",
        style: {
          minWidth: "100px"
        }
      },
      {
        value: "Labels"
      }
    );

    let head = {
      main
    };

    return (
      <div>
        <TableBuilder
          id="nodes-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.filter(d => !d.pending).map(d => this.createRow(d))}
          hasOnRowClick={true}
          onRowClickRenderFunction={pods => this.createSubRow(pods)}
          closeOnOpen={true}
          hasCheckbox={true}
        />
          </div>
    );
  }
}

export default Table;
