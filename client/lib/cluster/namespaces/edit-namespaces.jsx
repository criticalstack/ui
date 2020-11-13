"use strict";

import React from "react";
import h from "../../helpers";
import TableBuilder from "../../../shared/table";
import NoResult from "../../../shared/no-result";
import LoaderMaker from "../../../shared/loader-maker";
import LabelMaker from "../../../shared/label-maker";
import _ from "lodash";
import moment from "moment";

class EditNamespaces extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      namespaceDetail: {},
      users: [],
      loading: true
    };
  }

  componentDidMount() {
    this.fetchState();
  }

  fetchState() {
    let self = this;

    h.fetch({
      endpoint: "/rbac/users",
      resUrl: false,
      success: function(data) {
        h.log.info("Result:", data);

        let namespaceDetail = self.state.namespaceDetail;

        _.each(self.props.namespaces, (n) => {
          let count = 0;
          let namespace = _.get(n, "metadata.name", "");

          _.each(data.context.result, (user) => {
            if (user.hasOwnProperty("Roles") && Array.isArray(user.Roles)) {
              let memberOf = _.findIndex(user.Roles, {Namespace: namespace});
              if (memberOf !== -1) {
                count++;
              }
            }
          });

          namespaceDetail[namespace] = {
            userCount: count
          };
        });

        self.setState({
          users: data.context.result,
          namespaceDetail: namespaceDetail,
          loading: false
        });
      }
    });
  }

  createRow(d) {
    let namespaceDetail = this.state.namespaceDetail;
    let name = d.metadata.name;
    let userCount = _.get(namespaceDetail[name], "userCount", 0);
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created) || "-";
    let rawTime = moment(created).format("x");
    let labels = "None";
    let status = _.get(d, "status.phase", "Unknown");
    let statusIcons = {
      Active: "glyphicons glyphicons-power container-on",
      Terminating: "glyphicons glyphicons-power-cord-plug-off container-off",
      Unknown: "glyphicons glyphicons-circle-empty-question table-job-complete"
    };

    let statusIcon = statusIcons[status];

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="namespaces"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    let row = {
      id: d.metadata.name,
      raw: d,
      search: d.metadata.name,
      cells: [
        {
          raw: status,
          value: <div
            data-balloon={status}
            data-balloon-pos="right">
            <i className={statusIcon} />
              </div>,
          style: {
            textAlign: "center"
          }
        },
        {
          raw: d.metadata.name,
          value: <b>{d.metadata.name}</b>
        },
        {
          value: userCount
        },
        {
          raw: rawTime,
          value: <div
            data-balloon={`created: ${created}`}
            data-balloon-pos="up">
            {uptime}
          </div>
        },
        {
          value: d.status.phase
        },
        {
          value: labels
        }
      ]
    };

    return row;
  }

  renderTableOrNoData() {
    let head = {
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
          value: "Members",
          style: {
            width: "100px"
          }
        },
        {
          value: "Created"
        },
        {
          value: "Status"
        },
        {
          value: "Labels"
        }
      ]
    };

    let namespaces = this.props.namespaces.map((namespace) => {
      return this.createRow(namespace);
    });

    if (namespaces.length > 0) {
      return (
        <TableBuilder
          id="namespace-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={namespaces}
          hasCheckbox={true}
          sort={true}
          filter={false}
        />
      );
    }

    if (this.state.loading) {
      return <LoaderMaker id="namespaces-nodata" config="no-data-large" />;
    }

    return (
      <NoResult
        title={"No Namespaces"}
        body={"No Namespaces were found"}
        icon="csicon csicon-namespace"
        style={{
          paddingTop: "50px",
          paddingBottom: "10px"
        }}
      />
    );
  }

  render() {
    return this.renderTableOrNoData();
  }
}

export default EditNamespaces;
