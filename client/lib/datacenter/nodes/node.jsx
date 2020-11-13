"use strict";

import React from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import _ from "lodash";
import h from "../../helpers";
import Tooltip from "react-tooltip";
import LabelEditor from "../../../shared/label-editor";
import MenuMaker from "../../../shared/menu-maker";
import Sparklines from "../../../shared/charts/sparklines";

class Node extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      id: props.id,
      node: props.node,
      podDisplayLimit: 12,
      ignoreTerminating: true,
      includeMetrics: props.includeMetrics,
      isNodeAlive: false
    };

    this.icons = props.icons;
  }

  componentWillUnmount() {
    this.destroyState();
  }

  destroyState(callback) {
    if (callback && typeof callback === "function") {
      return callback();
    }
  }

  renderLables(labels) {
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

    if (html.length === 0) {
      html = "No labels found";
    }

    return html;
  }

  makePodList(pods, nodeStatus) {
    let self = this;
    let display = [];

    pods = pods.filter((p) => p);

    for (let n = 0; n < pods.length; n++) {
      let pod = pods[n];

      if (!pod.hasOwnProperty("metadata")) {
        return;
      }

      let container = _.get(pod.spec.containers[0], "name", "unknown");
      let containerUrl = `/datacenter/pods/${pod.metadata.name}/${container}/0`;

      let obj = h.view.helpers.pod.getPodStatus(pod, true);

      let ps = nodeStatus ? obj.status : "Node Offline";
      let statusClass = ps === "Node Offline" ? "Failed" : pod.status.phase;
      let iconType = "csicon csicon-pods";
      if (pod.metadata.hasOwnProperty("labels")) {
        iconType = pod.metadata.labels["job-name"] ? "csicon csicon-jobs" : "csicon csicon-pods";
      }

      let pc = obj.conditions;

      if (self.state.ignoreTerminating && ps === "Terminating") {
        continue;
      }

      let toolTip = nodeStatus ? pc.length > 1 ? pc.map(function(p, pi) {
        return `<div class="node-pod-status-tooltip" data-key="${pi}">${p}</div>`;
      }).join("") : pc[0] : "Node Offline";

      let html = (
        <div
          data-tip
          data-for={"pod-state-" + pod.metadata.uid + n}
          className={"node-container grid-50 " + pod.status.phase}
          key={pod.metadata.uid}>

          <Tooltip id={"pod-state-" + pod.metadata.uid + n}
            html={true}
            place="top"
            type="dark"
            effect="float">
            {pod.metadata.name}
            {toolTip}
          </Tooltip>

          <i className={`${iconType} ${statusClass}`}></i>

          <span
            className="container-name"
            onClick={() => h.Vent.emit("link", containerUrl)}
          >
            {pod.metadata.name}
          </span>

          <span className="container-address">{pod.status.podIP}</span>
        </div>

      );

      display.push(html);
    }

    return (
      <div id="node-pods-shown">
        {display}
      </div>
    );
  }

  render() {
    let self = this;
    let node = this.props.node;
    let nodeConditions = h.view.helpers.node.createNodeConditions(node, "card");
    let pods = this.props.node.pods || [];
    let hasLabels = node.metadata.hasOwnProperty("labels");
    let isMaster = false;
    if (hasLabels) {
      isMaster = node.metadata.labels.hasOwnProperty("node-role.kubernetes.io/master");
    }

    let nodeStatusText = "False";
    _.each(_.get(node, "status.conditions", []), function(c) {
      if (c.reason === "KubeletReady") {
        nodeStatusText = c.status;
      }
    });

    let nodeMainAddr = "N/A";
    let nodeAddrList = "";

    if (_.get(node, "status.addresses", []).length > 0) {
      nodeMainAddr = node.status.addresses[0].address;

      _.each(node.status.addresses, function(addr, i) {
        if (addr) {
          nodeAddrList += `<span key=${i}>${addr.address} (${addr.type})</span><br />`;
        }
      });
    }

    let nodeStatus = nodeStatusText === "True" ? true : false;
    let nodeStatusClass = nodeStatus ? "active" : "offline";
    let nodeStatusIcon = nodeStatus ? "csicon csicon-status-active" : "csicon csicon-status-inactive";

    let podList = this.makePodList(pods, nodeStatus);

    let cpuChart = (
      <Sparklines
        height={40}
        width={200}
        delay={10}
        spots={false}
        url={`/metrics/cpu/usage_rate/nodes/${node.metadata.name}`}
        units="cpu"
        id="cpu-"
        parentClass="node-metadata-chart cpu"
        rightOverlay="chartLast"
        lineStyle={{
          stroke: "#58a757",
          fill: "#88d688",
          fillOpacity: 0.1
        }}
      />
    );

    let memChart = (
      <Sparklines
        height={40}
        width={200}
        delay={10}
        spots={false}
        url={`/metrics/memory/usage/nodes/${node.metadata.name}`}
        units="mem"
        parentClass="node-metadata-chart mem"
        rightOverlay="chartLast"
        lineStyle={{
          stroke: "#639DFD",
          fill: "#639DFD",
          fillOpacity: 0.1
        }}
      />
    );

    let deleteNode = {};

    if (!isMaster) {
      deleteNode = {
        "icon": "glyphicons glyphicons-bin menu-icon-warn",
        "divider": "menu-divider-top",
        "name": "Delete",
        "link": function(e, that, raw) {
          let endpoint = `/nodes/${raw.metadata.name}`;
          h.Vent.emit("layout:confirm:open", {
            open: true,
            title: `Confirm Request: Delete Node ${raw.metadata.name}?`,
            message: `Are you sure you want to delete this node ${raw.metadata.name}? This action cannot be reversed.`,
            onAction: function() {
              h.Vent.emit("notification", {
                message: `Deleting Node ${raw.metadata.name}`
              });

              h.Vent.emit("layout:confirm:close");

              h.fetch({
                method: "delete",
                endpoint: endpoint,
              });
            }
          });
        }
      };
    }

    let nodeLabels = {
      "icon": "glyphicons glyphicons-tags menu-icon",
      "name": "Labels",
      "link": function(e, that, raw) {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: (
            <span>
              <i className="glyphicons glyphicons-tags dialog-title-icon" />
              {`Editing labels on ${node.metadata.name}`}
            </span>
          ),
          message: <LabelEditor resource={"nodes"} data={raw} />,
          disableButtons: true
        });
      }
    };

    let menuData = {
      "entries": {
        0: nodeLabels,
        1: deleteNode
      },
      "args": {
        "icon": "csicon csicon-gear node-header-menu-gear",
        "ariaLabel": "Options menu"
      }
    };

    let externalID = _.get(node, "spec.externalID", "unknown");
    let nodeInfo = _.get(node, "status.nodeInfo", {
      kernelVersion: "unknown",
    });
    let capacity = _.get(node, "status.capacity", {
      cpu: "unknown",
      memory: "0",
    });

    return (
      <div className="node">
        <div className="node-header">
          <div className="node-header-parent">
            <div className="node-header-status">
              <i className={`${nodeStatusIcon} ${nodeStatusClass}`} />
            </div>
            {nodeConditions}

            <div className="node-header-name">
              {node.metadata.name}
            </div>

            <div className="node-header-menu">
              <MenuMaker data={menuData} raw={node} />
            </div>
          </div>
        </div>

        <div className="node-metadata">
          <div
            data-tip
            data-for={nodeMainAddr}
            className="node-metadata-entry"
          >
            <Tooltip id={nodeMainAddr}
              html={true}
              place="top"
              type="dark"
              effect="float"
            >

            {nodeAddrList}

            </Tooltip>
            <i className="glyphicons glyphicons-computer-network"></i>
            {nodeMainAddr}
          </div>

          <div
            data-tip
            data-for={`${externalID}-kinfo`}
            className="node-metadata-entry"
          >
            <Tooltip id={`${externalID}-kinfo`}
              html={true}
              place="top"
              type="dark"
              effect="float"
            >
              {nodeInfo.kernelVersion}
            </Tooltip>
            <i className="glyphicons glyphicons-modal-window"></i>
            {nodeInfo.kernelVersion}
          </div>

          <div className="node-metadata-entry">
            <i className="csicon csicon-cpu"></i>
            {capacity.cpu + "xCPU"}
          </div>

          <div className="node-metadata-entry">
            <i className="csicon csicon-memory"></i>
            {h.view.helpers.humanFileSize(capacity.memory.replace("Ki", "") * 1024, false)}
          </div>

          <div className="node-charts">
            {self.state.includeMetrics ? cpuChart : null}
            {self.state.includeMetrics ? memChart : null}
          </div>
        </div>

        <div className="node-tags">
          {this.renderLables(node.metadata.labels)}
        </div>

        <div className="node-containers">
          {podList}
        </div>
      </div>
    );
  }
}

export default Node;
