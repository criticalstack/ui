"use strict";

import React from "react";
import Snackbar from "@material-ui/core/Snackbar";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import h from "../helpers";

class Notifications extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      message: "",
      newMessage: false,
      duration: 4000,
      open: false,
      className: "notification-default",
      pendingDel: false
    };
  }

  componentDidMount() {
    h.Vent.addListener("notification", (data) => {
      this.setState({
        open: true,
        message: data.message || "N/A",
        duration: data.duration || 4000,
        className: data.className || "notification-default",
        pendingDel: data.pendingDel || false
      });
    });

    h.Vent.addListener("notification-close", () => {
      this.setState({
        open: false
      });
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("notification");
    h.Vent.removeAllListeners("notification-close");
  }

  handleRequestClose() {
    this.setState({
      open: false,
      pendingDel: false
    });
  }

  handleUndoDelete() {
    h.Vent.emit("undo-delete:action");

    this.setState({
      open: false,
      pendingDel: false
    });
  }

  render() {
    var self = this;

    return (
      <Snackbar
        className={self.state.className}
        action={"close"}
        open={self.state.open}
        message={self.state.message}
        autoHideDuration={self.state.duration}
        onClose={() => this.handleRequestClose()}
        key={self.state.message}
        action={ self.state.pendingDel ?
        [
          <Button
            disableRipple={true}
            key="undo"
            aria-label="Undo"
            color="inherit"
            className="btn-undo"
            onClick={() => this.handleUndoDelete()}
          >
            Undo
          </Button>
        ] :
        [
          <IconButton
            disableRipple={true}
            key="close"
            aria-label="Close"
            color="inherit"
            className="dialog-button"
            onClick={() => this.handleRequestClose()}
          >
            <i className="glyphicons glyphicons-menu-close dialog-button-icon exit"></i>
          </IconButton>,
        ]
        }
      />
    );
  }
}

export default Notifications;
