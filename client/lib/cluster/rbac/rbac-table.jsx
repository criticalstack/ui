"use strict";

import React from "react";
import Button from "@material-ui/core/Button";
import TableBuilder from "../../../shared/table";
import NoResult from "../../../shared/no-result";
import LabelEditor from "../../../shared/label-editor";
import LabelMaker from "../../../shared/label-maker";
import _ from "lodash";
import moment from "moment";
import h from "../../helpers";
import RBACSubtable from "./rbac-subtable";
import RBACFormDialog from "./rbac-form-dialog";
import { withRouter } from "react-router";
import { RBACContext } from "../../../shared/context/rbac";

class RBACTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      isFormOpen: false,
    };

    this.closeFormDialog = this.closeFormDialog.bind(this);
  }

  componentDidMount() {
    // if this exists we were redirected from the access page
    let state = _.get(this.props.history.location, "state");
    if (typeof state !== "undefined") {
      this.handleAdd();
    }
  }

  closeFormDialog() {
    this.setState({
      isFormOpen: false
    });
  }

  handleAdd() {
    let { type } = this.props;
    if (type === "Role" || type === "ClusterRole") {
      this.setState({isFormOpen: true}, this.emitAddRole);
    } else {
      this.setState({isFormOpen: true}, this.emitAddBinding);
    }
  }

  emitAddRole() {
    let self = this;

    let { type, namespace } = self.props;

    h.Vent.emit("rbac:form-dialog:open", {
      isEdit: false,
      ...(type === "Role" ? {
        title: `Add a ${type} to ${namespace}`,
        namespace: namespace,
      } : {
        title: `Add a ${type}`
      }),
      icon: "glyphicons glyphicons-plus",
      type: type,
      onAction: function(form, callback) {
        h.fetch({
          method: "post",
          ...(type === "Role" ? {
            endpoint: h.ns("/roles")
          } : {
            endpoint: "/clusterroles",
          }),
          body: JSON.stringify(form),
          success: function(u) {

            let x = u.context.result;
            h.Vent.emit("notification", {
              message: `The ${type} ${x.metadata.name} was successfully added`
            });

            h.Vent.emit("layout:form-dialog:close");

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          },
          error: function(a) {
            h.Vent.emit("request-error:confirm-box", a);

            h.Vent.emit("notification", {
              message: `Failed to add ${type}`
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          }
        });
      }
    });
  }

  emitAddBinding() {
    let self = this;
    let { type, namespace } = self.props;

    h.Vent.emit("rbac:form-dialog:open", {
      open: true,
      isEdit: false,
      ...(type === "RoleBinding" ? {
        title: `Add a ${type} to ${namespace}`,
        namespace: namespace,
      } : {
        title: `Add a ${type}`
      }),
      icon: "glyphicons glyphicons-plus",
      type: type,
      onAction: function(form, callback) {
        h.fetch({
          method: "post",
          ...(type === "RoleBinding" ? {
            endpoint: h.ns("/rolebindings")
          } : {
            endpoint: "/clusterrolebindings"
          }),
          body: JSON.stringify(form),
          success: function(u) {

            let x = u.context.result;
            h.Vent.emit("notification", {
              message: `The ${type} ${x.metadata.name} was successfully added`
            });

            h.Vent.emit("layout:form-dialog:close");

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          },
          error: function(a) {
            h.Vent.emit("request-error:confirm-box", a);

            h.Vent.emit("notification", {
              message: `Failed to add ${type}`
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          }
        });
      }
    });
  }

  emitEdit() {
    let self = this;

    let {
      name,
      formData,
      rules,
      subjects,
      rawRoleRefName,
      rawRoleRefKind
    } = this.state;

    let { type } = self.props;

    h.Vent.emit("rbac:form-dialog:open", {
      isEdit: true,
      title: `Edit ${type} ${name}`,
      icon: "glyphicons glyphicons-pencil",
      // Role
      formData: formData,
      rules: rules,
      // Binding
      roleRefName: {
        value: rawRoleRefName,
        label: rawRoleRefName
      },
      roleRefKind: {
        value: rawRoleRefKind,
        label: rawRoleRefKind
      },
      subjects: subjects,
      onAction: function(form, callback) {
        let url;
        if (type === "Role") {
          url = h.ns(`/roles/${name}`);
        } else if (type === "ClusterRole") {
          url = `/clusterroles/${name}`;
        } else if (type === "RoleBinding") {
          url = h.ns(`/rolebindings/${name}`);
        } else {
          url = `/clusterrolebindings/${name}`;
        }
        h.fetch({
          method: "post",
          endpoint: url,
          body: JSON.stringify(form),
          success: function() {
            h.Vent.emit("notification", {
              message: `The ${type} ${name} was successfully updated`
            });

            h.Vent.emit("layout:form-dialog:close");

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          },
          error: function(a) {
            h.Vent.emit("request-error:confirm-box", a);

            h.Vent.emit("notification", {
              message: "Error while saving..."
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          }
        });
      }
    });
  }

  controls() {
    let { type } = this.props;

    let ctrlButtons = (
      <div>
        {
          _.get(this.context.access, [`${this.props.route}.rbac.authorization.k8s.io`, "create"], true) && (
            <Button
              disableFocusRipple={true}
              disableRipple={true}
              variant="contained"
              className="dialog-button btn-create"
              onClick={() => this.handleAdd()}
            >
              <i className="glyphicons glyphicons-plus dialog-button-icon btn-create" />
              Create {type}
            </Button>
          )
        }
      </div>
    );

    return (
      <div
        className="settings-options">
        {ctrlButtons}
      </div>
    );
  }

  createRow(d) {
    let self = this;
    let { type } = self.props;

    let {
      name: name
    } = d.metadata;

    let labels = "None";
    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="rbac"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let menuData = {
      menu: [
        {
          "icon": "glyphicons glyphicons-square-edit",
          "name": "Simple Edit",
          "resource": `${self.props.route}.rbac.authorization.k8s.io`,
          "verb": "update",
          "action": () => {
            let formData = {};
            let rules = [];
            let subjects;
            let rawRoleRefName = "";
            let rawRoleRefKind = "";

            if (type === "Role" || type === "ClusterRole") {
              formData = {
                name: d.metadata.name
              };
              let rulesCopy = _.cloneDeep(d.rules);
              rulesCopy.forEach( rule => {
                Object.keys(rule).forEach(function(key) {
                  rule[key] = rule[key].map(item => {
                    let itemLabel = item;
                    if (item === "") {
                      itemLabel = "\" \" (core)";
                    }
                    return {
                      value: item,
                      label: itemLabel
                    };
                  });
                });
                rules.push(rule);
              });
            }

            if (type === "RoleBinding" || type === "ClusterRoleBinding") {
              subjects = d.subjects.map(rawSubj => {
                let hasNs = rawSubj.hasOwnProperty("namespace");
                let subject = {
                  kind: {
                    value: rawSubj.kind,
                    label: rawSubj.kind
                  },
                  name: {
                    value: rawSubj.name,
                    label: rawSubj.name
                  },
                  ...hasNs && {
                    namespace: {
                      value: rawSubj.namespace,
                      label: rawSubj.namespace
                    }
                  }
                };
                return subject;
              });

              formData = {
                name: d.metadata.name,
                autoFillName: false
              };

              rawRoleRefName = d.roleRef.name;
              rawRoleRefKind = d.roleRef.kind;
            }

            this.setState({
              isFormOpen: true,
              name: d.metadata.name,
              formData,
              rules,
              subjects,
              rawRoleRefName,
              rawRoleRefKind
            }, () => this.emitEdit());
          }
        },
        {
          "icon": "csicon csicon-settings-editor",
          "name": "Edit",
          "resource": `${self.props.route}.rbac.authorization.k8s.io`,
          "verb": "update",
          "action": function() {
            h.Vent.emit("edit:mode", d.metadata.uid, "edit");
          }
        },
        {
          "icon": "glyphicons glyphicons-tags",
          "name": "Labels",
          "resource": `${self.props.route}.rbac.authorization.k8s.io`,
          "verb": "update",
          "action": function() {
            h.Vent.emit("layout:confirm:open", {
              open: true,
              title: `Editing labels on ${d.metadata.name}`,
              message: <LabelEditor data={d} />,
              disableButtons: true,
              modal: true
            });
          }
        },
        {
          "icon": "glyphicons glyphicons-bin menu-icon-warn",
          "name": "Delete",
          "resource": `${self.props.route}.rbac.authorization.k8s.io`,
          "verb": "delete",
          "action": () => {
            h.view.helpers.resourceDeleteSingle(this.props.route, type, false, d);
          }
        }
      ]
    };

    let icon;
    if (_.get(d, "roleRef.kind") === "Role") {
      icon = "csicon csicon-namespace";
    } else {
      icon = "glyphicons glyphicons-cluster";
    }

    let row = {
      id: name,
      raw: d,
      search: name,
      filter: [name],
      menu: menuData,
      cells: [
        {
          value: name
        },
        ...(type === "RoleBinding" || type === "ClusterRoleBinding" ?
          [
            {
              value: <div className={`label-pair-tag-${_.get(d, "roleRef.kind")}`}>
                <span
                  className="label-role-icon"
                >
                  <i className={icon} />
                </span>
                <span className="label-role-key">{_.get(d, "roleRef.kind", "-")}:</span>
                <span className="label-role-val">{_.get(d, "roleRef.name", "-")}</span>
              </div>
            }
          ] : []
        ),
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

  renderTableOrNoData(head) {
    let self = this;
    let count = 0;
    let { type } = self.props;
    let body = self.props.data.map((x) => {
      count++;
      return self.createRow(x);
    });

    if (count > 0) {
      return (
        <TableBuilder
          id={`${this.props.route}-table`}
          className="default-table"
          route={this.props.route}
          head={head}
          body={body}
          hasCheckbox={true}
          sort={true}
          filter={false}
          hasOnRowClick={true}
          closeOnOpen={true}
          onRowClickRenderFunction={function(row) {
            let subData;
            let subType;
            if (row.raw.rules) {
              subData = row.raw.rules;
              subType = "Rules";
            } else if (row.raw.subjects) {
              subData = row.raw.subjects;
              subType = "Subjects";
            }
            return (
              <tr key="containers-table-tr-1">
                <td
                  className="sub-table-container"
                  colSpan="100%">
                  <div className="sub-table-arrow-box"></div>
                  {
                    subData && (
                      <RBACSubtable
                        data={subData}
                        type={subType}
                        className="sub-table"
                      />
                    )
                  }
                </td>
              </tr>
            );
          }}
        />
      );
    }

    return (
      <NoResult
        title={`No ${type} found`}
        body={`No ${type}s were found`}
        icon={`glyphicons glyphicons-${type === "Role" || type === "ClusterRole" ? "user-group" : "paired"}`}
        style={{
          paddingTop: "50px",
          paddingBottom: "10px"
        }}
      />
    );
  }

  render() {
    let { type } = this.props;

    let head = {
      main: [
        {
          value: `${type} Name`
        },
        ...(type === "RoleBinding" || type === "ClusterRoleBinding" ?
          [
            {
              value: `${type.split("Binding")[0]} Ref Name`
            }
          ] : []
        ),
        {
          value: "Age",
          style: {
            width: "120px"
          }
        },
        {
          value: "Labels"
        },
      ]
    };

    let tableControls = this.controls();
    let table = this.renderTableOrNoData(head);

    return (
      <div>
        {tableControls}
        {table}
        {
          this.state.isFormOpen && (
            <RBACFormDialog
              namespace={this.props.namespace}
              type={this.props.type}
              isFormOpen={this.state.isFormOpen}
              closeFormDialog={this.closeFormDialog}
            />
          )
        }
      </div>
    );
  }
}

RBACTable.contextType = RBACContext;

export default withRouter(RBACTable);
