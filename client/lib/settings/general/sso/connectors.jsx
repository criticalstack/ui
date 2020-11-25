"use strict";

import React from "react";
import ContentLoader from "../../../layout/content-loader";
import ConnectorsTable from "./connectors-table";

class Connectors extends React.Component {
  render() {
    const config = {
      title: "Connectors",
      endpoint: "connectors",
      resource: "connectors.dex.coreos.com",
      api: "dex.coreos.com/v1",
      events: "Connectors",
      ignoreWebsocket: false,
      icon: "glyphicons glyphicons-power-cord-plug",
      noResultTitle: "No Connectors",
      noResultBody: "No Connectors",
      location: this.props.location,
      editor: true,
      table: <ConnectorsTable />
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Connectors;
