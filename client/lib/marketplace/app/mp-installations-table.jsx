"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import MPInstallationsSubTable from "./mp-installations-subtable";

class MPInstallationsTable extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "App"
        },
        {
          value: "Installations"
        },
        {
          value: "Source Name"
        }
      ]
    };

    return head;
  }

  createRow(d) {
    let appName = d.appName;
    let source = d.source;
    let installationsCount = d.releases.length;

    let row = {
      id: appName + source,
      raw: d,
      search: appName,
      filter: [appName],
      cells: [
        {
          raw: appName,
          value: <strong>{appName}</strong>
        },
        {
          value: installationsCount
        },
        {
          value: source || "No Source Name"
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <div style={{
        width: "inherit"
      }}>
        <TableBuilder
          id="releases-table"
          route={this.props.route}
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasOnRowClick={true}
          closeOnOpen={true}
          preventSearchFocus={true}
          noContextMenu
          onRowClickRenderFunction={function(row) {
            return (
              <tr key="containers-table-tr-1">
                <td
                  className="sub-table-container"
                  colSpan="100%">
                  <div className="sub-table-arrow-box"></div>
                    <MPInstallationsSubTable
                      data={row.raw.releases}
                      className="sub-table"
                    />
                </td>
              </tr>
            );
          }}
        />
      </div>
    );
  }
}

export default MPInstallationsTable;
