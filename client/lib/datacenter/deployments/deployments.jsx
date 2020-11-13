"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Deployments extends React.Component {
  render() {
    const config = {
      title: "Deployments",
      endpoint: "deployments",
      api: "apps/v1",
      events: "Deployment",
      ignoreWebsocket: false,
      icon: "csicon csicon-deployments",
      noResultTitle: "No Deployments",
      noResultBody: "No Deployments were found",
      location: this.props.location,
      editor: true,
      metrics: false,
      table: <Table />,
      resource: "deployments.apps"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Deployments;
