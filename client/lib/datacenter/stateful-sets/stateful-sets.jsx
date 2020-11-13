"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class StatefulSets extends React.Component {
  render() {
    const config = {
      title: "Stateful Sets",
      endpoint: "statefulsets",
      api: "apps/v1",
      events: "StatefulSet",
      ignoreWebsocket: false,
      icon: "csicon csicon-stateful-sets",
      noResultTitle: "No Stateful Sets",
      noResultBody: "No Stateful Sets were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "statefulsets.apps"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default StatefulSets;
