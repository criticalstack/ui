"use strict";

import Avatar from "../../layout/avatar";
import React from "react";
import TableBuilder from "../../../shared/table";
import moment from "moment";
import { RBACContext } from "../../../shared/context/rbac";

class UserRequestsTable extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          column: "options",
          style: {
            width: "60px",
            textAlign: "center"
          },
          value: <i className="glyphicons glyphicons-user-squared"></i>
        },
        {
          value: "Name"
        },
        {
          value: "Email"
        },
        {
          value: "Type"
        },
        {
          value: "Status"
        },
        {
          value: "Created"
        }
      ]
    };

    return head;
  }

  renderAvatar(user) {
    if (user.hasOwnProperty("customAvatar") && user.customAvatar.length > 0) {
      return <img width="36px" src={user.customAvatar} />;
    } else if (user.hasOwnProperty("avatar")) {
      return <img width="36px" src={"//1.gravatar.com/avatar/" + user.avatar} />;
    }
    return "";
  }

  createRow(d) {
    let id = d.metadata.name;
    let name = d.spec.template.username;
    let email = d.spec.template.email;
    let type = d.spec.template.type;
    let isActive = d.spec.template.active;
    let createdTime = moment(d.metadata.createdTimestamp).format("YYYY-MM-DD HH:mm:ss");

    let cellStyle = isActive ? { opacity: 1 } : { opacity: 0.3 };

    let row = {
      id: id,
      raw: d,
      search: name,
      filter: [name, email],
      cells: [
        {
          value: <Avatar key={`avatar-${id}`} user={d} />,
          style: {
            textAlign: "center",
            ...cellStyle
          }
        },
        {
          value: name,
          style: cellStyle
        },
        {
          value: email,
          style: cellStyle
        },
        {
          value: type,
          style: cellStyle
        },
        {
          value: isActive ? "active" : "inactive",
          style: cellStyle
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
          id="userrequests-table"
          route="userrequests.criticalstack.com"
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
          sort={true}
          filter={false}
        />
      </div>
    );
  }
}

UserRequestsTable.contextType = RBACContext;

export default UserRequestsTable;
