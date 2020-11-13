"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Pods extends React.Component {
  render() {
    const config = {
      title: "Pods",
      endpoint: "pods",
      events: "Pod",
      ignoreWebsocket: false,
      icon: "csicon csicon-pods",
      noResultTitle: "No Pods",
      noResultBody: "No Pods were found",
      location: this.props.location,
      editor: true,
      metrics: true,
      table: <Table />,
      resource: "pods"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Pods;
