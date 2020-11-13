"use strict";

import React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import RBACTable from "./rbac-table";
import RBACAccessTable from "./rbac-access-table";
import { withRouter } from "react-router";
import Session from "../../helpers/session";
import h from "../../helpers";
import _ from "lodash";
import { RBACContext } from "../../../shared/context/rbac";

const tabMap = {
  "0": "access",
  "access": "0",
  "1": "roles",
  "roles": "1",
  "2": "rolebindings",
  "rolebindings": "2",
  "3": "clusterroles",
  "clusterroles": "3",
  "4": "clusterrolebindings",
  "clusterrolebindings": "4"
};

const typeMap = {
  "roles": "Role",
  "rolebindings": "RoleBinding",
  "clusterroles": "ClusterRole",
  "clusterrolebindings": "ClusterRoleBinding"
};

class RBACAuthorization extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hideSystem: true,
      openMore: false,
      anchorEl: null,
    };
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.route === nextProps.route) {
      return true;
    }

    return false;
  }

  handleTypeChange(index) {
    h.Vent.emit("rbac:update:content", {
      type: tabMap[index],
    });
    this.setState({
      openMore: false
    });
  }

  render() {
    let type = typeMap[this.props.match.params.type];
    let namespace = Session.namespace();
    let activeTab = Number(tabMap[this.props.match.params.type]) || 0;
    let data = this.props.data;
    let controls = null;
    let key = this.props.match.params.type === "access" ? "Name" : "metadata.name";

    let hasData = data.length > 0;
    let item1 = {};
    let hasRules = false;
    let hasSubj = false;
    let isCR = false;
    let isCRB = false;
    if (hasData) {
      item1 = data[0];
      hasRules = item1.hasOwnProperty("rules");
      hasSubj = item1.hasOwnProperty("subjects");
      isCR = item1.metadata?.selfLink?.includes("clusterrole");
      isCRB = item1.metadata?.selfLink?.includes("clusterrolebinding");
    }

    let hasDataAccess = hasData && item1.hasOwnProperty("Roles");
    let hasDataR = hasData && hasRules && !isCR;
    let hasDataRB = hasData && hasSubj && !isCRB;
    let hasDataCR = hasData && hasRules && isCR;
    let hasDataCRB = hasData && hasSubj && isCRB;

    if (this.state.hideSystem) {
      data = data.filter((x) => {
        let re = /^system:/;
        let isSystem = re.exec(_.get(x, key));
        if (isSystem) {
          return false;
        }
        return true;
      }).map((y) => {
        return y;
      });
    }

    controls = (
      <FormControl
        aria-label="hidesystem"
        name="hidesystem"
        style={{marginLeft: "10px"}}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={this.state.hideSystem}
              onChange={() => {
                this.setState({
                  hideSystem: !this.state.hideSystem
                });
              }}
            />
          }
          label="Hide system"
        />
      </FormControl>
    );

    return (
      <div className="cs-tabs-parent">
        <Tabs
          className="cs-tabs"
          selectedIndex={activeTab}
          onSelect={tabIndex => this.handleTypeChange(tabIndex)}
        >
          <TabList>
            <Tab
              disabled={!_.get(this.context.access, ["users.criticalstack.com", "list"], true)}
            >
              <span className="tab-label">
                <i className="glyphicons glyphicons-user-check tab-icon" />
                <span>Access</span>
              </span>
            </Tab>
            <Tab
              disabled={!_.get(this.context.access, ["roles.rbac.authorization.k8s.io", "list"], true)}
            >
              <span className="tab-label">
                <i className="glyphicons glyphicons-file-lock tab-icon" />
                <span>Roles</span>
              </span>
            </Tab>
            <Tab
              disabled={!_.get(this.context.access, ["rolebindings.rbac.authorization.k8s.io", "list"], true)}
            >
              <span className="tab-label">
                <i className="glyphicons glyphicons-paired tab-icon" />
                <span>RoleBindings</span>
              </span>
            </Tab>
            <Tab
              className="react-tabs__tab more-hidden"
              disabled={!_.get(this.context.access, ["clusterroles.rbac.authorization.k8s.io", "list"], true)}
            >
              <span className="tab-label">
                <i className="glyphicons glyphicons-file-lock tab-icon" />
                <span>ClusterRoles</span>
              </span>
            </Tab>
            <Tab
              className="react-tabs__tab big more-hidden"
              disabled={!_.get(this.context.access, ["clusterrolebindings.rbac.authorization.k8s.io", "list"], true)}
            >
              <span className="tab-label">
                <i className="glyphicons glyphicons-paired tab-icon" />
                <span>ClusterRoleBindings</span>
              </span>
            </Tab>
            <div
            className="hide-on-mobile tabs-checkbox"
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "auto"
            }}>
              {controls}
            </div>
          </TabList>

          <TabPanel>
            {
              hasDataAccess && (
                <RBACAccessTable
                  data={data}
                  route={this.props.route}
                />
              )
            }
          </TabPanel>

          <TabPanel>
            <RBACTable
              type={type}
              namespace={namespace}
              data={hasDataR ? data : []}
              route={this.props.route}
            />
          </TabPanel>

          <TabPanel>
            <RBACTable
              type={type}
              namespace={namespace}
              data={hasDataRB ? data : []}
              route={this.props.route}
            />
          </TabPanel>

          <TabPanel>
            <RBACTable
              type={type}
              namespace={namespace}
              data={hasDataCR ? data : []}
              route={this.props.route}
            />
          </TabPanel>

          <TabPanel>
            <RBACTable
              type={type}
              namespace={namespace}
              data={hasDataCRB ? data : []}
              route={this.props.route}
            />
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

RBACAuthorization.contextType = RBACContext;

export default withRouter(RBACAuthorization);
