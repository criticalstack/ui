"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class DaemonSets extends React.Component {
  render() {
    const config = {
      title: "Daemon Sets",
      endpoint: "daemonsets",
      api: "apps/v1",
      events: "DaemonSet",
      ignoreWebsocket: false,
      icon: "csicon csicon-daemon-sets",
      noResultTitle: "No Daemon Sets",
      noResultBody: "No Daemon Sets were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "daemonsets.apps"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default DaemonSets;
