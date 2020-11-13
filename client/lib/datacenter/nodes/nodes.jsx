"use strict";

import React from "react";
import ReactDOM from "react-dom";
import h from "../../helpers";
import _ from "lodash";
import Node from "./node";
import PendingNode from "./pending-node";
import Table from "./table";
import NoResult from "../../../shared/no-result";
import LoaderMaker from "../../../shared/loader-maker";
import ContentTitle from "../../layout/content-title";
import Forbidden from "../../../shared/forbidden";
import { RBACContext } from "../../../shared/context/rbac";

class Nodes extends React.Component {
  constructor(props) {
    super(props);

    let self = this;

    self.onResize = self.resizeLogic.bind(self);

    self.csContentTitle = "Nodes Listing";
    self.csContentId = "nodes";
    self.csContentPodsWebsocket = "pods";
    self.csContentNodesWebsocket = "nodes";
    self.csContentIcon = "glyphicons glyphicons-vector-path";
    self.csEmptyTitle = "No Nodes";
    self.csEmptyBody = "No Nodes were found";
    self.websocket = null;
    self.websocketPods = null;
    self.websocketMachines = null;

    let grid = "grid-33";

    if (window.innerWidth >= 2400) {
      grid = "grid-25";
    }

    this.state = {
      resource: "nodes",
      forbidden: false,
      grid: grid,
      ignoreWebsocket: false,
      nodes: [],
      loading: true,
      includeMetrics: CSOS.localStorage.metrics.data().nodes,
      nodeLayout: CSOS.localStorage.formats.data().nodeLayout || "card",
      csConfig: JSON.parse(localStorage.getItem("cs-config")) || {}
    };

    this.icons = {
      "system:information": "glyphicons glyphicons-stats",
      "system:dmesg": "glyphicons glyphicons-list",
      "system:services:status": "glyphicons glyphicons-heartbeat",
      "system:services:failed": "glyphicons glyphicons-triangle-alert",
      "docker:containers": "csicon csicon-containers",
      "unknown": "glyphicons glyphicons-info"
    };

    this.toggleNodeLayout = this.toggleNodeLayout.bind(this);
  }

  componentDidMount() {
    this.fetchState();

    // If screen width is too narrow toggle the view to be "card" view
    if (window.innerWidth < 1200) {
      this.toggleNodeLayout("card");
    }

    window.addEventListener("resize", this.onResize);
    h.Vent.emit("main-menu:filter:toggle", false);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
    h.Vent.emit("main-menu:filter:toggle", true);
    this.destroyState();
  }

  resizeLogic(e) {
    let self = this;

    if (self && e) {
      if (e.target.innerWidth >= 2400) {
        self.setState({
          grid: "grid-25"
        });
    // If screen width is too narrow toggle the view to be "card" view
    } else if (e.target.innerWidth < 1200) {
        this.toggleNodeLayout("card");
    } else {
        self.setState({
          grid: "grid-33"
        });
      }
    }
  }

  UNSAFE_componentWillReceiveProps() {
    let self = this;

    self.destroyState(function() {
      self.fetchState();
    });
  }

  coalesceNodes(nodes) {
    // separate out machines
    let machines = _.uniqBy(_.reverse(_.remove(nodes, n => n.pending)), "metadata.name");
    let nodesByName = {};
    let combine = (old, _new) => {
      if (!old) {
        return _new;
      }
      old.metadata = _new.metadata;
      old.spec = _new.spec;
      old.status = _new.status;
      return old;
    };
    // dedupe nodes
    _.each(nodes, n => {
      let name = n.metadata.name;
      nodesByName[name] = combine(_.get(nodesByName, name, null), n);
    });
    // sort first by role, then by name
    nodes = _.sortBy(_.values(nodesByName), [n => {
      return h.view.helpers.node.isControlPlane(n) ? 0 : 1;
    }, "metadata.creationTimestamp"]);

    // remove machines that correspond to existing nodes (either by node annotation or nodeRef on the machine)
    _.pullAllWith(machines, nodes, (m, n) => {
      let nm = h.view.helpers.node.nodeMachine(n);
      return (nm && nm.name === m.metadata.name) ||
             (_.get(m, "nodeRef.name") === n.metadata.name);
    });
    return nodes.concat(machines);
  }

  updateNode(node) {
    let self = this;
    let nodes = self.state.nodes;
    nodes = self.coalesceNodes(nodes.concat([node]));
    self.setState({nodes, loading: false});
  }

  removeNode(node) {
    let self = this;
    let nodes = self.state.nodes;
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i];
      let name = n.pending ? _.get(n, "nodeRef.name", n.metadata.name) : n.metadata.name;
      if (name === node.metadata.name) {
        nodes.splice(i, 1);
      }
    }
    self.setState({nodes});
  }

  removeMachine(m) {
    let self = this;
    let nodes = self.state.nodes;
    let nodeRef = _.get(m, "status.nodeRef", null);
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i];
      if (!n.pending && nodeRef && nodeRef.name === n.metadata.name) {
        // node already tracked
        return;
      } else if (n.pending && n.metadata.name === m.metadata.name) {
        // machine is tracked
        nodes.splice(i, 1);
        self.setState({nodes});
        return;
      }
    }
  }

  toggleNodeLayout(layoutState) {
    let layouts = {
      "card": "table",
      "table": "card"
    };

    let layout;

    if (!layoutState) {
      layout = layouts.hasOwnProperty(this.state.nodeLayout) ? layouts[this.state.nodeLayout] : "card";
    } else {
      layout = layoutState;
    }

    CSOS.localStorage.formats.update({
      nodeLayout: layout
    });

    this.setState({
      nodeLayout: layout
    });
  }

  toggleMetrics() {
    let self = this;

    let value = self.state.includeMetrics ? false : true;
    self.setState({
      includeMetrics: value
    });

    CSOS.localStorage.metrics.update({
      nodes: value
    });
  }

  podsWebSocket(callback) {
    let self = this;

    if (CSOS.ignoreWebsocket || self.state.ignoreWebsocket) {
      return;
    }

    self.websocketPods = h.websocket({
      action: "watch-resource",
      resourceType: "pods"
    });

    self.websocketPods.onopen = function(e) {
      if (_.isFunction(callback)) {
        return callback(e);
      }
    };

    self.websocketPods.onerror = function(e) {
      h.log.error(e);
    };

    self.websocketPods.onmessage = function(event) {
      let json = JSON.parse(event.data);
      let pod = json.object;
      let nodeName = pod.spec.nodeName;

      if (json.type === "DELETED") {
        _.each(self.state.nodes, function(node, dni) {
          _.each(node.pods, function(p, dnpi) {
            if (p && p.metadata.uid === json.object.metadata.uid) {
              let nodes = self.state.nodes;

              delete nodes[dni].pods[dnpi];

              self.setState({
                nodes: nodes
              });
            }
          });
        });

        return;
      }

      if (json.type === "ADDED") {
        _.each(self.state.nodes, function(node, i) {
          if (nodeName && node.metadata.name === nodeName) {
            let has = false;
            _.each(node.pods, function(p) {
              if (p && p.metadata.uid === pod.metadata.uid) {
                has = true;
              }
            });

            if (!has) {
              let pods = self.state.nodes[i].pods || [];
              pods.push(pod);

              self.setState({
                nodes: self.state.nodes
              });
            }

            return;
          }
        });
      }

      if (json.type === "MODIFIED") {
        let has = false;

        _.each(self.state.nodes, function(node, i) {
          if (node.metadata.name === nodeName) {

            _.each(node.pods, function(p, ii) {
              if (p && p.metadata.uid === pod.metadata.uid) {

                let nodes = self.state.nodes;

                nodes[i].pods[ii] = pod;

                has = true;

                self.setState({
                  nodes: nodes
                });
              }
            });
          }
        });

        if (!has) {

          if (pod.hasOwnProperty("spec")) {
            if (pod.spec.hasOwnProperty("nodeName")) {

              // uncomment if you want to ignore pending status
              // if (pod.status.phase === "Pending") {
                // return;
              // }

              _.each(self.state.nodes, function(nn, nni) {

                if (nn.metadata.name === pod.spec.nodeName) {
                  let pods = self.state.nodes[nni].pods || [];

                  pods.push(pod);
                  self.state.nodes[nni].pods = pods;

                  self.setState({
                    nodes: self.state.nodes
                  });
                }
              });
            }
          }
        }
      }

      h.log.info("WS PODS:", event, json);
    };
  }

  nodesWebSocket(resourceVersion, callback) {
    let self = this;

    if (CSOS.ignoreWebsocket || self.state.ignoreWebsocket) {
      return;
    }

    self.websocket = h.websocket({
      action: "watch-nodes",
      resourceVersion: resourceVersion
    });

    self.websocket.onopen = function(e) {
      if (_.isFunction(callback)) {
        return callback(e);
      }
    };

    self.websocket.onerror = function(e) {
      h.log.error(e);
      console.log(e);
    };

    self.websocket.onmessage = function(event) {
      let json = JSON.parse(event.data);
      h.log.info("WS NODES:", event, json);
      if (json.type === "DELETED") {
        self.removeNode(json.object);
        return;
      }
      self.updateNode(json.object);
    };
  }

  machinesWebSocket(callback) {
    let self = this;

    if (CSOS.ignoreWebsocket || self.state.ignoreWebsocket) {
      return;
    }

    self.websocketMachines = h.websocket({
      action: "watch-resource",
      api: "machine.crit.sh/v1alpha1",
      resourceType: "machines",
      namespace: "kube-system",
    });

    self.websocketMachines.onopen = function(e) {
      if (_.isFunction(callback)) {
        return callback(e);
      }
    };

    self.websocketMachines.onerror = function(e) {
      h.log.error(e);
    };

    self.websocketMachines.onmessage = function(event) {
      let json = JSON.parse(event.data);
      h.log.info("WS MACHINES:", event, json);
      if (json.type === "DELETED") {
        self.removeMachine(json.object);
        return;
      }
      self.updateNode({
        kind: json.object.kind,
        metadata: json.object.metadata,
        pending: true,
        statuses: [
          _.get(json.object, "status.phase", "Unknown"),
        ],
        state: _.get(json.object, "status.phase", "Unknown"),
        nodeRef: _.get(json.object, "status.nodeRef", null),
        infraRef: _.get(json.object, "spec.infrastructureRef", null),
        spec: json.object.spec,
        status: json.object.status,
      });
    };
  }

  fetchState(callback) {
    let self = this;

    h.fetch({
      endpoint: h.ns("/nodes"),
      success: function(data) {
        h.log.info("NODES:", data);

        let nodes = data.context.result;

        nodes = nodes.map(node => {
          node.pods = [];
          return node;
        });

        self.nodesWebSocket(data.context.resourceVersion, function() {
          self.podsWebSocket();
        });

        self.machinesWebSocket();

        self.setState({
          nodes,
          loading: false
        });

        if (_.isFunction(callback)) {
          return callback();
        }
      },
      error: function(error) {
        self.setState({
          loading: false,
          ...(error.status === 403 ? {forbidden: true} : {}),
        });
      }
    });
  }

  destroyState(callback) {
    _.each([this.websocket, this.websocketPods, this.websocketMachines], function(websocket) {
      if (websocket) {
        h.log.info("closing websocket");

        websocket.onopen = websocket.onmessage = websocket.onerror = websocket.onclose = null;

        if (websocket.readyState < 2) {
          websocket.close();
        }

        websocket = null;
      }
    });

    if (callback && typeof callback === "function") {
      return callback();
    }
  }

  getNodeClusterID(node) {
    return _.get(node, "labels.cluster-id", node.name);
  }

  getWorkerNodeCount(nodes) {
    let qty = 0;
    _.each(nodes, function(node) {
      if (!("node-role.kubernetes.io/master" in node.metadata.labels)) {
        qty++;
      }
    });
    return qty;
  }

  render() {
    let self = this;
    let nodes = self.state.nodes || [];
    let length = nodes.length;
    let layoutMap = {
      "card": false,
      "table": true
    };

    let activeLayout = layoutMap.hasOwnProperty(self.state.nodeLayout) ? layoutMap[self.state.nodeLayout] : false;

    let menu = {
      "entries": {
        0: {
          "icon": "glyphicons glyphicons-terminal menu-icon",
          "name": "Shell",
          "link": function() {
            h.Vent.emit("section:drawer:toggle");
          }
        },
        1: {
          "icon": "glyphicons glyphicons-dashboard menu-icon",
          "name": "Display Metrics",
          "toggle": {
            state: self.state.includeMetrics
          },
          "link": function() {
            self.toggleMetrics();
          }
        },
        2: {
          "name": "Compact View",
          "toggle": {
            state: activeLayout
          },
          "link": function() {
            self.toggleNodeLayout();
          }
        }
      },
      "args": {
        "label": "Options",
        "icon": "csicon csicon-gear menu-icon-sub-header",
        "type": "options"
      }
    };

    if (self.state.loading) {
      return <LoaderMaker id="nodes-nodata" config="no-data-large" />;
    }

    let split = h.view.helpers.chunkify(nodes, 3, true);

    if (self.state.grid === "grid-25") {
      split = h.view.helpers.chunkify(nodes, 4, true);
    }

    let content;

    if (length === 0) {

      content = (
        <NoResult
          title={self.csEmptyTitle}
          body={self.csEmptyBody}
          icon={self.csContentIcon}
        />
      );
    } else if (self.state.nodeLayout === "table") {

      content = (
        <div className="content-table">
          <Table
            tableId={self.csContentId}
            data={nodes}
            includeMetrics={self.state.includeMetrics}
            icons={self.icons}
          />
        </div>
      );

    } else {

      content = (
        <div className="nodes-list">
          {split.map(function(nodeArray, i) {
            return (
              <div key={i} className={`node-column ${self.state.grid}`}>
                {nodeArray.map(function(node, ii) {
                  if (node.pending) {
                    return (
                      <PendingNode
                        id={`pending-${ii}`}
                        node={node}
                        key={ii}
                      />
                    );
                  }

                  let id = self.getNodeClusterID(node.metadata);

                  return (
                    <Node
                      id={id}
                      node={node}
                      key={ii}
                      includeMetrics={self.state.includeMetrics}
                      icons={self.icons}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={self.csContentId}>
        <ContentTitle
          icon={self.csContentIcon}
          buttons={[]}
          menu={window.innerWidth < 1200 ? {...menu, entries: _.omit(menu.entries, ["1"])} : menu}
          title={self.csContentTitle}
          count={length}
          resource={this.state.resource}
        />

      {
        _.get(this.context.access, [this.state.resource, "list"], true) ? content : <Forbidden />
      }

      </div>
    );
  }
}

Nodes.contextType = RBACContext;

export default Nodes;
