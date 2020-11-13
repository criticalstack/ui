"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class ConfigMaps extends React.Component {
  render() {
    const config = {
      title: "Config Maps",
      endpoint: "configmaps",
      events: "ConfigMaps",
      ignoreWebsocket: false,
      icon: "csicon csicon-config-maps",
      noResultTitle: "No Config Maps",
      noResultBody: "No Config Maps were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "configmaps"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default ConfigMaps;
