"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class ServiceAccounts extends React.Component {
  render() {
    const config = {
      title: "Service Accounts",
      endpoint: "serviceaccounts",
      events: "ServiceAccount",
      ignoreWebsocket: false,
      icon: "csicon csicon-service-accounts",
      noResultTitle: "No Service Accounts",
      noResultBody: "No Service Accounts were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "serviceaccounts"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default ServiceAccounts;
