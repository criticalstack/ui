"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Secrets extends React.Component {
  render() {
    const config = {
      title: "Secrets",
      endpoint: "secrets",
      events: "Secrets",
      ignoreWebsocket: false,
      icon: "csicon csicon-secrets",
      noResultTitle: "No Secrets",
      noResultBody: "No Secrets were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "secrets"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Secrets;
