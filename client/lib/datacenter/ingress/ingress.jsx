"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Ingress extends React.Component {
  render() {
    const config = {
      title: "Ingress",
      endpoint: "ingresses",
      api: "extensions/v1beta1",
      events: "Ingress",
      ignoreWebsocket: false,
      icon: "csicon csicon-ingress",
      noResultTitle: "No Ingress Resources",
      noResultBody: "No Ingress Resources were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "ingresses.extensions"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Ingress;
