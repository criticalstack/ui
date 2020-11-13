"use strict";

import React from "react";
import h from "../helpers";
import SelectNamespace from "../../shared/select-namespace";
import Session from "../helpers/session";
import _ from "lodash";
import { withRouter } from "react-router";
import { RBACContext } from "../../shared/context/rbac";

class ChangeNamespace extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      namespaces: [],
      error: false
    };

    this.fetchState();
  }

  componentDidUpdate(prevProps) {
    let emit = false;
    let emitTo = [
      "/datacenter/settings/manage-users"
    ];

    if (emitTo.indexOf(this.props.location.pathname) !== -1) {
      if (this.props.location.key === prevProps.location.key) {
        emit = true;
      }

      if (this.props.location.pathname !== prevProps.location.pathname) {
        emit = true;
      }
    } else {
      return false;
    }

    if (emit) {
      this.props.history.push({
        state: {
          namespaces: this.state.namespaces
        }
      });
    }

    return false;
  }

  componentWillUnmount() {
    this.destroyState();
  }

  fetchState() {
    let self = this;

    h.fetch({
      endpoint: "/namespaces",
      success: function(data) {
        h.log.info("Namespaces:", data);
        let namespaces = data.context.result;
        let resourceVersion = data.context.hasOwnProperty("resourceVersion") ? data.context.resourceVersion : false;
        let apiVersion = namespaces.length > 0 ? namespaces[0].apiVersion : false;

        self.setState({
          namespaces: self.sortAsc(namespaces),
          error: false
        });

        self.loadWebsocket(resourceVersion, apiVersion);
      },
      error: function() {
        self.setState({
          error: true
        });
      }
    });
  }

  loadWebsocket(resourceVersion, apiVersion) {
    let self = this;

    self.websocket = h.websocket({
      action: "watch-resource",
      api: apiVersion,
      resourceType: "namespaces",
      resourceVersion: resourceVersion
    });

    self.websocket.onerror = function(e) {
      h.log.error(e);
    };

    self.websocket.onmessage = function(event) {
      let json = JSON.parse(event.data);
      h.log.info("WS:", event, json);

      if (json.type === "ADDED") {
        let aData = self.state.namespaces;
        aData.unshift(json.object);

        self.setState({
          namespaces: self.sortAsc(aData)
        });

        return;
      }

      if (json.type === "DELETED") {
        _.each(self.state.namespaces, function(p, dnpi) {
          if (p && p.metadata.uid === json.object.metadata.uid) {
            delete self.state.namespaces[dnpi];
            self.setState({
              namespaces: self.state.namespaces.filter(Boolean)
            });
          }
        });
      }

      if (json.type === "MODIFIED") {
        let has = false;

        _.each(self.state.namespaces.filter(Boolean), function(p, i) {
          if (p.metadata.uid === json.object.metadata.uid) {
            has = true;

            let data = self.state.namespaces;
            data[i] = json.object;

            self.setState({
              namespaces: self.sortAsc(data)
            });

            return;
          }
        });

        if (!has) {
          let data = self.state.namespaces;
          data.push(json.object);
          self.setState({
            namespaces: self.sortAsc(data)
          });
        }
      }
    };
  }

  destroyState() {
    let self = this;

    if (self.websocket) {
      h.log.info("closing websocket");

      self.websocket.onopen = self.websocket.onmessage = self.websocket.onerror = self.websocket.onclose = null;

      if (self.websocket.readyState < 2) {
        self.websocket.close();
      }

      self.websocket = null;
    }
  }

  sortAsc(data) {
    data.sort(function(a, b) {
      return (a.metadata.name > b.metadata.name) ? 1 : ((b.metadata.name > a.metadata.name) ? -1 : 0);
    });

    return data;
  }

  handleChange(namespace) {
    let location = this.props.location;
    Session.changeNamespace(namespace, location);
    h.Vent.emit("SectionEditor:close");
    h.Vent.emit("namespace-change", namespace);
    h.Vent.emit("link", location.pathname);
    h.Vent.emit("content-loader:fetch:state");
    this.context.fetchAccess(namespace);
  }

  render() {
    let prefix = (
      <i
        className="csicon csicon-namespace"
        style={{
          height: "62px",
          lineHeight: "62px",
          fontSize: "24px",
          color: "#b8bdc0"
        }}
      />
    );

    return (
      <SelectNamespace
        component="change-namespaces"
        namespaces={this.state.namespaces}
        buttonClass="btn-header"
        prefix={prefix}
        action={(namespace) => this.handleChange(namespace)}
        error={this.state.error}
      />
    );
  }
}

ChangeNamespace.contextType = RBACContext;

export default withRouter(ChangeNamespace);
