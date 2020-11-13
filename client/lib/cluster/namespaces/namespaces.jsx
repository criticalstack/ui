"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Content from "./namespace-content";

class Namespaces extends React.Component {
  render() {
    const config = {
      title: "Namespaces",
      endpoint: "namespaces",
      namespaced: false,
      api: "v1",
      events: "Namespace",
      ignoreWebsocket: false,
      icon: "csicon csicon-namespace",
      noResultTitle: "No Namespaces",
      noResultBody: "No Namespaces were found",
      location: this.props.location,
      editor: true,
      content: <Content />,
      resource: "namespaces"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Namespaces;
