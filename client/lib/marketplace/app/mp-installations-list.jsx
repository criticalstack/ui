import React from "react";
import _ from "lodash";
import NoResult from "../../../shared/no-result";

import MPInstallationsTable from "./mp-installations-table";

class MPInstallationsList extends React.Component {
  filterReleasesByApp(data) {
    let apps = [];

    data.forEach(release => {
      let hasMPLabel = _.has(release, ["metadata", "labels", "marketplace.criticalstack.com/source.name"]);
      if (hasMPLabel) {
        let appName = release.spec.chart.metadata.name;
        let source = release.metadata.labels["marketplace.criticalstack.com/source.name"];

        // if we haven't seen this app/source before, create an entry for it
        let seen = apps.some(app => app.appName === appName && app.source === source);
        if (!seen) {
          apps.push({appName, source, releases: []});
        }

        // add the release to its matching app/source object
        let matchingApp = apps.find(app => app.appName === appName && app.source === source);
        matchingApp.releases.push(release);
      }
    });

    return apps;
  }

  render() {
    let data = this.filterReleasesByApp(this.props.data);

    let spread = this.props.spread;
    let sectionWidths = {
      2: "580px",
      3: "890px",
      4: "1200px",
      5: "1510px"
    };
    let sectionWidth = _.get(sectionWidths, spread, "100%");

    let emptyMessage = this.props.hasOwnProperty("emptyMessage")
      ? this.props.emptyMessage
      : "No Apps found";

    let emptyIcon = this.props.hasOwnProperty("emptyIcon")
      ? this.props.emptyIcon
      : "glyphicons glyphicons-cloud";

    let noResult = (
      <div
        className="mp-section-content"
        style={{
          marginTop: "20px",
          width: sectionWidth,
          background: "rgb(255, 255, 255)",
          borderRadius: "5px",
          paddingBottom: "40px",
          boxShadow: "0 0 8px 0 rgba(0,0,0,.16)"
        }}
      >
        <NoResult
          title="No Apps found"
          body={emptyMessage}
          icon={emptyIcon}
          addClass="app"
          appClass="dark"
          style={{marginTop: "50px"}}
        />
      </div>
    );

    return (
      <div
        id={this.props.id}
        className="mp-section-parent"
       >

        <div className="mp-section">
          <div className="mp-section-title">
            <div className="mp-title-text">
              {`Installed (${data.length})`}
            </div>
            <div className="mp-subtitle-text">
              {this.props.subTitle}
            </div>
          </div>

          {data.length > 0 ?
            <div
              className="mp-section-content"
              style={{
                width: sectionWidth
              }}
            >
            <MPInstallationsTable
              data={data}
              spread={spread}
              id={this.props.id}
            />
          </div> : noResult
          }
        </div>

      </div>
    );
  }
}

export default MPInstallationsList;
