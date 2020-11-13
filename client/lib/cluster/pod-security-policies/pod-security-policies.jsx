"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class PodSecurityPolicies extends React.Component {
  render() {
    const config = {
      title: "Pod Security Policies",
      endpoint: "podsecuritypolicies",
      api: "policy/v1beta1",
      events: "PodSecurityPolicy",
      ignoreWebsocket: false,
      icon: "csicon csicon-pod-security-policies",
      noResultTitle: "No Pod Security Policies",
      noResultBody: "No Pod Security Policies were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "podsecuritypolicies.policy"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default PodSecurityPolicies;
