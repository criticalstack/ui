"use strict";

import React from "react";
import DialogMaker from "../../../../shared/dialog-maker";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import h from "../../../helpers";
import Session from "../../../helpers/session";

class NamespaceDialog extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      open: true,
      user: props.user,
      namespace: Session.namespace(),
      namespaces: [],
      value: Session.namespace()
    };

    this.handleClose = this.handleClose.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    var self = this;

    h.fetch({
      endpoint: "/namespaces",
      success: function(data) {
        h.log.info("Namespaces:", data);

        self.setState({
          namespaces: data.context.result
        });
      },
      error: function() {
        let ns = {
          metadata: {
            name: Session.namespace()
          }
        };
        self.setState({
          namespaces: [ns]
        });
      }
    });
  }

  handleChange(event) {
    let self = this;
    let value = event.target.value;

    self.setState({
      namespace: value,
      value: value
    });

    Session.changeNamespace(value, location);
  }

  handleClose() {
    this.setState({
      open: false
    });

    h.Vent.emit("user:edit:default-namespace", {
      state: false
    });
  }

  handleSave() {
    var self = this;

    h.fetch({
      method: "post",
      endpoint: "/users/namespace",
      body: JSON.stringify({
        namespace: self.state.namespace
      }),
      success: function() {
        h.Vent.emit("notification", {
          message: `Default namespace change successfully to ${self.state.namespace}.`
        });

        Session.updateUser(function() {
          self.handleClose();
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

    let title = (
      <span>
        <i className="csicon csicon-namespace dialog-title-icon" />
        Change Default Namespace
      </span>
    );

    let body = (
      <FormControl className="dialog-select">
        <InputLabel>Namespace</InputLabel>
        <Select
          value={self.state.value}
          onChange={this.handleChange}
          className="dialog-select-selected"
        >
          {self.state.namespaces.map(function(ns) {
            return (
              <MenuItem
                disableRipple={true}
                key={ns.metadata.name}
                value={ns.metadata.name}
                className="dialog-select-mi"
              >
                {ns.metadata.name}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    );

    let buttons = [
      {
        type: "exit",
        action: self.handleClose
      },
      {
        type: "ok",
        action: self.handleSave
      }
    ];

    return (
      <DialogMaker
        open={self.state.open}
        onRequestClose={self.handleClose}
        title={title}
        body={body}
        buttons={buttons}
        dialogClass="confirm"
        bodyClass="dialog-body-namespace"
      />
    );
  }
}

export default NamespaceDialog;
