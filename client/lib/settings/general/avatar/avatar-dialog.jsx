"use strict";

import React from "react";
import AvatarEditor from "react-avatar-editor";
import DialogMaker from "../../../../shared/dialog-maker";
import h from "../../../helpers";
import Session from "../../../helpers/session";
import _ from "lodash";

class AvatarDialog extends React.Component {

  constructor(props) {
    super(props);

    var user = Session.user;

    var currentAvatar = false;

    if (user.hasOwnProperty("customAvatar") && user.customAvatar !== "0") {
      currentAvatar = user.customAvatar;
    }

    this.state = {
      user: user,
      open: true,
      scale: "1",
      preview: null,
      current: currentAvatar,
      fileUpload: false,
      ready: false
    };

    this.handleClose = this.handleClose.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleReady = this.handleReady.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleScale = this.handleScale.bind(this);
    this.handleUpdate = this.handleUpdate.bind(this);
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("load");
  }

  handleClose() {
    this.setState({
      open: false
    });

    h.Vent.emit("edit-profile:avatar", {
      state: false
    });
  }

  handleDrop() {
    if (this.state.ready) {
      return;
    }

    this.setState({
      ready: true,
      fileUpload: false
    });
  }

  handleReady() {
    if (!this.state.ready) {
      return;
    }

    this.handleUpdate();
  }

  handleReset() {
    this.setState({
      fileUpload: false,
      ready: false,
      scale: 1,
      preview: null
    });
  }

  handleRemove() {
    var self = this;

    h.fetch({
      method: "post",
      endpoint: "/users/avatar",
      body: JSON.stringify({
        avatar: "0"
      }),
      success: function(u) {
        h.Vent.emit("notification", {
          message: `User ${u.context.result.username} successfully updated.`
        });

        Session.updateUser(function() {
          _.each(CSOS.VentCache.avatar, function(a) {
            h.Vent.emit(a, u.context.result);
          });
        });

        self.setState({
          current: false
        });

        self.handleClose();

      },
      error: function(a) {
        h.Vent.emit("request-error:confirm-box", a);

        h.Vent.emit("notification", {
          message: "Error while updating..."
        });
      }
    });
  }

  handleSave() {
    var self = this;

    if (!self.state.ready) {
      return;
    }

    var img = self.avatar.getImageScaledToCanvas().toDataURL();

    h.fetch({
      method: "post",
      endpoint: "/users/avatar",
      body: JSON.stringify({
        avatar: img
      }),
      success: function(u) {
        h.Vent.emit("notification", {
          message: `User ${u.context.result.username} successfully updated.`
        });

        self.setState({
          current: img
        });

        Session.updateUser(function() {
          _.each(CSOS.VentCache.avatar, function(a) {
            h.Vent.emit(a, u.context.result);
          });

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

  handleScale(e) {
    if (!this.state.ready) {
      return;
    }

    this.setState({
      scale: e.target.value
    });

    this.handleUpdate();
  }

  handleUpdate() {
    if (!this.state.ready) {
      return;
    }

    var img = this.avatar.getImageScaledToCanvas().toDataURL();

    this.setState({
      preview: img
    });
  }

  openFileDialog() {
    if (this.state.ready) {
      return;
    }

    this.avatarInput.click();
  }

  openFileDialogChange(e) {
    var self = this;

    if (self.state.ready) {
      return;
    }

    var reader = new FileReader();
    var file = e.target.files[0];

    reader.addEventListener("load", function() {
      self.setState({
        fileUpload: reader.result,
        ready: true
      });
    }, false);

    if (file) {
      reader.readAsDataURL(file);
    }
  }

  render() {
    var self = this;
    var ready = false;

    var display = (
      <div className="avatar-dialog-no-image">no preview available</div>
    );

    if (self.state.ready && self.state.preview !== null) {
      ready = true;
    }

    if (self.state.current && !ready) {
      display = (
        <div className="avatar-dialog-current-image">
          <img src={self.state.current} />
          <i
            onClick={self.handleRemove}
            className="glyphicons glyphicons-bin"
          />
        </div>
      );
    }

    if (ready) {
      display = <img src={self.state.preview} />;
    }

    let title = (
      <span>
        <i className="glyphicons glyphicons-camera dialog-title-icon" />
        Change Avatar
      </span>
    );

    let body = (
      <div className="avatar-dialog">
        <div className="frame" onClick={self.openFileDialog.bind(self)}>
          <input
            ref={(input) => {
              this.avatarInput = input;
            }}
            id="avatar-file-upload"
            onChange={self.openFileDialogChange.bind(self)}
            type="file"
            className="avatar-file-upload"
          />

          <AvatarEditor
            ref={node => {
              this.avatar = node;
            }}
            scale={parseFloat(self.state.scale)}
            borderRadius={5}
            onDropFile={self.handleDrop}
            onSave={self.handleSave}
            onMouseUp={self.handleUpdate}
            onMouseMove={self.handleUpdate}
            onImageReady={self.handleReady}
            image={self.state.fileUpload ? self.state.fileUpload : "/assets/images/user.png"}
          />

          <div className="slider">
            <label htmlFor="zoom">Zoom:</label>
            <input
              id="zoom"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={self.state.scale.toString()}
              onChange={self.handleScale}
            />
          </div>
        </div>

        <div className="frame">
          {display}
        </div>
      </div>
    );

    let buttons = [
      {
        type: "exit",
        action: self.handleClose
      },
      {
        type: "create",
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
        dialogClass="unset"
        bodyClass="dialog-body-small"
      />
    );
  }
}

export default AvatarDialog;
