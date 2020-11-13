"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Events extends React.Component {
  render() {
    const config = {
      title: "Events",
      endpoint: "events",
      events: "Events",
      ignoreWebsocket: false,
      icon: "csicon csicon-events",
      noResultTitle: "No Events",
      noResultBody: "No Events were found",
      location: this.props.location,
      editor: false,
      table: <Table />,
      resource: "events"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Events;
