"use strict";

import React from "react";
import h from "../../helpers";
import ContainerTable from "./container-table";
import ContentTitle from "../../../shared/content-title";
import _ from "lodash";

class Containers extends React.Component {

  constructor() {
    super();

    this.websocket = null;

    this.state = {
      ignoreWebsocket: false,
      containers: []
    };
  }

  componentDidMount() {
    var self = this;

    h.fetch({
      endpoint: h.ns("/containers", self.props.location),
      success: function(data) {
        h.log.info("Containers:", data);

        self.setState({
          containers: data.context.result
        });

        self.loadWebsocket(data.context.resourceVersion);
      }
    });
  }

  componentWillUnmount() {
    var self = this;

    if (self.websocket) {
      h.log.info("closing websocket");

      self.websocket.onopen = self.websocket.onmessage = self.websocket.onerror = self.websocket.onclose = null;

      if (self.websocket.readyState < 2) {
        self.websocket.close();
      }

      self.websocket = null;
    }
  }

  loadWebsocket(resourceVersion) {
    var self = this;

    if (CSOS.ignoreWebsocket || self.state.ignoreWebsocket) {
      return;
    }

    self.websocket = h.websocket({
      action: "watch-resource",
      resourceType: "pods",
      resourceVersion: resourceVersion
    });

    self.websocket.onerror = function(e) {
      h.log.error(e);
    };

    self.websocket.onmessage = function(event) {
      var json = JSON.parse(event.data);
      h.log.info("WS:", event, json);

      if (json.type === "DELETED") {
        _.each(json.object.spec.containers, function(c) {
          _.each(self.state.containers, function(state, si) {
            if (state && state.metadata.name === c.name && state.pod.metadata.name === json.object.metadata.name) {
              delete self.state.containers[si];

              self.setState({
                containers: self.state.containers.filter(Boolean)
              });
            }
          });
        });
      }

      if (json.type === "MODIFIED") {
        var has = false;
        var cache = {};

        _.each(json.object.spec.containers, function(c) {
          var cData = {};

          _.each(json.object.status.containerStatuses, function(cs) {
            if (cs.name === c.name) {
              cData.status = cs;
            }
          });

          cData.pod = json.object;
          cData.metadata = c;

          cache = cData;

          _.each(self.state.containers, function(state, si) {
            if (state && state.metadata.name === cData.metadata.name && state.pod.metadata.name === cData.pod.metadata.name) {
              self.state.containers[si] = cData;

              has = true;
              self.setState({
                containers: self.state.containers
              });
            }
          });
        });

        if (!has) {
          var containers = self.state.containers;
          containers.push(cache);

          self.setState({
            containers: containers
          });
        }
      }
    };
  }

  render() {
    var containers = this.state.containers || [];
    var length = containers.length;

    var buttons = [
      {
        name: "New Container",
        icon: "csicon csicon-container",
        to: ""
      }
    ];

    return (
      <div className="containers">
        <ContentTitle buttons={buttons} title={"Container Listing (" + length + ")"} />
        <ContainerTable data={containers} />
      </div>
    );
  }
}

export default Containers;
