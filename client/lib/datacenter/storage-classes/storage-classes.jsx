"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class StorageClasses extends React.Component {
  render() {
    const config = {
      title: "Storage Classes",
      endpoint: "storageclasses",
      api: "storage.k8s.io/v1",
      events: "StorageClasse",
      ignoreWebsocket: false,
      icon: "csicon csicon-storage-classes",
      noResultTitle: "No Storage Classes",
      noResultBody: "No Storage Classes were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "storageclasses.storage.k8s.io"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default StorageClasses;
