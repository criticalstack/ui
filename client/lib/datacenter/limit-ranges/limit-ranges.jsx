"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import CardLayout from "../../../shared/card-layout/card-layout";
import Card from "./card";

class LimitRanges extends React.Component {
  render() {
    const icon = "csicon csicon-limit-ranges";
    const config = {
      title: "Limit Ranges",
      endpoint: "limitranges",
      api: "v1",
      events: "LimitRange",
      ignoreWebsocket: false,
      icon,
      noResultTitle: "No Limit Ranges",
      noResultBody: "No Limit Ranges were found",
      location: this.props.location,
      editor: true,
      content: <CardLayout card={<Card />} gutter={false} layout={false} icon={icon} />,
      resource: "limitranges"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default LimitRanges;
