"use strict";

import React from "react";
import DialogMaker from "../../../shared/dialog-maker";
import h from "../../helpers";
import Form from "@rjsf/core";
import CreatableSelect from "react-select/creatable";
import RuleForm from "./rule-form";
import SubjectForm from "./subject-form";
import { formSchema as formSchemaRole,
  uiSchema as uiSchemaRole } from "./schemas/role";
import Session from "../../helpers/session";
import _ from "lodash";
import resourceMetadata from "../../../shared/manifests/resource-metadata";
import { withRouter } from "react-router";

import {
  formSchema as formSchemaBinding,
  uiSchema as uiSchemaBinding
} from "./schemas/binding";

class RBACFormDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      callbackUrl: false,
      dialogClass: "",
      formData: {},
      icon: "",
      invalidName: false,
      isEdit: false,
      isLoading: true,
      namespace: "",
      open: false,
      // Roles
      rawResources: [],
      rules: [{
        resources: [],
        verbs: [],
        apiGroups: []
      }],
      // Bindings
      rawRoles: [],
      rawClusterRoles: [],
      rawUsers: [],
      subjects: [
        {
          kind: {},
          name: {}
        }
      ],
      roleRefError: false,
      roleRefKind: {},
      roleRefName: "",
      schema: {},
      style: {},
      title: "",
      type: "",
      uiSchema: {}
    };

    this.baseState = this.state;
    this.handleResize = this.handleResize.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.removeItem = this.removeItem.bind(this);
  }

  componentDidMount() {
    let self = this;
    this.bindEvents();

    document.addEventListener("keydown", this.handleKeyDown.bind(this));

    // Closes react-select menus when menuPosition is fixed
    h.Vent.addListener("dialog-body:scroll", function() {
      if (self.props.type === "RoleBinding" || self.props.type === "ClusterRoleBinding") {
        self.roleRefName_ref.blur();
      }
    });

    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("rbac:form-dialog:open");
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    h.Vent.removeAllListeners("dialog-body:scroll");
    window.removeEventListener("resize", this.handleResize);
  }

  handleClose(e) {
    if (typeof e !== "undefined") {
      e.preventDefault();
    }

    this.setState(this.baseState);
  }

  handleResize() {
    h.Vent.emit("dialog-body:scroll");
  }

  handleKeyDown(event) {
    // Key code for "enter"
    if (event.keyCode === 13) {
      event.preventDefault();
    }
  }

  bindEvents() {
    let self = this;

    h.Vent.addListener("rbac:form-dialog:open", function(params) {
      let type = params.type;

      self.setState({
        isLoading: true
      });

      if (type === "Role" || type === "ClusterRole") {
        let csConfig = JSON.parse(localStorage.getItem("cs-config")) || {};
        let rawResources = [];
        let result = csConfig.kubernetes.resources;

        result.map(x => {
          let groupVersion = x.apiVersion;
          if (groupVersion === "v1") {
            groupVersion = "";
          } else {
            groupVersion = groupVersion.split("/")[0];
          }

          let resource = {
            value: x.name,
            label: x.name,
            verbs: x.verbs,
            namespaced: x.namespaced,
            groupVersion: groupVersion
          };
          rawResources.push(resource);
        });
        self.setState({
          rawResources: rawResources || [],
          isLoading: false
        });
      } else {
        if (type === "RoleBinding") {
          self.fetchFormData("rawRoles");
        }
        self.fetchFormData("rawClusterRoles");
        self.fetchFormData("rawUsers");
      }

      self.setState({
        open: true,
        namespace: Session.namespace(),
        isEdit: params.isEdit || false,
        type: params.type || "",
        title: params.title || "",
        icon: params.icon || "",
        dialogClass: params.dialogClass || "",
        onAction: params.onAction || function(form, callback) {
          if (callback && typeof callback === "function") {
            return callback();
          }
        },
        // Roles
        formData: params.formData || {},
        rules: params.rules || [{
          resources: [],
          verbs: [],
          apiGroups: []
        }],
        // Bindings
        schema: params.schema || {},
        uiSchema: params.uiSchema || {},
        roleRefKind: params.roleRefKind || {
          value: params.type.replace("Binding", ""),
          label: params.type.replace("Binding", ""),
        },
        roleRefName: params.roleRefName || "",
        subjects: params.subjects || [{
          kind: {},
          name: {}
        }]
      });
    });
  }

  fetchFormData(dataType) {
    let self = this;
    let url = "";

    let urls = {
      roles: h.ns("/roles"),
      clusterRoles: "/clusterroles",
      users: "/rbac/users"
    };

    let resUrl = true;

    if ( dataType === "rawRoles") {
      url = urls.roles;
    } else if ( dataType === "rawClusterRoles") {
      url = urls.clusterRoles;
    } else if ( dataType === "rawUsers") {
      url = urls.users;
      resUrl = false;
    }

    h.fetch({
      endpoint: url,
      resUrl: resUrl,
      success: function(data) {

        if (dataType === "rawRoles" || dataType === "rawClusterRoles") {
          let state = _.get(self.props.history.location, "state");
          let subjects = self.state.subjects;
          let callbackUrl = false;

          if (typeof state !== "undefined") {
            callbackUrl = "/cluster/rbac/access/all";
            if (Array.isArray(state)) {
              subjects = [];
              subjects = state.map((subject) => {
                return {
                  kind: {
                    value: subject.Kind,
                    label: subject.Kind
                  },
                  name: {
                    value: subject.Name,
                    label: subject.Name
                  }
                };
              });
            } else {
              subjects = [
                {
                  kind: {
                    value: state.Kind,
                    label: state.Kind
                  },
                  name: {
                    value: state.Name,
                    label: state.Name
                  }
                }
              ];
            }
          }

          let rawRoles = data.context.result;
          self.setState({
            [dataType]: rawRoles || [],
            subjects: subjects,
            callbackUrl: callbackUrl
          });
        }

        if (dataType === "rawUsers") {
          let rawUsers = data.context.result;

          self.setState({
            [dataType]: rawUsers || []
          });
        }

        self.setState({
          isLoading: false
        });
      }
    });
  }

  addItem(type) {
    let items = this.state[type];
    if (type === "rules") {
      items.push({
        resources: [],
        verbs: [],
        apiGroups: []
      });
    } else if ( type === "subjects") {
      items.push({
        kind: "",
        name: ""
      });
    }
    this.setState({
      [type]: items
    });
  }

  removeItem(type, i) {
    let items = _.cloneDeep(this.state[type]);
    items.splice(i, 1);
    this.setState({
      [type]: items
    });
  }

  handleSelect(type, subtype, selected, i) {
    if (type === "roleRef") {
      if (subtype === "name") {
        if (this.state.formData.autoFillName === true) {
          const newFormData = _.cloneDeep(this.state.formData);
          let roleName = selected.value;
          let subjectName = this.state.subjects[0].name.value || "";
          newFormData.name = `${roleName.replace(/[^0-9a-z]/gi, "-")}-${subjectName.replace(/[^0-9a-z]/gi, "-")}`;
          this.setState({ formData: newFormData });
        }
        this.setState({
          roleRefName: selected
        });
      } else {
        this.setState({
          roleRefKind: selected
        });
      }
    } else {
      if (
        this.state.formData.autoFillName === true &&
        i === 0 &&
        subtype === "name"
      ) {
        const newFormData = _.cloneDeep(this.state.formData);
        let roleName = this.state.roleRefName.value || "";
        let subjectName = selected.value;
        newFormData.name = `${roleName.replace(/[^0-9a-z]/gi, "-")}-${subjectName.replace(/[^0-9a-z]/gi, "-")}`;
        this.setState({ formData: newFormData });
      }
      let items = this.state[type];
      items[i][subtype] = selected;
      this.setState({
        [type]: items
      });
    }
  }

  handleOnChange({ formData }) {
    if (formData.autoFillName === true) {
      const newFormData = _.cloneDeep(formData);
      let roleName = _.get(this.state, "roleRefName.value", "");
      let subjectName = _.get(this.state, "subjects[0].name.value", "");
      newFormData.name = `${roleName.replace(/[^0-9a-z]/gi, "-")}-${subjectName.replace(/[^0-9a-z]/gi, "-")}`;
      this.setState({ formData: newFormData });
    } else {
      this.setState({ formData });
    }
  }

  // For programmatic form validation/submission
  // Temporarily removed due to https://github.com/rjsf-team/react-jsonschema-form/issues/2104
  // and replaced with custom validation
  // initiateSubmit() {
    // let self = this;
    // self.refs.form.submit();
  // }

  submitForm() {
    let self = this;

    let { type } = self.state;

    let form;

    let invalidForm = false;

    let formData = self.state.formData;

    let invalidName = _.isEmpty(formData) || typeof formData.name === "undefined";
    self.setState({
      invalidName
    });

    if ( type === "Role" || type === "ClusterRole") {
      let rules = _.cloneDeep(this.state.rules);

      rules.map((x, i) => {
        let errors = [];
        Object.keys(x).forEach(function(key) {
          if (x[key] === null || x[key].length === 0) {
            errors.push(key);
            invalidForm = true;
          } else {
            x[key] = x[key].map(y => y.value);
          }
        });

        if (invalidForm) {
          let rulesErrors = this.state.rules;
          rulesErrors[i].errors = errors;
          self.setState({
            rules: rulesErrors
          });
        }
        return x;
      });

      form = {
        kind: type,
        apiVersion: "rbac.authorization.k8s.io",
        metadata: {
          name: formData.name,
          ... (type === "Role" && {
            namespace: this.state.namespace
          })
        },
        rules: rules
      };
    }

    if ( type === "RoleBinding" || type === "ClusterRoleBinding") {
      let roleRef = {
        name: this.state.roleRefName.value,
        kind: this.state.roleRefKind.value
      };

      if (this.state.roleRefName === "") {
        self.setState({
          roleRefError: true
        });
        invalidForm = true;
      } else {
        self.setState({
          roleRefError: false
        });
      }

      let subjects = _.cloneDeep(this.state.subjects);

      subjects.map((x, i) => {
        let errors = [];
        Object.keys(x).forEach(function(key) {
          if (Object.entries(x[key]).length === 0 || x[key].value === "") {
            errors.push(key);
            invalidForm = true;
          } else {
            x[key] = x[key].value;
          }
        });

        if (invalidForm) {
          let subjErrors = this.state.subjects;
          subjErrors[i].errors = errors;
          self.setState({
            subjects: subjErrors
          });
        }

        return x;
      });

      // for subjects which are users, check if they have a user obj
      // and set an owner ref
      let ownerReferences = [];
      subjects.forEach((sub) => {
        if (sub.kind === "User") {
          this.state.rawUsers.forEach((u) => {
            if (sub.name === u.Name && u.User) {
              ownerReferences.push({
                apiVersion: u.User.apiVersion,
                kind: u.User.kind,
                name: u.User.metadata.name,
                uid: u.User.metadata.uid
              });
            }
          });
        }
      });

      form = {
        kind: type,
        apiVersion: "rbac.authorization.k8s.io",
        metadata: {
          name: formData.name,
          ... (type === "RoleBinding" && {
            namespace: this.state.namespace
          }),
          ownerReferences: ownerReferences
        },
        roleRef: roleRef,
        subjects: subjects
      };
    }

    if (invalidForm || invalidName) {
      return;
    } else if (self.state.onAction && typeof self.state.onAction === "function") {
      self.state.onAction(form, function() {
        self.handleClose();
      });
    }

    if (this.state.callbackUrl) {
      h.Vent.emit("link", this.state.callbackUrl);
    }
  }

  render() {
    let {
      isEdit,
      rawResources,
      rawRoles,
      rawClusterRoles,
      rawUsers,
      isLoading,
      type,
      icon,
      title,
      rules,
      subjects,
      roleRefKind,
      roleRefName,
      roleRefError,
      namespace,
      invalidName,
      type: resourceType
    } = this.state;

    let docLink = <a
        className="form-dialog-title-doclink"
        href={_.get(resourceMetadata, `${resourceType}.doc`, false)}
        target="_new"
        data-balloon="View Documentation"
        data-balloon-pos="up"
      >
        <span>Help</span>
        <i className="glyphicons glyphicons-circle-question form-dialog-title-doclink" />
      </a>;

    let dialogTitle = (
      <span>
        <i className={`${icon} form-dialog-title-icon`} />
        {title}{docLink}
      </span>
    );

    let body;

    if (type === "Role" || type === "ClusterRole") {
      formSchemaRole.properties.name.readOnly = isEdit;
      body = <div
        onScroll={e => e.stopPropagation()}
      >
        <Form
          formData={this.state.formData}
          onChange={({formData}) => this.setState({formData})}
          idPrefix={type}
          schema={formSchemaRole}
          uiSchema={uiSchemaRole}
          onSubmit={() => this.submitForm()}
          ref="form"
        >
        </Form>

        {
          invalidName && (
            <div
              className="required-label"
              style={{
                textAlign: "right",
                marginTop: "-10px"
              }}
            >
              required
            </div>)
        }

        <div className="field-group legend">
          Rules
        </div>

        {
          rules.map((rule, i) => <RuleForm
            rule={rule}
            i={i}
            key={i}
            isNamespaced={type === "Role"}
            rawResources={rawResources}
            isLoading={isLoading}
            handleSelect={this.handleSelect}
            removeItem={this.removeItem}
            isSingle={rules.length === 1}
          />)
        }

        <div>
          <button
            type="button"
            className="add-btn-icon"
            onClick={() => this.addItem("rules")}
          >
            <i className="glyphicons glyphicons-plus"></i>
          </button>
        </div>
      </div>;
    }

    if (type === "RoleBinding" || type === "ClusterRoleBinding") {

      let properties = formSchemaBinding.properties;
      properties.name.readOnly = isEdit;
      properties.name.title = `${type} Name`;

      if (isEdit) {
        delete formSchemaBinding.properties.autoFillName;
      } else {
        formSchemaBinding.properties.autoFillName = {
          title: "Autofill",
          type: "boolean",
          default: true
        };
      }

      let roleOptions = [];
      let rawData;

      if (_.get(roleRefKind, "value") === "Role") {
        rawData = rawRoles;
      } else {
        rawData = rawClusterRoles;
      }

      roleOptions = rawData.map(role => {
        return {
          value: role.metadata.name,
          label: role.metadata.name
        };
      });

      body = <div
        onScroll={e => e.stopPropagation()}
      >
        <div className="field-group legend">
          Role Reference
        </div>

        <div
          style={{
            borderBottom: "none",
            paddingTop: "10px",
            marginBottom: "0"
          }}
          className="react-select">
          <div>
            <div className="label-info">
              <label>Kind</label>
            </div>
            {
              type === "RoleBinding" && roleRefKind?.value === "ClusterRole" && (
                <div className="disclaimer">
                  <i className="glyphicons glyphicons-circle-empty-alert" />
                  Permissions granted on non-namespaced resources will be ignored when using a ClusterRole in a RoleBinding.
                </div>
              )
            }
            <CreatableSelect
              isDisabled={type === "ClusterRoleBinding" || isEdit}
              options={[
                {
                  value: "Role",
                  label: "Role"
                },
                {
                  value: "ClusterRole",
                  label: "ClusterRole"
                }
              ]}
              value={roleRefKind}
              onChange={(selected) => this.handleSelect("roleRef", "kind", selected, 0)}
            />
          </div>

          <div>
            <div className="label-info">
              <label>Name*</label>
              <span
                data-balloon={`This must match the name of the ${type.replace("Binding", "")} you wish to bind to`}
                data-balloon-pos="right"
                data-balloon-length="large"
              >
                <i className="glyphicons glyphicons-circle-info"></i>
              </span>
              {
                roleRefError && (<div className="required-label">required</div>)
              }
            </div>
            <CreatableSelect
              ref={ref => {
                this.roleRefName_ref = ref;
              }}
              isDisabled={isEdit}
              isSearchable
              isLoading={isLoading}
              onChange={(selected) => this.handleSelect("roleRef", "name", selected, 0)}
              options={roleOptions}
              value={roleRefName}
              menuPosition="fixed"
              styles={{
                control: styles => ({
                  ...styles,
                  borderColor: roleRefError ? "red !important" : styles.borderColor,
                })
              }}
            />
          </div>
        </div>

        <div className="field-group legend">
          Subjects
        </div>

        {
          subjects.map((subject, i) => <SubjectForm
            subject={subject}
            name
            i={i}
            key={i}
            isLoading={isLoading}
            handleSelect={this.handleSelect}
            removeItem={this.removeItem}
            isSingle={subjects.length === 1}
            rawUsers={rawUsers}
            namespace={namespace}
            type={type}
          />)
        }

        <div>
          <button
            type="button"
            className="add-btn-icon"
            onClick={() => this.addItem("subjects")}
          >
            <i className="glyphicons glyphicons-plus"></i>
          </button>
        </div>

        <div style={{marginTop: "40px"}}>
          <Form
            formData={this.state.formData}
            onChange={args => this.handleOnChange(args)}
            idPrefix={type}
            schema={formSchemaBinding}
            uiSchema={uiSchemaBinding}
            onSubmit={() => this.submitForm()}
            ref="form"
          >
          </Form>

          {
            invalidName && (
              <div
                className="required-label"
                style={{
                  textAlign: "right",
                  marginTop: "-10px"
                }}
              >
                required
              </div>)
          }
        </div>

      </div>;
    }

    let buttons = [
      {
        type: "exit",
        action: () => this.handleClose()
      },
      {
        type: "ok",
        action: () => this.submitForm()
      }
    ];

    return (
      <DialogMaker
        open={this.state.open}
        onRequestClose={this.handleClose}
        title={dialogTitle}
        body={body}
        buttons={buttons}
        disableEscapeKeyDown={true}
        dialogClass="stepSmall"
      />
    );
  }
}

export default withRouter(RBACFormDialog);
