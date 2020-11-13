"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class ReplicaSets extends React.Component {
  render() {
    const config = {
      title: "Replica Sets",
      endpoint: "replicasets",
      api: "apps/v1",
      events: "ReplicaSet",
      ignoreWebsocket: false,
      icon: "csicon csicon-replica-sets",
      noResultTitle: "No Replica Sets",
      noResultBody: "No Replica Sets were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "replicasets.apps"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default ReplicaSets;
