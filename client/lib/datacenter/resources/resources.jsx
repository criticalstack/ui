"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import CardLayout from "../../../shared/card-layout/card-layout";
import Card from "./card";

class Resources extends React.Component {
  render() {
    const config = {
      title: "Resources",
      endpoint: "resources",
      namespaced: true,
      resUrl: false,
      query: {
        for: "graph"
      },
      metadata: "links",
      api: "apps/v1",
      events: "Objects",
      websocket: "all",
      icon: "glyphicons glyphicons-palette-package",
      noResultTitle: "No Resources",
      noResultBody: "No Resources were found",
      location: this.props.location,
      editor: true,
      metrics: false,
      content: <CardLayout card={<Card />} gutter={false} chipFilter={true} />
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Resources;
