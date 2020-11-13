"use strict";

import React from "react";
import ReactDOM from "react-dom";
import { NavLink } from "react-router-dom";
import h from "../../helpers";
import Session from "../../helpers/session";
import Avatar from "../../layout/avatar";
import MenuMaker from "../../../shared/menu-maker";
import ChangeNamespace from "../change-namespace";
import Tooltip from "react-tooltip";
import _ from "lodash";
import { withRouter } from "react-router";

class MainMenu extends React.Component {
  constructor(props) {
    super(props);

    this.session = {
      user: Session.user
    };

    let csConfig = JSON.parse(localStorage.getItem("cs-config")) || {};
    let enableMarketplace = _.get(csConfig, "marketplace.enabled", false);
    let enableStackApps = false;
    if (csConfig.hasOwnProperty("kubernetes")) {
      enableStackApps = _.find(csConfig.kubernetes.resources, {kind: "StackApp", name: "stackapps"} );
    }

    this.state = {
      location: props.location,
      headerClass: this.setHeaderClass(props.location.pathname),
      enableMarketplace: enableMarketplace,
      enableStackApps: enableStackApps
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    let self = this;
    let current = nextProps.location.pathname;
    let last = this.props.location.pathname;

    if (this.state !== nextState) {
      return true;
    }

    if (current === last) {
      return false;
    }

    self.setState({
      headerClass: this.setHeaderClass(nextProps.location.pathname)
    });

    return true;
  }

  componentDidMount() {
    let self = this;

    h.Vent.addListener("user-data-update", function(user) {
      self.setState({
        user: user
      });
    });

    h.Vent.addListener("main-menu:update", function() {
      let csConfig = JSON.parse(localStorage.getItem("cs-config")) || {};
      let enableMarketplace = _.get(csConfig, "marketplace.enabled", false);
      let enableStackApps = false;
      if (csConfig.hasOwnProperty("kubernetes")) {
        enableStackApps = _.find(csConfig.kubernetes.resources, {kind: "StackApp", name: "stackapps"} );
      }
      self.setState({
        enableMarketplace,
        enableStackApps
      });
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("user-data-update");
    h.Vent.removeAllListeners("main-menu:update");
  }

  setHeaderClass(location) {
    let headerClass = "header-main-menu-wrapper";
    let parts = location.split("/");

    if (parts.length >= 2) {
      let feature = parts[1];
      let hasApp =
        feature === "marketplace" && parts[2] === "app" ? true : false;

      if (feature === "marketplace") {
        headerClass = "header-marketplace-wrapper";
      }

      if (hasApp) {
        headerClass = "header-app-wrapper";
      }
    }

    return headerClass;
  }

  render() {
    let self = this;
    let name = self.session.user ? self.session.user.username : "N/A";

    let menuData = {
      entries: {
        0: {
          icon: "glyphicons glyphicons-cogwheels",
          name: "Settings",
          link: function() {
            self.props.history.push("/datacenter/settings");
          }
        },
        2: {
          icon: "glyphicons glyphicons-circle-question",
          name: "Help",
          link: function() {
            window.open("https://criticalstack.zendesk.com/hc/en-us", "_blank");
          }
        },
        3: {
          icon: "glyphicons glyphicons-cloud-download",
          name: "Download Kubeconfig",
          link: function() {
            window.open(`${window.location.origin}/kubeconfig`, "_blank");
          }
        },
        4: {
          icon: "glyphicons glyphicons-announcement menu-icon-version",
          name: `${Session.version()}`,
          disabled: true,
          style: {
            textAlign: "left",
            fontSize: "0.9em",
            color: "#0078E7"
          }
        },
        5: {
          icon: "glyphicons glyphicons-log-out menu-icon-warn",
          divider: "menu-divider-top",
          name: "Logout",
          link: Session.destroy
        }
      },
      args: {
        icon: "glyphicons glyphicons-menu",
        type: "menu-icon",
        ariaLabel: "Open the menu"
      }
    };

    let headerClass = this.state.headerClass;

    let marketplaceLink = this.state.enableMarketplace ? (
      <NavLink
        activeClassName="active"
        className="header-main-menu-item"
        to="/marketplace"
      >
        Marketplace
        <div className="header-main-menu-status"></div>
      </NavLink>
    ) : null;

    let stackAppsLink = this.state.enableStackApps ? (
      <NavLink
      activeClassName="active"
      className="header-main-menu-item"
      to="/stackapps"
    >
      StackApps
      <div className="header-main-menu-status"></div>
    </NavLink>
    ) : null;

    return (
      <div className={headerClass}>
        <div className="header-menu-icon">
          <MenuMaker data={menuData} />
        </div>

        <div className="header-logo">
          <img
            className="header-logo-no-color"
            height="40px"
            src="/assets/images/cs-icon-blue.svg"
            alt="Critical Stack, Inc"
          />
        </div>

        <div className="header-main-menu-items">
          <NavLink
            activeClassName="active"
            className="header-main-menu-item"
            to="/datacenter"
          >
            Data Center
            <div className="header-main-menu-status"></div>
          </NavLink>
          <NavLink
            activeClassName="active"
            className="header-main-menu-item"
            to="/cluster"
          >
            Cluster
            <div className="header-main-menu-status"></div>
          </NavLink>
          {marketplaceLink}
          {stackAppsLink}
        </div>

        <div className="header-main-menu-account">
          <ChangeNamespace location={this.props.location} />
          <div
            className="header-user-image hide-on-mobile"
            data-tip
            data-for="user-avatar"
          >
            <Tooltip id="user-avatar" effect="solid" place="left">
              {name}
            </Tooltip>
              <NavLink
                to="/datacenter/settings/user-profile"
                aria-label="Open user settings page"
              >
              <Avatar />
            </NavLink>
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(MainMenu);
