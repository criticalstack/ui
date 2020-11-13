"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import CardLayout from "../../../shared/card-layout/card-layout";
import Card from "./card";

class ResourceQuotas extends React.Component {
  render() {
    const icon = "csicon csicon-resource-quotas";
    const config = {
      title: "Resource Quotas",
      endpoint: "resourcequotas",
      api: "v1",
      events: "ResourceQuota",
      ignoreWebsocket: false,
      icon,
      noResultTitle: "No Resource Quotas",
      noResultBody: "No Resource Quotas were found",
      location: this.props.location,
      editor: true,
      metrics: false,
      content: <CardLayout card={<Card />} gutter={false} layout={false} icon={icon} />,
      resource: "resourcequotas"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default ResourceQuotas;
