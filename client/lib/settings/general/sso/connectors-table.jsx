"use strict";

import React from "react";
import TableBuilder from "../../../../shared/table";
import _ from "lodash";
import moment from "moment";
import { RBACContext } from "../../../../shared/context/rbac";

class ConnectorsTable extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "Connector Name"
        },
        {
          value: "Type"
        },
        {
          value: "Created"
        }
      ]
    };

    return head;
  }

  createRow(d) {
    let {
      uid: uid,
      name: name,
    } = d.metadata;
    let {
      id: id,
      type: type,
      name: niceName
    } = d;
    let isDefault = _.has(d.metadata, ["labels", "criticalstack.com/dex.default"]);
    let createdTime = moment(d.metadata.createdTimestamp).format("YYYY-MM-DD HH:mm:ss");

    let row = {
      id: uid,
      raw: d,
      search: name,
      filter: [name, id, type],
      cells: [
        {
          value: <div
                  style={{
                    display: "flex",
                    alignItems: "center"
                  }}>
          {niceName} {
             isDefault ? <div className="label-pair" style={{margin: "0 0 0 10px"}}><span className="label-key">default</span></div> : null
          }
          </div>
        },
        {
          value: type
        },
        {
          value: createdTime
        }
      ]
    };
    return row;
  }

  render() {
    return (
      <div>
        <TableBuilder
          id="connectors-table"
          route="connectors.dex.coreos.com"
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

ConnectorsTable.contextType = RBACContext;

export default ConnectorsTable;
