"use strict";

import React from "react";
import TagsInput from "react-tagsinput";
import Button from "@material-ui/core/Button";
import h from "../lib/helpers";
import _ from "lodash";

class LabelEditor extends React.Component {
  constructor(props) {
    super(props);

    let self = this;

    self.csValidators = {
      "labels": /^[^\W_]((([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}?\/{1}[a-zA-Z0-9-_\.]{1,63}[^\W_])|([a-zA-Z0-9\-_\.]{1,63}[^\W]))($|=[^\W_]?[a-zA-Z0-9\-_\.]{0,63}[^\W])$/,
      "env-var": /^(([^=|\s]*)([\w|\=]*)([^=|\s]*))/
    };

    let format = props.hasOwnProperty("format") ? props.format : "label";

    let labels = [];
    let labelPath = props.hasOwnProperty("path") ?
      _.get(props.data, props.path, false)
      :
      _.get(props.data, "metadata.labels", false);

    if (labelPath) {
      if (format === "env-var") {
        labels = labelPath.map(function(entry) {
          let key = entry.name;
          let value = entry.value;
          let pair = `${key}=${value}`;
          return pair;
        });
      } else {
        labels = Object.keys(labelPath).map(function(k) {
          let value = labelPath[k];
          let pair = value.length > 0 ? `${k}=${value}` : k;
          return pair;
        });
      }
    }

    self.state = {
      resource: props.resource || "",
      data: props.data,
      labels: labels,
      label: "",
      format: format
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleChangeInput = this.handleChangeInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    let key = "labels-input";
    document.querySelector(`[data-key=${key}]`).focus();
  }

  handleChange(labels) {
    this.setState({
      label: "",
      labels
    });
  }

  handleChangeInput(e) {
    this.setState({
      label: e.target.value
    });
  }

  handleSubmit() {
    let self = this;

    // if an entry exists but has not been
    // pushed onto the stack do so now

    if (self.state.label.length > 0) {
      let current = self.state.labels;

      current.push(self.state.label);

      self.setState({
        labels: current
      });
    }

    let labels = self.state.format === "env-var" ? [] : {};

    for (let i = 0; i < self.state.labels.length; ++i) {
      let keyvalue = self.state.labels[i].split("=");
      let key = keyvalue[0];
      let value = typeof keyvalue[1] !== "undefined" ? keyvalue[1] : "";

      if (self.state.format === "env-var") {
        // Environment variables expect this format
        labels.push({
          "name": key,
          "value": value
        });
      } else {
        // Labels are just an object of key:values
        labels[key] = value;
      }
    }

    // Called from a create button. Return labels and return.
    if (self.props.reportBack) {
      h.Vent.emit("manifest-dialog-simple:labels", {
        labels: labels,
        path: self.props.path,
        format: self.props.format
      });

      h.Vent.emit("layout:confirm:close");

      return false;
    }

    let format = [
      {
        "op": "replace",
        "path": "/metadata/labels",
        "value": labels
      }
    ];

    // TODO: fix for selfLink bug in kube.
    // for some reason they remove the slash between the resource and the
    // resource name
    let route, name;

    if (self.state.resource.length > 0) {
      route = self.state.resource;
      name = self.state.data.metadata.name;
    } else {
      let url = self.state.data.metadata.selfLink.split("/");
      route = url[url.length - 2];
      name = url[url.length - 1];
    }

    self.state.data.metadata.labels = labels;

    h.Vent.emit("notification", {
      message: `Saving labels for ${self.state.data.metadata.name}`
    });

    h.Vent.emit("layout:confirm:close");

    let url = h.nsCheck(route)
      ? h.ns(`/${route}/${name}`, self.props.location)
      : `/${route}/${name}`;

    h.fetch({
      method: "patch",
      endpoint: url,
      body: JSON.stringify(format),
      success: function() {
        h.Vent.emit("notification", {
          message: "Save Complete"
        });
      },
      error: function(a) {
        h.Vent.emit("request-error:confirm-box", a);

        h.Vent.emit("notification", {
          message: "Error while saving..."
        });
      }
    });
  }

  render() {
    let self = this;

    let tags = _.size(self.state.labels) <= 0 ? [] : self.state.labels;

    let buttons = (
      [
        <Button
          key={1}
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className="dialog-button btn-close"
          onClick={function() {
            h.Vent.emit("layout:confirm:close");
          }}>
          <i
            className="glyphicons glyphicons-menu-close dialog-button-icon btn-close"
          />
          Cancel
        </Button>,
        <Button
          key={2}
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className="dialog-button btn-save"
          onClick={self.handleSubmit}>
          <i
            className="glyphicons glyphicons-check dialog-button-icon btn-save"
          />
          Save
        </Button>
      ]
    );

    function includeMP(tag) {
      return tag.includes("marketplace.criticalstack.com");
    }

    function renderTag(props) {
      let {tag, key, disabled, onRemove, classNameRemove, getTagDisplayValue, ...other} = props;
      let isDisabled = includeMP(tag) ? true : disabled;
      return (
        <span key={key} {...other}>
          {getTagDisplayValue(tag)}
          {!isDisabled &&
              <a className={classNameRemove} onClick={() => onRemove(key)} />
          }
        </span>
      );
    }

    return (
      <div>
        <TagsInput
          value={tags}
          onChange={self.handleChange}
          onlyUnique={true}
          validationRegex={self.csValidators[self.state.format]}
          tagProps={{
            className: `react-tagsinput-${self.state.format}`
          }}
          renderTag={renderTag}
          removeKeys={tags.some(includeMP) ? [] : [8]}
          inputProps={{
            placeholder: "Add item",
            "data-key": "labels-input",
            "onChange": self.handleChangeInput
          }}
        />
        <div style={{
          float: "right",
          paddingTop: "20px",
          marginBottom: "-14px"
        }}>
        {buttons}
      </div>
    </div>
    );
  }
}

export default LabelEditor;
