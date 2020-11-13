"use strict";

import React from "react";
import Button from "@material-ui/core/Button";

const buttonTypes = {
  exit: {
    label: "Exit",
    icon: "glyphicons glyphicons-menu-close"
  },
  create: {
    label: "Create",
    icon: "glyphicons glyphicons-check"
  },
  reset: {
    label: "Reset",
    icon: "glyphicons glyphicons-reload"
  },
  format: {
    label: "Format",
    icon: "glyphicons glyphicons-text-resize"
  },
  clear: {
    label: "Clear",
    icon: "glyphicons glyphicons-clean"
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
  },
  save: {
    label: "Save",
    icon: "glyphicons glyphicons-check"
  }
};

class ButtonMaker extends React.Component {
  makeButtons() {

    let html = this.props.buttons.map((button, i) => {
      let label = this.props.hasOwnProperty("label")
        ? this.props.label
        : buttonTypes[button.type].label;

      let icon = this.props.hasOwnProperty("icon")
        ? this.props.icon
        : buttonTypes[button.type].icon;

      let disabled = button.hasOwnProperty("disabled") ? button.disabled : false;

      return (
        <Button
          key={i}
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className={`dialog-button btn-${button.type}`}
          onClick={button.action}
          disabled={disabled}>
          <i
            className={`${icon} dialog-button-icon btn-${button.type}`}
          />
          {label}
        </Button>
      );
    });

    return html;
  }

  render() {
    let parentStyle = this.props.hasOwnProperty("parentStyle") ? this.props.parentStyle : {};
    let parentClass = this.props.hasOwnProperty("parentClass") ? this.props.parentClass : "";

    return (
      this.props.buttons.length > 0 ?
      <div
        className={parentClass}
        style={parentStyle}
      >
        {this.makeButtons()}
      </div> : null
    );
  }
}

export default ButtonMaker;
