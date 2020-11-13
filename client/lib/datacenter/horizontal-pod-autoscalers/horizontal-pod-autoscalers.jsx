"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./hpa-table";

class HorizontalPodAutoscalers extends React.Component {
  render() {
    const config = {
      title: "Horizontal Pod Autoscalers",
      endpoint: "horizontalpodautoscalers",
      api: "autoscaling/v1",
      exData: [
        "deployments",
        "replicasets",
        "statefulsets",
        "resourcequotas"
      ],
      events: "HorizontalPodAutoscalers",
      ignoreWebsocket: false,
      icon: "csicon csicon-autoscale",
      noResultTitle: "No Horizontal Pod Autoscalers",
      noResultBody: "No Horizontal Pod Autoscalers were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      resource: "horizontalpodautoscalers.autoscaling"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default HorizontalPodAutoscalers;
