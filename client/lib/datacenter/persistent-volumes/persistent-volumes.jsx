"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class PersistentVolumes extends React.Component {
  render() {
    const config = {
      title: "Persistent Volumes",
      endpoint: "persistentvolumes",
      events: "PersistentVolumes",
      ignoreWebsocket: false,
      icon: "csicon csicon-persistent-volumes",
      noResultTitle: "No Persistent Volumes",
      noResultBody: "No Persistent Volumes were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "persistentvolumes"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default PersistentVolumes;
