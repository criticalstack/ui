"use strict";

import React from "react";
import Drawer from "@material-ui/core/Drawer";
import { withStyles } from "@material-ui/core/styles";
import AppList from "./app/app-list.jsx";
import AppDetail from "./app/app-detail";
import MPInstallationsList from "./app/mp-installations-list.jsx";
import ContentLoader from "../layout/content-loader";
import csData from "./cs-data.jsx";
import NoResult from "../../shared/no-result";
import Forbidden from "../../shared/forbidden";
import LoaderMaker from "../../shared/loader-maker";
import { NavLink, withRouter } from "react-router-dom";
import h from "../helpers";
import _ from "lodash";
import Session from "../helpers/session";
import { RBACContext } from "../../shared/context/rbac";

const styles = {
  paper: {
    backgroundColor: "transparent"
  }
};

class Marketplace extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      csConfig: {},
      matches: [],
      bucket: {
        all: [],
        bookmarked: [],
        purchased: [],
        updates: []
      },
      searchValue: "",
      namespace: Session.namespace(),
      categories: false,
      sourcesDrawer: false,
      sources: [],
      spread: 5,
      loading: true,
      version: 0,
      width: window.innerWidth,
    };

    this.fetchState(props.match.params);

    this.updateDimensions = this.updateDimensions.bind(this);
    window.scroll(0, 0);
  }

  updateDimensions() {
    let x = window.innerWidth;
    let y = 5;
    let spread = this.state.spread;

    if (x <= 2300) {
      y = 4;
    }

    if (x <= 1600) {
      y = 3;
    }

    if (x <= 1300) {
      y = 2;
    }

    if (x <= 900) {
      y = 1;
    }

    if (spread !== y) {
      this.setState({
        spread: y,
        width: x
      });
    }
  }

  componentDidMount() {
    let self = this;

    let csConfig = JSON.parse(localStorage.getItem("cs-config")) || {};
    self.setState({csConfig});

    this.updateDimensions(window.innerWidth);

    window.addEventListener("resize", this.updateDimensions, false);

    h.Vent.addListener("marketplace:app:actions", function(actionArgs) {
      let action = actionArgs.action;
      let appId = actionArgs.appId;
      let value = actionArgs.value;

      h.fetch({
        endpoint: h.ns(`/applications.marketplace.criticalstack.com/${appId}/${action}/${value}`),
        success: function(modifiedApp) {
          let apps = self.state.searchValue.length > 0
            ? self.state.matches
            : self.state.data;

          let app = modifiedApp.context.result;
          let index = _.findIndex(apps, {UID: app.UID});
          apps.splice(index, 1, app);

          let bucket = self.groupByType(apps);

          self.setState({
            bucket: bucket
          });

        }, error: function(actionError) {
          h.Vent.emit("request-error:confirm-box", actionError);
        }
      });
    });

    h.Vent.addListener("marketplace:perform:search", function(needle) {
      let matches = self.state.data.filter(function(el) {
        return el.appName.toLowerCase().indexOf(needle.toLowerCase()) > -1;
      });

      let bucket = self.groupByType(matches);

      self.setState({
        matches: matches,
        bucket: bucket,
        searchValue: needle.toLowerCase()
      });
    });

    h.Vent.addListener("marketplace:app:link", function(name, state) {
      self.props.history.push(`/marketplace/app/${name}`, state);
    });

    h.Vent.addListener("mp-search:request", function() {
      h.Vent.emit("marketplace:search", self.state.data);
    });

    self.fetchSources();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateDimensions, false);
    h.Vent.removeAllListeners("marketplace:app:actions");
    h.Vent.removeAllListeners("marketplace:perform:search");
    h.Vent.removeAllListeners("marketplace:app:link");
    h.Vent.removeAllListeners("mp-search:request");
  }

  componentDidUpdate(prevProps) {
    if (this.props.location.pathname !== prevProps.location.pathname) {
      this.fetchState(this.props.match.params);
      return true;
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.namespace !== Session.namespace()) {
      this.fetchState(nextProps.match.params);
      return true;
    }

    if (this.state !== nextState) {
      return true;
    }

    return false;
  }

  fetchState(params) {
    let self = this;
    let category = _.get(params, "category");
    let srcName = _.get(params, "source");
    let url;

    let q = [];
    if (typeof srcName !== "undefined") {
      q.push(`marketplace.criticalstack.com/source.name=${srcName}`);
    }
    if (typeof category !== "undefined") {
      q.push(`marketplace.criticalstack.com/application.category.${category}=`);
    }
    url = `/applications.marketplace.criticalstack.com${q.length > 0 ? `?labelSelector=${q.join(",")}` : ""}`;

    self.setState({
      loading: true
    });

    h.fetch({
      endpoint: h.ns(url),
      success: function(data) {
        h.log.info("apps: ", data);
        let result = _.orderBy(data.context.result, [app => app.appName.toLowerCase()], ["asc"]) || [];
        let bucket = self.groupByType(result);

        // update search component
        h.Vent.emit("marketplace:search", result);

        self.setState({
          data: result || [],
          bucket: bucket,
          loading: false,
          namespace: Session.namespace()
        });
      }, error: function(fetchError) {
        self.setState({
          loading: false,
        });
        h.Vent.emit("request-error:confirm-box", fetchError);
      }
    });
  }

  fetchSources() {
    let self = this;

    h.fetch({
      endpoint: h.ns("/sources.marketplace.criticalstack.com"),
      success: function(data) {
        h.log.info("app sources:", data);

        self.setState({
          sources: data.context.result || []
        });
      }
    });
  }

  groupByType(result) {
    let bucket = {
      all: [],
      bookmarked: [],
      purchased: [],
      updates: []
    };

    result.map(function(app) {
      let hit = false;

      if (_.get(app, "Bookmarked", false)) {
        bucket.bookmarked.push(app);
      }

      if (!hit) {
        bucket.all.push(app);
      }
    });

    return bucket;
  }

  toggleCategories(newState) {
    newState = !newState
      ? !this.state.categories
      : newState;

    this.setState({
      categories: newState
    });
  }

  toggleSources(newState) {
    newState = !newState
      ? !this.state.sourcesDrawer
      : newState;

    this.setState({
      sourcesDrawer: newState
    });
  }

  clearFilter(e, filter) {
    e.preventDefault();
    e.stopPropagation();

    let match = this.props.match;
    let url;

    if (filter === "source") {
      url = `/source/${match.params.source}`;
    } else if ( filter === "category") {
      url = `/category/${match.params.category}`;
    } else {
      url = "";
    }

    if (!filter) {
      return false;
    }

    h.Vent.emit("link", `${match.url.replace(url, "")}`);
  }

  render() {
    let mpEnabled = _.get(this.state.csConfig, "marketplace.enabled", false);
    let spread = this.state.spread;
    let requested = this.props.match.params.feature;
    let app = this.props.match.params.app || false;
    let data = this.state.data;

    let all = this.state.bucket.all;
    // let bookmarked = this.state.bucket.bookmarked;
    let updates = this.state.bucket.updates;

    if (app) {
      requested = "app";
    }

    const installationsConfig = {
      title: "Installed Versions",
      endpoint: "releases",
      api: "marketplace.criticalstack.com/v1alpha2",
      events: "Release",
      ignoreWebsocket: false,
      icon: "glyphicons glyphicons-layers",
      noResultTitle: "No Installations",
      noResultBody: "No installations were found",
      location: this.props.location,
      editor: true,
      content: <MPInstallationsList
        id="mp-purchased"
        subTitle="I think these belong to you"
        emptyMessage="You haven't installed anything yet"
        emptyIcon="glyphicons glyphicons-basket"
        format="table"
        spread={spread}
      />,
      noButtons: true,
      noTitle: true,
      noResultBypass: true,
      resource: "releases.marketplace.criticalstack.com"
    };

    const mpFeatures = {
      app: <AppDetail />,
      // bookmarked: <AppList
        // key="mp-bookmarked-0"
        // id="mp-bookmarked"
        // title={`Bookmarked (${bookmarked.length})`}
        // subTitle="Try us! What are you waiting for?"
        // emptyMessage="You haven't bookmarked anything yet"
        // emptyIcon="glyphicons glyphicons-bookmark"
        // format="carousel"
        // data={bookmarked}
        // spread={spread}
      // />,
      home: [
        <AppList
          key="mp-popular"
          id="mp-popular"
          key={1}
          title={`Popular Apps (${all.length})`}
          subTitle="Power up your data center with these popular apps"
          format="carousel"
          data={all}
          spread={spread}
        />,
        // <AppList
          // key="mp-bookmarked-1"
          // id="mp-bookmarked"
          // title={`Bookmarked (${bookmarked.length})`}
          // subTitle="Try us! What are you waiting for?"
          // emptyMessage="You haven't bookmarked anything yet"
          // emptyIcon="glyphicons glyphicons-bookmark"
          // format="carousel"
          // data={bookmarked}
          // spread={spread}
        // />,
        <AppList
          key="mp-updates-0"
          id="mp-updates"
          title={`Apps with Updates (${updates.length})`}
          subTitle="Up to date, All day, every day"
          emptyMessage="You already have the latest and greatest"
          emptyIcon="glyphicons glyphicons-circle-empty-check"
          type="app"
          format="grid"
          data={updates}
          spread={spread}
        />,
        <ContentLoader key="cl-0" config={installationsConfig} />
      ],
      purchased: <ContentLoader key="cl-1" config={installationsConfig} />,
      updates: <AppList
        key="mp-updates-1"
        id="mp-updates"
        title={`Apps with Updates (${updates.length})`}
        subTitle="Up to date, All day, every day"
        emptyMessage="You already have the latest and greatest"
        emptyIcon="glyphicons glyphicons-circle-empty-check"
        type="app"
        format="grid"
        data={updates}
        spread={spread}
      />
    };

    let featureTest = mpFeatures.hasOwnProperty(requested);

    let mpFeature = featureTest
      ? mpFeatures[requested]
      : mpFeatures.home;

    let noAppsMsg = _.get(this.state.csConfig, "marketplace.noAppsMsg", "");
    let mpContact = _.get(this.state.csConfig, "marketplace.contact", "");
    let noAppsLink = _.get(this.state.csConfig, "marketplace.noAppsLink", "");
    let mailto = `mailto: ${mpContact}`;

    let action = <div>
      <div>
        {
          (noAppsMsg === "" && mpContact === "" && noAppsLink === "") ?
            "Contact your administrator to request an application" :
            noAppsMsg
        }
      </div>
      {
        (mpContact !== "" || noAppsLink !== "") && (
          <div>
            <span>Request an app by </span>
            {mpContact !== "" && (<span>contacting the<a href={mailto}>administrator </a></span>)}
            {mpContact !== "" && noAppsLink !== "" && (<span>or </span>)}
            {noAppsLink !== "" && (<span>clicking<a href={noAppsLink} target="_blank">here</a></span>)}
          </div>
        )
      }
    </div>;

    let noResult = (
      <NoResult
        title="No Apps matched"
        body="No applications matched your search criteria"
        icon="glyphicons glyphicons-cloud"
        action={action}
        addClass="app"
        appClass="dark"
        style={{}}
      />
    );

    let loading = <LoaderMaker extraClass="mp-loading" />;

    if (this.state.loading) {
      mpFeature = loading;
    }

    let canListApps = _.get(this.context.access, [ "applications.marketplace.criticalstack.com", "list"], true);
    if (!canListApps) {
      mpFeature = (<Forbidden />);
    }

    if (canListApps && data.length <= 0 && !this.state.loading) {
      mpFeature = noResult;
    }

    let categoryLink = this.props.match.params.category || false;
    let categoryIcon = categoryLink
     ? categoryLink.replace(".", "-")
     : "";

    let category = csData.find(o => o.appId === categoryLink) || {};
    let categoryName = "";

    if (category.hasOwnProperty("name")) {
      categoryName = category.name;
    }

    let categoryStyle = categoryLink
      ? "open"
      : "closed";

    let sourceName = this.props.match.params.source;
    let sourceStyle = sourceName
      ? "open"
      : "closed";

    let listItems = csData.map((c, i) =>
      <NavLink
        key={i}
        to={`/marketplace/feature/${requested}/category/${c.appId}${ sourceName ? `/source/${sourceName}` : ""}`}
        className="list-entry"
        activeClassName="selected"
      >
        <i className={`csicon csicon-mp-${c.appId.replace(".", "-")} list-entry-icon`} />
        {c.name}
      </NavLink>
    );

    let srcListItems = this.state.sources.map((c, i) =>
      <NavLink
        key={i}
        to={`/marketplace/feature/${requested}${ categoryLink ? `/category/${categoryLink}` : ""}/source/${c.metadata.name}`}
        className="list-entry"
        activeClassName="selected"
      >
        <div className="src-avatar">
          <img
            alt={c.metadata.name}
            style={{
              width: "36px",
              maxWidth: "60px"
            }}
            src={"/assets/images/cloud.png"}
          />
        </div>
        <span className="src-owner">{c.metadata.name}</span>
      </NavLink>
    );

    return (
      <div className="marketplace">
        {(mpEnabled && !app && canListApps) ?
            <div className="mp-content-parent">

              <div
                className="mp-category-toggle"
                onClick={() => this.toggleCategories()}
              >
                <i className="glyphicons glyphicons-list" />
              </div>

              <div
                className="mp-source-toggle"
                onClick={() => this.toggleSources()}
              >
                <i className="glyphicons glyphicons-folder-cogwheel" />
              </div>

              <div className={`mp-category-active ${categoryStyle}`}>
                <i className={`csicon csicon-mp-${categoryIcon} mp-category-active-icon`} />
                <div className="mp-category-active-name">
                  {categoryName}
                </div>
                <i
                  className="glyphicons glyphicons-menu-close mp-category-remove-icon"
                  onClick={(e) => this.clearFilter(e, "category")}
                />
              </div>

              <Drawer
                className="mp-categories"
                open={this.state.categories}
                onClose={() => this.toggleCategories(false)}
                classes={{
                  paper: this.props.classes.paper
                }}
              >
                <div
                  className="mp-categories-list"
                  tabIndex={0}
                  role="button"
                  onClick={() => this.toggleCategories(false)}
                  onKeyDown={() => this.toggleCategories(false)}
                >
                  <div className="mp-categories-list-header">
                    Categories
                  </div>
                  {listItems}
                </div>
              </Drawer>

              <div className={`mp-source-active ${sourceStyle}`}>
                <div className="src-avatar">
                </div>
                <div className="mp-source-active-name">
                  {sourceName}
                </div>
                <i
                  className="glyphicons glyphicons-menu-close mp-source-remove-icon"
                  onClick={(e) => this.clearFilter(e, "source")}
                />
              </div>

              <Drawer
                className="mp-sources"
                open={this.state.sourcesDrawer}
                onClose={() => this.toggleSources(false)}
                classes={{
                  paper: this.props.classes.paper
                }}
              >
                <div
                  className="mp-sources-list"
                  tabIndex={0}
                  role="button"
                  onClick={() => this.toggleSources(false)}
                  onKeyDown={() => this.toggleSources(false)}
                >
                  <div className="mp-sources-list-header">
                    App Sources
                  </div>
                  {srcListItems}
                </div>
              </Drawer>
            </div> : ""
        }
        {
          mpEnabled ? mpFeature : (
            <NoResult
              title="Marketplace Disabled"
              body="Marketplace Disabled"
              icon="glyphicons glyphicons-cloud-off"
              action=""
            />
          )
        }
      </div>
    );
  }
}

Marketplace.contextType = RBACContext;

export default withRouter(withStyles(styles)(Marketplace));
