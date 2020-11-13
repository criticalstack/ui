"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class CronJobs extends React.Component {
  render() {
    const config = {
      title: "Cron Jobs",
      endpoint: "cronjobs",
      api: "batch/v1beta1",
      events: "CronJob",
      ignoreWebsocket: false,
      icon: "csicon csicon-cron-jobs",
      noResultTitle: "No Cron Jobs",
      noResultBody: "No Cron Jobs were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "cronjobs.batch"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default CronJobs;
