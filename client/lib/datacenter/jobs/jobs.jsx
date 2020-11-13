"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class Jobs extends React.Component {
  render() {
    const config = {
      title: "Jobs",
      endpoint: "jobs",
      api: "batch/v1",
      events: "Job",
      ignoreWebsocket: false,
      icon: "csicon csicon-jobs",
      noResultTitle: "No Jobs",
      noResultBody: "No Jobs were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "jobs.batch"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Jobs;
