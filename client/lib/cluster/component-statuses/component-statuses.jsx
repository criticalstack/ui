"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class ComponentStatuses extends React.Component {
  render() {
    const config = {
      title: "Component Statuses",
      endpoint: "componentstatuses",
      events: "ComponentStatuses",
      ignoreWebsocket: true,
      icon: "csicon csicon-component-statuses",
      noResultTitle: "No Component Statuses",
      noResultBody: "No Component Statuses were found",
      location: this.props.location,
      editor: false,
      metrics: false,
      buttons: false,
      menu: false,
      table: <Table />,
      resource: "componentstatuses"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default ComponentStatuses;
