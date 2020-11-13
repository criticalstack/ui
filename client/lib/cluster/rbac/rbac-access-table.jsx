"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import _ from "lodash";

const icons = {
  Role: "csicon csicon-namespace",
  ClusterRole: "glyphicons glyphicons-cluster",
  User: "glyphicons glyphicons-user",
  Group: "glyphicons glyphicons-user-group",
  ServiceAccount: "",
  unknown: "glyphicons glyphicons-circle-empty-question"
};

class RBACAccessTable extends React.Component {
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
          value: "Name",
          style: {
            width: "400px"
          }
        },
        {
          value: "Kind",
          style: {
            width: "150px"
          }
        },
        {
          value: "Role Count",
          style: {
            width: "100px"
          }
        },
        {
          value: "Roles"
        }
      ]
    };

    return head;
  }

  createRoleLabels(roles) {
    let roleLabels = "None";

    roleLabels = roles.map((role, i) => {
      let name = role.name;
      let kind = role.kind;
      let isCRB = role.isClusterRoleBinding;
      let icon = _.get(icons, kind, icons.unknown);
      let namespace = role.hasOwnProperty("namespace") ?
        <>
          <span className="label-role-key">namespace:</span>
          <span className="label-role-val">{role.namespace}</span>
        </> : null;


      return (
        <div key={i} className={`label-pair-tag-${isCRB ? "ClusterRoleBinding" : "RoleBinding"}`}>
          <span
            className="label-role-icon"
            data-tip
            data-balloon={`This ${kind} has a ${isCRB ? "ClusterRoleBinding" : "RoleBinding"}`}
            data-balloon-pos="up"
          >
            <i className={icon} />
          </span>
          <span className="label-role-key">{kind}:</span>
          <span className="label-role-val">{name}</span>
          {namespace}
        </div>
      );
    });

    return (
      <div className="label-roles">
        {roleLabels}
      </div>
    );
  }

  createRow(d) {
    let kind = d.Kind;
    let name = d.Name;
    let icon = _.get(icons, kind, icons.unknown);
    let roles = this.createRoleLabels(d.Roles);
    let count = d.Roles.length;

    let row = {
      id: name,
      raw: d,
      filter: [name],
      cells: [
        {
          raw: kind,
          value: <i className={icon} />,
          style: {
            fontSize: "24px",
            textAlign: "center",
            color: "#666"
          }
        },
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          raw: kind,
          value: d.User !== null ? `${kind} (${d.User.type})` : kind
        },
        {
          value: count
        },
        {
          value: roles
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <div>
        <TableBuilder
          id="rbac-access-table"
          route={this.props.route}
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

export default RBACAccessTable;
