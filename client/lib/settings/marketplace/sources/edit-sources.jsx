"use strict";

import React from "react";
import { withRouter } from "react-router";
import Table from "./table";
import ContentLoader from "../../../layout/content-loader";

class EditSources extends React.Component {
  render() {
    const config = {
      title: "Marketplace Sources",
      websocket: "sources",
      endpoint: "sources.marketplace.criticalstack.com",
      namespaced: false,
      api: "marketplace.criticalstack.com/v1alpha2",
      events: "Source",
      ignoreWebsocket: false,
      icon: "csicon csicon-config-maps",
      noResultTitle: "No Sources",
      noResultBody: "No Sources were found",
      location: this.props.location,
      editor: true,
      metrics: false,
      nameIdentifier: true,
      table: <Table />,
      resource: "sources.marketplace.criticalstack.com"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default withRouter(EditSources);
