"use strict";

import React from "react";
import DialogMaker from "../../shared/dialog-maker";
import _ from "lodash";
import h from "../helpers";

class ConfirmBox extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      open: false
    };

    this.handleClose = this.handleClose.bind(this);
  }

  initState() {
    this.setState({
      open: false,
      body: "",
      title: "",
      onAction: function() {},
      dialogClass: "",
      bodyClass: "",
      actionClass: ""
    });
  }

  bindEvents() {
    var self = this;

    h.Vent.addListener("confirm-box:random", function(data) {

      self.initState();

      var dialogTitle = (
        <span>
          <i className={`${data.icon} form-dialog-title-icon`} />
          {data.title}
        </span>
      );

      var dialogClass = data.hasOwnProperty("dialogClass")
        ? data.dialogClass
        : false;

      self.setState({
        open: true,
        title: dialogTitle,
        dialogClass: dialogClass,
        bodyClass: "dialog-body-info",
        body: (
          <div>
            <pre className="dialog-info">
              {data.body}
            </pre>
          </div>
        ),
        buttons: [
          {
            type: "close",
            action: self.handleClose
          }
        ]
      });
    });

    h.Vent.addListener("request-error:confirm-box", function(resp) {

      self.initState();

      h.log.debug("request-error:confirm-box", resp);

      var params = resp.responseJSON;

      let message = "Unknown Error";
      if (params && params.hasOwnProperty("context") && params.context.error) {
        message = params.context.error;
      }

      if (!params) {
        switch (resp.status) {
          case 403:
            message = "You have insufficient privileges to perform this operation.";
            break;
          default:
            break;
        }
      } else if (params.context && params.context.hasOwnProperty("error")) {
        message = params.context.error;
      }

      self.setState({
        open: true,
        title: `Error (${resp.statusText})`,
        body: (
          <div>
            <div className="request-error-body">
              {message}
            </div>
          </div>
        ),
        buttons: [
          {
            type: "close",
            action: self.handleClose
          }
        ]
      });
    });

    h.Vent.addListener("layout:confirm:open", function(params) {
      self.initState();
      let closeLabel = !params.closeLabel ? "close" : "ok";
      let primaryAction = params.hasOwnProperty("primaryAction")
        ? params.primaryAction
        : "delete";

      let buttons = [];

      if (!params.disableButtons) {

        if (params.onAction && _.isFunction(params.onAction)) {
          buttons.push(
            {
              type: primaryAction,
              action: params.onAction
            }
          );
        }

        buttons.push(
          {
            type: closeLabel,
            action: self.handleClose
          }
        );
      }

      self.setState({
        open: true,
        title: params.title,
        body: params.message,
        dialogClass: params.dialogClass || "confirm",
        bodyClass: "dialog-body-confirm",
        actionClass: "dialog-actions-nobg",
        buttons: buttons
      });
    });

    h.Vent.addListener("layout:confirm:close", function() {
      self.setState({
        open: false
      });
    });
  }

  componentDidMount() {
    this.bindEvents();
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("layout:confirm:open");
    h.Vent.removeAllListeners("layout:confirm:close");
    h.Vent.removeAllListeners("request-error:confirm-box");
    h.Vent.removeAllListeners("confirm-box:random");
  }

  handleClose() {
    this.initState();
  }

  render() {
    if (this.state.open === false) {
      return null;
    }

    return (
      <DialogMaker
        open={this.state.open}
        onRequestClose={this.handleClose}
        title={this.state.title}
        body={this.state.body}
        buttons={this.state.buttons}
        dialogClass={this.state.dialogClass}
        bodyClass={this.state.bodyClass}
        actionClass={this.state.actionClass}
      />
    );
  }
}

export default ConfirmBox;
