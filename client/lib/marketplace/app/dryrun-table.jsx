"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import resourceMetadata from "../../../shared/manifests/resource-metadata";
import _ from "lodash";
import DryRunSubTable from "./dryrun-subtable";

class DryRunTable extends React.Component {
  createRow(d, i) {
    let self = this;
    let kind = d.kind;
    let count = d.resources.length;
    let quotaKind = kind.toLowerCase() + "s";
    let limit = _.get(self.props.quota, quotaKind, "-");
    let used = _.get(self.props.used, quotaKind, "-");

    let status;
    if (count < limit || limit === "-") {
      if (count + used < limit || limit === "-") {
        status = <>
          <i className="glyphicons glyphicons-circle-empty-check icon-green td-icon-margin" /> Ok
        </>;
      } else if (used > limit) {
        status = <>
          <i className="glyphicons glyphicons-circle-empty-alert icon-orange td-icon-margin" /> Total usage surpasses limit
          </>;
      } else {
        status = <>
          <i className="glyphicons glyphicons-circle-empty-alert icon-orange td-icon-margin" /> Total usage would surpass limit
          </>;
      }
    } else if ( count === limit) {
      status = <>
        <i className="glyphicons glyphicons-circle-empty-alert icon-orange td-icon-margin" /> Limit reached
        </>;
    } else {
      status = <>
        <i className="glyphicons glyphicons-circle-empty-remove icon-red td-icon-margin" /> Limit exceeded
        </>;
    }

    let noIcon = "glyphicons glyphicons-package";
    let icon = _.get(resourceMetadata, `${kind}.icon`, noIcon);

    let row = {
      id: i,
      raw: d,
      filter: [kind],
      cells: [
        {
          value: <i className={`resource-icon ${icon} td-icon-nomargin`} />,
          style: {
            textAlign: "center",
          }
        },
        {
          value: <div style={{display: "flex", alignItems: "center"}}>
            {kind}
          </div>
        },
        {
          value: count
        },
        {
          value: limit
        },
        {
          value: used
        },
        {
          value: <div style={{display: "flex", alignItems: "center"}}>
            {status}
          </div>
        }
      ]
    };

    row.icon = icon;

    return row;
  }

  renderDropdown(row) {
    return (
      <tr key="resources-dropdown">
        <td
          className="sub-table-container"
          colSpan="100%">
          <div className="sub-table-arrow-box">
            <DryRunSubTable
              data={row.raw.resources}
              icon={row.icon}
              className="sub-table"
            />
          </div>
        </td>
      </tr>
    );
  }

  render() {
    let head = {
      main: [
        {
          style: {
            width: "60px",
            textAlign: "center"
          },
          value: <i className="glyphicons glyphicons-palette-package" />
        },
        {
          value: "Kind"
        },
        {
          value: "Count"
        },
        {
          value: "Limit"
        },
        {
          value: "Used"
        },
        {
          value: "Status"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="mp-dryrun-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map((d, i) => this.createRow(d, i))}
          hasOnRowClick={true}
          closeOnOpen={true}
          onRowClickRenderFunction={(d) => this.renderDropdown(d)}
          closeOnOpen={true}
          noContextMenu
        />
      </div>
    );
  }
}

export default DryRunTable;
