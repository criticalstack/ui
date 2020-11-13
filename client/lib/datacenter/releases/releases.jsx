"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Releases extends React.Component {
  render() {
    const config = {
      title: "App Releases",
      endpoint: "releases",
      api: "marketplace.criticalstack.com/v1alpha2",
      events: "Release",
      ignoreWebsocket: false,
      icon: "glyphicons glyphicons-simple-trolley",
      noResultTitle: "No Releases",
      noResultBody: "No Releases were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      noButtons: true,
      resource: "releases.marketplace.criticalstack.com"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Releases;
