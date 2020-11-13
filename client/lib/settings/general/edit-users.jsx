"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import UserRequestsTable from "./users-table";
import _ from "lodash";
import { withRouter } from "react-router";
import Forbidden from "../../../shared/forbidden";
import { RBACContext } from "../../../shared/context/rbac";

class EditUsers extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      resource: "userrequests.criticalstack.com",
      icon: "glyphicons-group",
    };
  }

  render() {
    const config = {
      title: "Users",
      endpoint: "userrequests",
      resource: "userrequests",
      api: "criticalstack.com/v1alpha1",
      events: "UserRequests",
      ignoreWebsocket: false,
      icon: "glyphicons-group",
      noResultTitle: "No users",
      noResultBody: "No users",
      location: this.props.location,
      editor: true,
      table: <UserRequestsTable />
    };
    return (
      <Card>
        {
          _.get(this.context.access, [this.state.resource, "list"], true) ? (
            <>
            <CardHeader
              className="settings-cardheader"
              title="You can add, edit, and remove users from the system here"
              subheader="What would you like to do?"
            />
            <CardContent>
              <ContentLoader
                config={config}
              />
            </CardContent>
            </>
          ) : (
            <CardContent>
              <Forbidden />
            </CardContent>
          )
        }
      </Card>
    );
  }
}

EditUsers.contextType = RBACContext;

export default withRouter(EditUsers);
