"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Traces extends React.Component {
  render() {
    const config = {
      title: "Traces",
      endpoint: "traces.tools.swoll.criticalstack.com",
      api: "tools.swoll.criticalstack.com/v1alpha1",
      events: "Trace",
      ignoreWebsocket: false,
      icon: "swollicon swollicon-swoll_icon",
      noResultTitle: "No Traces",
      noResultBody: "No Traces were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "traces.tools.swoll.criticalstack.com"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Traces;
