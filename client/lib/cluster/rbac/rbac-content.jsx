"use strict";

import React from "react";
import RBACTable from "./rbac-table";
import { withRouter } from "react-router";
import Session from "../../helpers/session";

class RBACContent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      type: ""
    };
  }

  setType() {
    let params = this.props.match.params;
    let type = "";
    if (params.type === "namespace") {
      if (params.kind === "roles") {
        type = "Role";
      } else {
        type = "RoleBinding";
      }
    } else {
      if (params.kind === "roles") {
        type = "ClusterRole";
      } else {
        type = "ClusterRoleBinding";
      }
    }
    this.setState({ type });
  }

  componentDidMount() {
    this.setType();
  }

  componentDidUpdate(prevProps) {
    if (this.props.match !== prevProps.match) {
      this.setType();
    }
  }

  render() {
    let namespace = Session.namespace();

    let content = (
      <div>
        <RBACTable
          type={this.state.type}
          data={this.props.data}
          namespace={namespace}
          route={this.props.route}
        />
      </div>
    );

    return content;
  }
}

export default withRouter(RBACContent);
