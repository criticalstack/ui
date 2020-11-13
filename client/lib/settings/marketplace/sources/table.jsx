"use strict";

import React from "react";
import TableBuilder from "../../../../shared/table";
import _ from "lodash";
import h from "../../../helpers";
import moment from "moment";
import { formSchema, uiSchema } from "./../schemas/source";

class Table extends React.Component {
  createRow(d) {
    let name = d.metadata.name;

    let { url } = d.spec;

    let statusIcon;
    let statusState = _.get(d, "status.state", "");
    let statusMsg = _.get(d, "status.reason", "");
    let appCount = _.get(d, "status.appCount", 0);
    let lastUpdate = _.get(d, "status.lastUpdate", null);
    let updated = lastUpdate === null ? null : moment(lastUpdate).format("YYYY-MM-DD HH:mm:ss");
    let update_uptime = lastUpdate === null ? null : h.view.helpers.uptime(lastUpdate);
    let update_rawTime = lastUpdate === null ? null : moment(lastUpdate).format("x");
    if (statusMsg === "") {
      statusMsg = statusState === "" ? "pending" : statusState;
    }
    if (statusState === "" || statusState === "unknown" || statusState === "updating") {
      statusIcon = <i className="glyphicons glyphicons-refresh table-loading" />;
    } else if (statusState === "success") {
      statusIcon = <i className="glyphicons glyphicons-circle-empty-check icon-green" />;
    } else {
      statusIcon = <i className="glyphicons glyphicons-circle-empty-alert icon-red" />;
    }

    let status = (
      <div
        data-balloon={statusMsg}
        data-balloon-pos="right"
      >
        {statusIcon}
      </div>
    );

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    let row = {
      id: name,
      raw: d,
      search: name,
      filter: [name, url],
      cells: [
        {
          value: status,
          style: {
            textAlign: "center"
          }
        },
        {
          value: name
        },
        {
          value: url
        },
        {
          value: appCount
        },
        {
          raw: update_rawTime,
          value: <div
            data-balloon={`updated: ${updated}`}
            data-balloon-pos="up">
            {update_uptime}
          </div>
        },
        {
          raw: rawTime,
          value: <div
            data-balloon={`created: ${created}`}
            data-balloon-pos="up">
            {uptime}
          </div>
        }
      ]
    };

    return row;
  }

  renderSourcesTable(row) {
    let self = this;
    let subBody = [];

    _.each(row.raw.data, function(value, key) {
      let v = atob(value);

      subBody.push({
        id: key,
        raw: [key, v],
        cells: [
          {
            value: <ClipboardEntry
              displayText={key}
              copyText={v}
              uniqueId={`copy-${key}`}
              toolTip=""
              secret={true}
              style={{
                float: "left",
                fontWeight: "bold"
              }}
            />
          },
          {
            value: v.length
          }
        ]
      });
    });

    let subHead = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Length"
        }
      ]
    };

    return (
      <tr key="sources-subtable">
        <td
          className="sub-table-container"
          colSpan="100%">
          <div className="sub-table-arrow-box"></div>

          <TableBuilder
            id="sub-sources-table"
            loading={false}
            head={subHead}
            body={subBody}
            className={"sub-table"}
            closeOnOpen={true}
            history={self.props.history}
            subTable={true}
            hasCheckBox={false}
          />
        </td>
      </tr>
    );
  }

  render() {
    let head = {
      main: [
        {
          column: "status",
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
          value: "URL"
        },
        {
          value: "App Count"
        },
        {
          value: "Last Update"
        },
        {
          value: "Created"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="sources-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map((d) => this.createRow(d))}
          schema={{
            form: formSchema,
            ui: uiSchema
          }}
          hasCheckbox={false}
        />
      </div>
    );
  }
}

export default Table;
