"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class NetworkPolicies extends React.Component {
  render() {
    const config = {
      title: "Network Policies",
      endpoint: "networkpolicies",
      api: "networking.k8s.io/v1",
      events: "NetworkPolicy",
      ignoreWebsocket: false,
      icon: "csicon csicon-mp-networking",
      noResultTitle: "No Network Policies",
      noResultBody: "No Network Policies were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "networkpolicies.networking.k8s.io"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default NetworkPolicies;
