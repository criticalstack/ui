"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import ClipboardEntry from "../../../shared/clipboard-entry";
import moment from "moment";
import _ from "lodash";
import h from "../../helpers";

class Table extends React.Component {
  createRow(d) {
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let type = d.type;
    let count = d.hasOwnProperty("data") ? Object.keys(d.data).length : 0;
    let labels = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="secrets"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: type
        },
        {
          value: count
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
          value: labels
        }
      ]
    };

    return row;
  }

  renderSecretTable(row) {
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
      <tr key="secrets-subtable">
        <td
          className="sub-table-container"
          colSpan="100%">
          <div className="sub-table-arrow-box"></div>

          <TableBuilder
            id="sub-secrets-table"
            loading={false}
            head={subHead}
            body={subBody}
            className={"sub-table"}
            hasOnRowClick={false}
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
          value: "Name"
        },
        {
          value: "Type"
        },
        {
          value: "Count"
        },
        {
          value: "Age"
        },
        {
          value: "Labels"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="secrets-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
          hasOnRowClick={true}
          onRowClickRenderFunction={(d) => this.renderSecretTable(d)}
          closeOnOpen={true}
        />
      </div>
    );
  }
}

export default Table;
