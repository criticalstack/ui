"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class PodPresets extends React.Component {
  render() {
    const config = {
      title: "Pod Presets",
      endpoint: "podpresets",
      api: "settings.k8s.io/v1alpha1",
      events: "PodPreset",
      ignoreWebsocket: false,
      icon: "csicon csicon-pod-presets",
      noResultTitle: "No Pod Presets",
      noResultBody: "No Pod Presets were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "podpresets.settings.k8s.io"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default PodPresets;
