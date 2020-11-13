"use strict";

import React from "react";
import AppList from "../../marketplace/app/app-list.jsx";
import csData from "../../marketplace/cs-data.jsx";
import MarketplaceSearch from "../../marketplace/marketplace-search";
import VisibilitySensor from "react-visibility-sensor";
import Backdrop from "./../../../shared/backdrop";
import h from "../../helpers";
import _ from "lodash";
import { RBACContext } from "./../../../shared/context/rbac";

class MpContentHeader extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      csConfig: {},
      width: window.innerWidth,
      searchIsVisible: true,
      count: 0,
      banner: {
        seed: "",
        xColors: [],
        yColors: []
      },
      ready: false
    };
  }

  componentDidMount() {
    let self = this;

    let csConfig = JSON.parse(localStorage.getItem("cs-config")) || {};
    self.setState({csConfig});

    h.Vent.addListener("marketplace:banner", function(banner) {
      self.setState({
        banner: banner,
        ready: true
      });
    });
  }

  componentDidUpdate(lastProps, lastState) {
    if (lastState.count === 0 && this.state.count === 0) {
      this.setState({
        count: 1
      });
    }

    if (lastState.count === this.state.count && this.state.count !== 0) {
      this.setState({
        count: 0
      });
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("marketplace:banner");
  }

  render() {
    let data = this.state.data;
    let app = this.props.match.params.app || false;

    if (app && !this.state.ready) {
      return false;
    }

    let mpParentClass = app
      ? "header-marketplace-app"
      : "header-marketplace";

    let appHeader = (
      <VisibilitySensor
        onChange={(visible) => {
          this.setState({
            searchIsVisible: visible,
            count: this.state.count + 1
          });
        }}
        partialVisibility="top"
        offset={{top: -540}}
      >
        <div className={mpParentClass}>
          {!app ? [
            <AppList
              id="featured"
              key={1}
              format="featured"
              data={csData}
              spread={3}
              location={this.props.location}
            />,
            <MarketplaceSearch
              key={2}
              location={this.props.location}
              visible={this.state.searchIsVisible}
              count={this.state.count}
              data={data}
            />
          ] : [
            <div
              key={1}
              className="header-marketplace-canvas"
            >
              <Backdrop
                width={this.state.width}
                height={187}
                seed={this.state.banner.seed}
                xColors={this.state.banner.xColors}
                yColors={this.state.banner.yColors}
              />
            </div>,
            <div
              key={2}
              className="header-marketplace-link"
              onClick={() => this.props.history.push("/marketplace/feature/home")}
            >
              <div>
                <i className="glyphicons glyphicons-arrow-left" />
              </div>
              <span>Return to Marketplace</span>
            </div>,
            <div
              key={3}
              className="header-marketplace-app-overlay">
              <div>
                {this.state.banner.seed}
              </div>
            </div>
          ]}
        </div>
      </VisibilitySensor>
    );

    return (
      <div>
        {
          _.get(this.state.csConfig, "marketplace.enabled", false) &&
            _.get(this.context.access, ["applications.marketplace.criticalstack.com", "list"], true) &&
            (appHeader)
        }
      </div>
    );
  }
}

MpContentHeader.contextType = RBACContext;

export default MpContentHeader;
