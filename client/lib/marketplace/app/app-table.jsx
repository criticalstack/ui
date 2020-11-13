"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import _ from "lodash";
import h from "../../helpers";
import { withRouter } from "react-router-dom";
import AppIcon from "./app-icon.jsx";

class AppTable extends React.Component {
  handleClick(e) {
    h.Vent.emit("marketplace:app:actions", {
      action: e.currentTarget.getAttribute("data-action"),
      appId: e.currentTarget.getAttribute("data-appid"),
      value: e.currentTarget.getAttribute("data-value")
    });
  }

  createHeadings() {
    const head = {
      main: [
        {
          disableClick: true,
          value: <i className="glyphicons glyphicons-flash"></i>,
          className: "icon-cell",
          style: {
            width: "4%",
            textAlign: "center"
          }
        },
        {
          value: "Name"
        },
        {
          value: "Description"
        },
        {
          value: "Author"
        },
        {
          value: "Versions"
        },
        {
          value: "Licenses"
        },
        {
          disableClick: true,
          value: <i className="glyphicons glyphicons-star"></i>,
          className: "icon-cell",
          style: {
            width: "120px",
            minWidth: "120px",
            textAlign: "center",
            padding: 0
          }
        },
        {
          disableClick: true,
          value: <i className="glyphicons glyphicons-bookmark"></i>,
          className: "icon-cell",
          style: {
            width: "120px",
            textAlign: "center"
          }
        },
        {
          value: "Application Tags",
          style: {
            width: "400px"
          },
        }
      ]
    };

    return head;
  }

  createRow(app) {
    let hasDeployment = _.get(app, "Deployments", []);
    let v = _.maxBy(app.versions, "version");
    let isInstalled = hasDeployment.length > 0 ? true : false;
    let appCategories = _.get(v, "Categories", []);
    let appTags = _.get(v, "keywords", []);
    let icon = _.get(v, "icon", false);
    let appIcon = <AppIcon format="table" icon={icon} category={appCategories[0]} />;
    let appAuthor = (v.maintainers || []).length > 0 ? v.maintainers.map(m => `${m.name}${m.email ? ` (${m.email})` : ""}`).join(", ") : app.appName;
    let versions = v.version;
    let licenses = app.hasOwnProperty("Licenses")
      ? app.Licenses.join(" - ")
      : "Unknown";
    let isBookmarked = _.get(app, "Bookmarked", false);
    let bookmarkClass = isBookmarked !== false
      ? "table-app-header-bookmark-added animated rubberBand"
      : "table-app-header-bookmark";
    let isFavorite = _.get(app, "Favorite", false);
    let favoriteCount = _.get(app, "FavoriteCount", 0);
    let favoriteClass = isFavorite ? "table-app-favorite animated rubberBand" : "";
    let appIconParent = (
      <div className="mp-app-icon-parent">
        {isInstalled
          ? <div className="mp-app-icon-installed">Installed</div>
          : ""
        }
        {appIcon}
      </div>
    );

    let row = {
      id: app.metadata.name,
      raw: app,
      filter: [app.metadata.name],
      cells: [
        {
          value: appIconParent
        },
        {
          raw: app.appName,
          value: <strong>{app.appName}</strong>
        },
        {
          value: <span title={v.description}>{_.truncate(v.description, {length: 75})}</span>
        },
        {
          value: <span title={appAuthor}>{_.truncate(appAuthor, {length: 75})}</span>
        },
        {
          value: versions
        },
        {
          value: licenses
        },
        {
          value: <div
            data-action="favorite"
            data-appid={app.metadata.name}
            data-value={!isFavorite}
            onClick={(e) => this.handleClick(e)}
            className="table-stamp"
          >
            <i className={`glyphicons glyphicons-star ${favoriteClass}`} />
            {favoriteCount}
          </div>
        },
        {
          value: <div
            data-action="bookmarked"
            data-appid={app.metadata.name}
            data-value={!isBookmarked}
            onClick={(e) => this.handleClick(e)}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column"
            }}
          >
            <i
              className={`glyphicons glyphicons-bookmark ${bookmarkClass}`}
            />
          </div>,
          style: {
            textAlign: "center",
            padding: 0
          }
        },
        {
          value: <LabelMaker
            scope="tag"
            data={appTags}
            caller=".mp-app-labels"
          />
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <TableBuilder
        id={`${this.props.id}-table`}
        className="default-table"
        head={this.createHeadings()}
        body={this.props.data.map(this.createRow.bind(this))}
        hasCheckbox={false}
        filter={false}
      />
    );
  }
}

export default withRouter(AppTable);
