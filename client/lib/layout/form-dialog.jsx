"use strict";

import React from "react";
import DialogMaker from "../../shared/dialog-maker";
import resourceMetadata from "../../shared/manifests/resource-metadata";
import Form from "@rjsf/core";
import h from "../helpers";
import _ from "lodash";

const buttonTypes = {
  exit: {
    label: "Exit",
    icon: "glyphicons glyphicons-menu-close"
  },
  create: {
    label: "Save",
    icon: "glyphicons glyphicons-check"
  },
  reset: {
    label: "Reset",
    icon: "glyphicons glyphicons-repeat"
  },
  format: {
    label: "Format",
    icon: "glyphicons glyphicons-magic-wand"
  },
  clear: {
    label: "Clear",
    icon: "glyphicons glyphicons-delete"
  },
  delete: {
    label: "Delete",
    icon: "glyphicons glyphicons-bin"
  },
  close: {
    label: "Close",
    icon: "glyphicons glyphicons-menu-close"
  },
  ok: {
    label: "OK",
    icon: "glyphicons glyphicons-check"
  }
};

class FormDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      exData: false,
      formData: {},
      schema: {},
      uiSchema: {},
      widgets: {},
      errorSchema: {},
      validate: function(data, e) {
        if (e.__errors.length > 0) {
          return false;
        }
        return true;
      },
      fields: {},
      open: false,
      title: "",
      onAction: function() {},
      params: {},
      loading: true,
      disableButton: false,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.schema !== this.state.schema) {
      return true;
    }

    if (this.state.loading !== nextState.loading) {
      if (!nextState.loading && nextState.exData !== false) {
        this.updateConfig(nextState.exData, nextState.params);
        return true;
      }
    }

    if (this.state.open !== nextState.open) {
      return true;
    }

    if (this.state.disableButton !== nextState.disableButton) {
      return true;
    }

    return false;
  }

  fetchDeps(params) {
    let self = this;
    let exData = {};
    let sources = params.exData;
    let len = sources.length;
    let i = 0;

    sources.map(function(md) {
      let endpoint = md.hasOwnProperty("endpoint") ? md.endpoint : md;
      endpoint = `/${endpoint}`;
      if (md.hasOwnProperty("namespaced") && md.namespaced === false) {
        endpoint = h.ns(endpoint);
      }
      let key = md.hasOwnProperty("key") ? md.key : md;
      h.fetch({
        endpoint: endpoint,
        success: function(d) {
          i++;
          let exd = d.context.result || [];
          _.set(exData, key, exd);
          if (i === len) {
            self.setState({
              exData: exData,
              loading: false,
              params: params
            });

            return false;
          }

          self.setState({
            exData: exData,
          });
        }
      });
    });
  }

  updateConfig(data, params) {
    let schema = data
      ? params.exDataAction(data, params.schema)
      : params.schema;

    this.setState({
      exData: false,
      loading: false,
      style: {},
      open: true,
      schema: schema,
      params: params,
      formData: params.formData || this.state.formData,
      uiSchema: params.uiSchema || {},
      widgets: params.widgets || {},
      validate: params.validate || this.state.validate,
      icon: params.icon || "",
      title: params.title || "",
      dialogClass: params.dialogClass || "",
      bodyClass: params.bodyClass || "",
      fields: params.fields || {},
      onAction: params.onAction || function(form, callback) {
        if (callback && typeof callback === "function") {
          return callback();
        }
      },
      onChangeAction: params.onChangeAction || false,
      register: params.register || false,
      disableButton: false
    });
  }

  bindEvents() {
    let self = this;
    h.Vent.addListener("layout:form-dialog:open", function(params) {
      if (params.hasOwnProperty("exData")) {
        self.fetchDeps(params);
      } else {
        self.updateConfig(false, params);
      }
    });

    h.Vent.addListener("layout:form-dialog:schema-update", function(schema, formData) {
      self.setState({
        schema,
        formData
      });
    });
  }

  componentDidMount() {
    this.bindEvents();
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("layout:form-dialog:open");
    h.Vent.removeAllListeners("layout:form-dialog:schema-update");
  }

  handleClose(e) {
    if (typeof e !== "undefined") {
      e.preventDefault();
    }

    this.setState({
      open: false,
      exData: false,
      params: {},
      schema: {},
      formData: {},
      loading: true
    });

    if (this.state.register) {
      h.Vent.emit("register:close");
    }
  }

  handleSubmit(data) {
    var self = this;

    self.setState({
      formData: data.formData,
      disableButton: true
    });

    if (self.state.onAction && typeof self.state.onAction === "function") {
      self.state.onAction(self.state.formData, function() {
        self.handleClose();
      });
    }

    if (this.state.register) {
      h.Vent.emit("register:close");
    }
  }

  handleOnChange(data, onChangeAction) {
    this.setState({
      formData: data.formData
    });

    if (onChangeAction && typeof onChangeAction === "function") {
      return onChangeAction(data);
    }
  }

  makeButtons(buttons) {
    let html = [];

    let defaultAction = (
      <button
        key={-1}
        className="btn-default-action"
        type="submit"
      />
    );

    html.push(defaultAction);

    for (let b = 0; b < buttons.length; b++) {
      let button = buttons[b];

      let temp = button.action === "submit"
        ? <button
          key={b}
          id={button.type}
          type="submit"
          className={`dialog-button btn-${button.type}`}
          disabled={button.hasOwnProperty("disabled") ? button.disabled : false}>
          <i
            className={`${buttonTypes[button.type].icon} dialog-button-icon btn-${button.type}`}
          />
          {buttonTypes[button.type].label}
        </button>
        : <button
          key={b}
          id={button.type}
          onClick={button.action}
          className={`dialog-button btn-${button.type}`}
          disabled={button.hasOwnProperty("disabled") ? button.disabled : false}>
          <i
            className={`${buttonTypes[button.type].icon} dialog-button-icon btn-${button.type}`}
          />
          {buttonTypes[button.type].label}
        </button>;

      html.push(temp);
    }

    return html;
  }

  render() {
    let self = this;

    if (self.state.open === false) {
      return null;
    }

    let schema = self.state.schema;

    let titleLabel = self.state.title.length > 0 ? self.state.title : schema.title;
    let titleIcon = self.state.icon.length > 0 ? self.state.icon : schema.titleIcon;

    let resourceType = self.state.params.help;
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

    let title = (
      <span>
        <i className={`${titleIcon} form-dialog-title-icon`} />
        {titleLabel}{docLink}
      </span>
    );

    let buttons = [
      {
        type: "exit",
        action: (e) => self.handleClose(e)
      },
      {
        type: self.state.dialogClass === "confirm" ? "ok" : "create",
        action: "submit",
        disabled: self.state.disableButton
      }
    ];

    let body = (
      <Form
        schema={schema}
        uiSchema={self.state.uiSchema}
        widgets={self.state.widgets}
        validate={self.state.validate}
        formData={self.state.formData}
        onChange={(data) => self.handleOnChange(data, self.state.onChangeAction)}
        onSubmit={(data) => self.handleSubmit(data)}
        fields={self.state.fields}
        showErrorList={false}
      >
        <div className="dialog-actions">
          {this.makeButtons(buttons)}
        </div>
      </Form>
    );

    return (
      <DialogMaker
        open={self.state.open}
        onRequestClose={(e) => self.handleClose(e)}
        title={title}
        body={body}
        buttons={[]}
        dialogClass={self.state.dialogClass}
        bodyClass={self.state.bodyClass}
      />
    );
  }
}

export default FormDialog;
