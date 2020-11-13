"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";

class Table extends React.Component {
  createRow(d) {
    let name = d.metadata.name;
    let error = d.conditions[0].error || "-";
    let message = d.conditions[0].message;
    let status = d.conditions[0].status;
    let type = d.conditions[0].type;
    let statusMessage = "-";
    let statusIcon = "glyphicons-circle-remove container-off";

    if (status === "True") {
      statusMessage = type;
      statusIcon = "glyphicons-circle-check container-on";
    }

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          raw: status,
          value: <div
            data-balloon={statusMessage}
            data-balloon-pos="up">
            <i className={`glyphicons ${statusIcon}`} />
          </div>,
          style: {
            textAlign: "center",
            paddingLeft: 0
          }
        },
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: statusMessage
        },
        {
          value: message
        },
        {
          value: error
        }
      ]
    };

    return row;
  }

  render() {
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
          value: "Status"
        },
        {
          value: "Message"
        },
        {
          value: "Error"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="component-statuses-table"
          className="default-table"
          head={head}
          body={this.props.data.map(this.createRow.bind(this))}
          hasCheckbox={false}
          sort={true}
          filter={false}
          noContextMenu
        />
      </div>
    );
  }
}

export default Table;
