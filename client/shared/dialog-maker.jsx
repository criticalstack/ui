"use strict";

import React from "react";
import Dialog from "@material-ui/core/Dialog";
import Button from "@material-ui/core/Button";
import _ from "lodash";
import { withStyles } from "@material-ui/core/styles";
import h from "../lib/helpers";

const styles = {
  sysinfo: {
    maxWidth: "80vw",
    minWidth: "80vw",
    height: "80vh",
    overflowY: "unset",
    marginTop: "-80px"
  },
  small: {
    maxWidth: "60vw",
    maxHeight: "80vh",
    width: "100%",
    overflowY: "unset",
    marginTop: "-80px"
  },
  xsmall: {
    maxWidth: "40em",
    width: "100%",
    overflowY: "unset",
    marginTop: "-80px"
  },
  medium: {
    maxWidth: "1000px",
    width: "90vw",
    maxHeight: "80vh",
    overflowY: "unset",
		marginTop: "-80px",
  },
  large: {
    maxWidth: "70vw",
    width: "100%",
    overflowY: "unset",
    marginTop: "-80px",
    height: "80vh",
    maxHeight: "80vh",
  },
  confirm: {
    width: "100%",
    maxHeight: "80%",
    overflowY: "unset",
    marginTop: "-80px"
  },
  unset: {
    maxWidth: "unset",
    minWidth: "unset",
    width: "unset",
    overflowY: "unset",
    marginTop: "-80px"
  },
  stepSmall: {
    maxWidth: "50em",
    maxHeight: "80vh",
    width: "100%",
    overflowY: "unset",
		marginTop: "-80px",
  },
  stepLarge: {
    maxWidth: "1400px",
    width: "100%",
    height: "80vh",
    overflowY: "unset",
		marginTop: "-80px",
  },
  editor: {
    maxWidth: "55em",
    width: "100%",
    overflowY: "initial",
  },
  editorLarge: {
    maxWidth: "65em",
    width: "100%",
    overflowY: "initial",
  }
};

class DialogMaker extends React.Component {

  constructor(props) {
    super(props);

    this.buttonTypes = {
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
      next: {
        label: "Next",
        icon: "glyphicons glyphicons-arrow-thin-right"
      },
      back: {
        label: "Back",
        icon: "glyphicons glyphicons-arrow-thin-left"
      },
      submit: {
        label: "Submit",
        icon: "glyphicons glyphicons-check"
      },
      save: {
        label: "Save",
        icon: "glyphicons glyphicons-check"
      },
      install: {
        label: "Install",
        icon: "glyphicons glyphicons-cloud-upload"
      }
    };
  }

  handleScroll() {
    h.Vent.emit("dialog-body:scroll");
  }

  makeButtons() {
    var self = this;

    let html = self.props.buttons.map((button, i) =>
      <Button
        key={i}
        disableFocusRipple={true}
        disableRipple={true}
        variant="contained"
        className={`dialog-button btn-${button.type}`}
        onClick={button.action}
        disabled={button.hasOwnProperty("disabled") ? button.disabled : false}>
        <i
          className={`${self.buttonTypes[button.type].icon} dialog-button-icon btn-${button.type}`}
        />
        {self.buttonTypes[button.type].label}
      </Button>
    );

    return html;
  }

  render() {
    let dialogClass = _.get(this.props, "dialogClass", "") === "" ? "small" : this.props.dialogClass;
    let bodyClass = _.get(this.props, "bodyClass", "") === "" ? "dialog-body-small" : this.props.bodyClass;
    let actionClass = _.get(this.props, "actionClass", "") === "" ? "dialog-actions" : this.props.actionClass;
    let dialogId = _.get(this.props, "id", "") === "" ? "no-id" : this.props.id;
    let disableEscape = _.get(this.props, "disableEscapeKeyDown", false);
    let disableBackdropClick = _.get(this.props, "disableBackdropClick", false);

    return (
      <Dialog
        id={dialogId}
        classes={{
          paper: this.props.classes[dialogClass]
        }}
        open={this.props.open}
        onClose={this.props.onRequestClose}
        disableEscapeKeyDown={disableEscape}
        disableBackdropClick={disableBackdropClick}
      >

        <div className="dialog-title">
          {this.props.title}
        </div>

        <div
          onScroll={this.handleScroll}
          className={bodyClass}
        >
          {this.props.body}
        </div>

        {
          this.props.buttons.length > 0 ?
            <div className={actionClass}>
              {this.makeButtons()}
            </div> : null
        }
      </Dialog>
    );
  }
}

export default withStyles(styles)(DialogMaker);
