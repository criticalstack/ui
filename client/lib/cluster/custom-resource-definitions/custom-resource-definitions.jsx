"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class CustomResourceDefinitions extends React.Component {
  render() {
    const config = {
      title: "Custom Resource Definitions",
      endpoint: "customresourcedefinitions",
      namespaced: false,
      api: "apiextensions.k8s.io/v1",
      events: "CustomResourceDefinitions",
      ignoreWebsocket: false,
      icon: "glyphicons glyphicons-palette-package",
      noResultTitle: "No Custom Resource Definitions",
      noResultBody: "No Custom Resource Definitions were found",
      location: this.props.location,
      editor: true,
      metrics: false,
      table: <Table />,
      resource: "customresourcedefinitions.apiextensions.k8s.io"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default CustomResourceDefinitions;
