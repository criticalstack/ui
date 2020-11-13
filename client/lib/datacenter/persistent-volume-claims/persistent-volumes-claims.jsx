"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";

class PersistentVolumeClaims extends React.Component {
  render() {
    const config = {
      title: "Persistent Volume Claims",
      endpoint: "persistentvolumeclaims",
      events: "PersistentVolumeClaim",
      ignoreWebsocket: false,
      icon: "csicon csicon-persistent-volume-claims",
      noResultTitle: "No Persistent Volume Claims",
      noResultBody: "No Persistent Volume Claims were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "persistentvolumeclaims"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default PersistentVolumeClaims;
