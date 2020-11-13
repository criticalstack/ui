"use strict";

import React from "react";
import Drawer from "@material-ui/core/Drawer";
import listContent from "./list-content";
import h from "../helpers";
import { withRouter } from "react-router";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import NoResult from "../../shared/no-result";
import _ from "lodash";

class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      key: props.match.params.page || "user-profile",
      menuOpen: false
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleDrawerToggle = this.handleDrawerToggle.bind(this);
    props.history.push(`/datacenter/settings/${this.state.key}`);
  }

  componentDidMount() {
    h.Vent.emit("main-menu:filter:toggle", false);
  }

  componentDidUpdate(prevProps) {
    let self = this;
    if (self.props.match.params.page !== prevProps.match.params.page) {
      this.setState({
        key: self.props.match.params.page
      });
    }
  }

  componentWillUnmount() {
    h.Vent.emit("main-menu:filter:toggle", true);
  }

  handleClick(e) {
    let self = this;
    let key = e.currentTarget.id;

    if (listContent.hasOwnProperty(key)) {
      if (listContent[key].hasOwnProperty("content")) {
        this.setState({
          key: key
        }, function() {
          self.props.history.push(`/datacenter/settings/${key}`);
        });
      }
    }

    return false;
  }

  handleDrawerToggle() {
    this.setState(state => ({ menuOpen: !state.menuOpen }));
  }

  createListItems() {
    let self = this;
    let html = [];

    Object.keys(listContent).map(function(k, n) {
      let item = listContent[k];

      let entryIcon = item.hasOwnProperty("icon") ?
        <div className="list-entry-icon">
          <i className={item.icon} />
        </div> : null;

      let entry;

      let active = self.state.key === k ? " list-entry-active" : "";

      let primary = item.hasOwnProperty("primary") ?
        <div className="list-entry-primary">
          {entryIcon}
          {item.primary}
        </div> : "";

      let secondary = item.hasOwnProperty("secondary") ?
        <div className="list-entry-secondary">
          {item.secondary}
        </div> : "";

      if (item.hasOwnProperty("content")) {
        entry = (
          <div
            key={n}
            id={k}
            className={`${item.type}${active}`}
            onClick={self.handleClick}
          >
            {primary}
            {secondary}
          </div>
        );
      } else {
        entry = (
          <div
            key={n}
            className={item.type}
          >
            {item.primary}
          </div>
        );
      }

      let isResource = item.hasOwnProperty("resource");
      let hasResources = item.hasOwnProperty("resources");

      let hasAccess = true;
      if (isResource) {
        if (item.resource === "configmaps") {
          hasAccess = _.get(self.context.csAccess, [item.resource, "update"], true);
        } else {
          hasAccess = _.get(self.context.access, [item.resource, "list"], true);
        }
      }

      if (hasResources) {
        hasAccess = item.resources.every( res => _.get(self.context.access, [res, "list"], true));
      }

      if ((!isResource && !hasResources) || hasAccess ) {
        html.push(entry);
      }
    });

    return html;
  }

  render() {
    let exists = listContent.hasOwnProperty(this.state.key);
    return (
      <div className="settings-parent">
        <div
          className="settings-menu-toggle"
          onClick={() => this.handleDrawerToggle()}
        >
          <i className="glyphicons glyphicons-list"></i>
        </div>

        <Drawer
          container={this.props.container}
          open={this.state.menuOpen}
          onClose={this.handleDrawerToggle}
        >
          <div className="settings-sidebar mui-drawer"
            tabIndex={0}
            role="button"
            onClick={this.handleDrawerToggle}
            onKeyDown={this.handleDrawerToggle}
          >
            {this.createListItems()}
          </div>
        </Drawer>

        <div className="settings-sidebar">
          {this.createListItems()}
        </div>
        <div className="settings-content">
          {exists ? listContent[this.state.key].content : (
            <Card>
              <CardContent>
                <NoResult
                  title="404"
                  body="Page not found"
                  icon="glyphicons glyphicons-triangle-alert"
                  status="warning"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }
}

export default withRouter(Settings);
