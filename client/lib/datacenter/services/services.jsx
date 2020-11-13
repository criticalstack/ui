"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Table from "./table";
import ServiceForm from "./form";

class Services extends React.Component {
  render() {
    const config = {
      title: "Services",
      endpoint: "services",
      events: "Service",
      ignoreWebsocket: false,
      icon: "csicon csicon-services",
      noResultTitle: "No Services",
      noResultBody: "No Services were found",
      location: this.props.location,
      editor: true,
      table: <Table />,
      buttons: [
        {
          "entries": {
            0: {
              "icon": "glyphicons glyphicons-magic-wand menu-icon",
              "name": "Simple",
              "link": ServiceForm.newService
            }
          },
          "args": {
            "label": "Create Service",
            "icon": "csicon csicon-services menu-icon-sub-header",
            "type": "create"
          }
        }
      ],
      resource: "services"
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default Services;
