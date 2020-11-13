"use strict";

import React from "react";
import { withRouter } from "react-router-dom";
import ContentLoader from "../../../layout/content-loader";
import Content from "./content";

class Installations extends React.Component {
  render() {
    const config = {
      title: "Installed Versions",
      endpoint: "releases",
      api: "marketplace.criticalstack.com/v1alpha2",
      events: "Release",
      ignoreWebsocket: false,
      icon: "glyphicons glyphicons-simple-trolley",
      noResultTitle: "No Installations",
      noResultBody: "No installations were found",
      location: this.props.location,
      editor: true,
      content: <Content />,
      noButtons: true,
      noTitle: true,
      resource: "releases.marketplace.criticalstack.com"
    };

    return (
      <div className="installations-table">
        <ContentLoader
          config={config}
        />
      </div>
    );
  }
}

export default withRouter(Installations);
