"use strict";

import React from "react";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import h from "../helpers";
import _ from "lodash";
import Mousetrap from "mousetrap";
import NoResult from "../../shared/no-result";
import AppIcon from "./app/app-icon";
import { Link } from "react-router-dom";

const mpOptions = [
  {
    name: "Home",
    path: "/marketplace/feature/home",
    icon: "glyphicons glyphicons-home"
  },
  // {
    // name: "Bookmarked",
    // path: "/marketplace/feature/bookmarked",
    // icon: "glyphicons glyphicons-home"
  // },
  {
    name: "Installed",
    path: "/marketplace/feature/purchased",
    icon: "glyphicons glyphicons-home"
  },
  {
    name: "Updates",
    path: "/marketplace/feature/updates",
    icon: "glyphicons glyphicons-cloud-download"
  }
];

class MarketplaceSearch extends React.Component {

  constructor(props) {
    super(props);

    let path = "/marketplace/feature/home";
    let location = props.location.pathname || path;

    for (let i = 0; i < mpOptions.length; i++) {
      let match = location.match(mpOptions[i].path);

      if (match !== null) {
        path = match[0];
        h.Vent.emit("link", location);
      }
    }

    this.state = {
      searchTerm: "",
      mpOption: path,
      data: [],
      matches: [],
      searchIsActive: false,
      searchClass: "",
      animate: false,
      inputValue: ""
    };
  }

  componentDidMount() {
    let self = this;

    Mousetrap.bind("/", function() {
      self.handleSearchOpen();
    });

    Mousetrap.bind("esc", function() {
      self.handleSearchClose();
    });
    Mousetrap.bind("enter", function() {
      self.handleSubmit();
    });

    h.Vent.addListener("marketplace:search", function(data) {
      self.setState({
        data: data,
        matches: data
      });
    });

    h.Vent.emit("mp-search:request");
  }

  componentWillUnmount() {
    Mousetrap.unbind("/");
    Mousetrap.unbind("esc");
    Mousetrap.unbind("enter");
    h.Vent.removeAllListeners("marketplace:search");
  }

  makeSearchContent(matches) {
    let data = matches.slice();

    let count = data.length;
    let entries = [];

    data.sort(function(a, b) {
      return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
    });

    let noResult = (
      <NoResult
        key="no-result"
        title="No Apps matched"
        body="No Apps matched your search criteria"
        icon="csicon csicon-marketplace"
        addClass="app"
        appClass="light"
        style={{}}
      />
    );

    let matchCount = (
      <div className="mp-search-matches" key="matches">
        {`${count} match${count === 1 ? "" : "es"}`}
      </div>
    );

    entries.push(matchCount);

    if (count === 0) {
      entries.push(noResult);
    }

    for (let i = 0; i < data.length; i++) {
      let app = data[i];
      let v = _.maxBy(app.versions, "version");

      let hasDeployment = _.get(app, "Deployments", []);
      let isInstalled = hasDeployment.length > 0 ? true : false;
      let appCategories = _.get(v, "keywords", []);
      let appIcon = <AppIcon format="table" icon={v.icon} category={appCategories[0]} />;
      let appLink = `/marketplace/app/${app.metadata.name}`;

      let entry = (
        <Link
          to={{
            pathname: appLink,
            state: {
              data: app
            }
          }}
          key={i}
        >
          <div className="mp-search-entry-parent">
            <div className="mp-search-entry">
              <div className="mp-app-icon-parent">
                {isInstalled
                  ? <div style={{border: "1px solid #ddd"}} className="mp-app-icon-installed">Installed</div>
                  : ""
                }
                <img
                  className="mp-app-icon-hc"
                  src="/assets/images/marketplace/icons/app-icon-parent.svg"
                />
                {appIcon}
              </div>
            </div>

            <div className="mp-search-entry">
              {app.appName}
            </div>

            <div className="mp-search-entry">
              -
            </div>

            <div className="mp-search-entry">
              {v.description}
            </div>
          </div>
        </Link>
      );

      entries.push(entry);
    }

    return entries;
  }

  handleSearchClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.target.id !== "mp-search-input") {
      return false;
    }

    if (this.state.searchIsActive) {
      return false;
    }

    this.handleSearchOpen();
  }

  handleInputChange(e, wasSelected) {
    let needle = e;
    let searchIsActive = false;

    if (!wasSelected) {
      needle = e.target.value;
      searchIsActive = true;
    }

    let matches = this.state.data.filter(function(el) {
      return el.metadata.name.toLowerCase().indexOf(needle.toLowerCase()) > -1;
    });

    this.setState({
      matches: matches,
      inputValue: needle.toLowerCase(),
      searchIsActive: searchIsActive
    });
  }

  handleSelectChange(e) {
    let diff = this.props.location.pathname.replace(this.state.mpOption, "");
    let location = diff.length > 0
      ? `${e.target.value}${diff}`
      : e.target.value;

    this.setState({
      mpOption: e.target.value
    });

    h.Vent.emit("link", location);
  }

  handleSearchOpen() {
    let self = this;

    this.setState({
      searchIsActive: true,
      animate: true
    },
      function() {
        self.searchInput.focus();
      }
    );
  }

  handleSearchClose() {
    if (!this.state.searchIsActive) {
      return false;
    }

    this.setState({
      searchIsActive: false,
      animate: true
    });

    h.Vent.emit("marketplace:perform:search", this.state.inputValue);
  }

  handleSubmit() {
    if (!this.state.searchIsActive) {
      return false;
    }

    h.Vent.emit("marketplace:perform:search", this.state.inputValue);
    this.handleSearchClose();
  }

  returnIcon() {
    let self = this;
    return (
      <span>
        <i className={mpOptions[3].Icon} />
        {self.state.mpOption}
      </span>
    );
  }

  render() {
    let menuItems = mpOptions.map((option) =>
      <MenuItem
        disableRipple={true}
        key={option.path}
        value={option.path}
        className="change-namespace-mi"
      >
        {option.name}
      </MenuItem>
    );

    let animateClass = this.state.animate
      ? this.state.searchIsActive ? " open" : " closed"
      : "";

    let fixedClass = this.props.visible
      ? " float"
      : " fixed";

    if (this.props.count <= 1) {
      fixedClass = `${fixedClass}-no-animate`;
    }

    return (
      <div
        className={`mp-search-parent${fixedClass}${animateClass}`}
        onClick={(e) => this.handleSearchClick(e)}
      >
        <div
          className={`mp-search-overlay${animateClass}`}
          onClick={() => this.handleSearchClose()}
        />
        <div className={`mp-search-input-parent${fixedClass}`}>
          <div className="mp-search-select">
            <Select
              value={this.state.mpOption}
              onChange={(e) => this.handleSelectChange(e)}
              className="mp-search-select-parent"
            >
              {menuItems}
            </Select>
          </div>

          <input
            ref={node => {
              this.searchInput = node;
            }}
            autoComplete="off"
            id="mp-search-input"
            className="mp-search-input mousetrap"
            type="text"
            aria-label="Search for a new app"
            placeholder="Start searching for a new app..."
            onChange={(e) => this.handleInputChange(e)}
            value={this.state.inputValue}
          />

          <div className="mp-search-icon-parent"
            onClick={() => this.handleSubmit()}
          >
            <i className="mp-search-icon glyphicons glyphicons-search" />
          </div>

        </div>

        <div className={`mp-search-applist${fixedClass}${animateClass}`}>
          {this.makeSearchContent(this.state.matches)}
        </div>
      </div>
    );
  }
}

export default MarketplaceSearch;
