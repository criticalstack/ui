"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Endpoints extends React.Component {
  render() {
    const config = {
      title: "Endpoints",
      endpoint: "endpoints",
      events: "Endpoint",
      ignoreWebsocket: false,
      icon: "csicon csicon-endpoints",
      noResultTitle: "No Endpoints",
      noResultBody: "No Endpoints were found",
      location: this.props.location,
      editor: true,
      metrics: false,
      buttons: false,
      table: <Table />,
      resource: "endpoints"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Endpoints;
