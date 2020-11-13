"use strict";

import React from "react";
import ContentLoader from "../layout/content-loader";
import _ from "lodash";
import h from "../helpers";
import StackAppContent from "./stackapps-content";

const types = {
  stackapps: {
    name: "StackApps",
    endpoint: "apprevisions",
    api: "features.criticalstack.com/v1alpha1",
    events: "AppRevisions",
    websocket: "apprevisions",
    icon: "glyphicons glyphicons-layers",
  },
  keys: {
    name: "Keys",
    endpoint: "verificationkeys",
    api: "features.criticalstack.com/v1alpha1",
    events: "Verificationkeys",
    websocket: "verificationkeys",
    icon: "glyphicons glyphicons-key",
  }
};

// TODO(ktravis): this is partially updated as a stopgap for adding AppRevisions and making StackApps global

// TODO(ktravis): this is partially updated as a stopgap for adding AppRevisions and making StackApps global

class StackApps extends React.Component {
  componentDidMount() {
    h.Vent.addListener("stackapps:update:content", (params) => {
      if (params.type === "stackapps") {
        this.props.history.push("/stackapps");
      } else {
        this.props.history.push(`/stackapps/${params.type}`);
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.location.pathname !== prevProps.location.pathname) {
      h.Vent.emit("content-loader:fetch:state");
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("stackapps:update:content");
  }

  render() {
    const type = _.get(this.props.match.params, "type", "stackapps");
    const model = types[type];
    const config = {
      title: model.name,
      endpoint: model.endpoint,
      websocket: model.websocket,
      namespaced: false,
      api: model.api,
      events: model.events,
      ignoreWebsocket: false,
      icon: model.icon,
      noResultBypass: true,
      noResultTitle: `No ${model.name}`,
      noResultBody: `No ${model.name} were found`,
      location: this.props.location,
      editor: true,
      content: <StackAppContent />
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default StackApps;
