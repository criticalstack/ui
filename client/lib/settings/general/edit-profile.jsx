"use strict";

import React from "react";
import h from "../../helpers";
import Session from "../../helpers/session";
import Avatar from "../../layout/avatar";
import AvatarDialog from "./avatar/avatar-dialog";
import NamespaceDialog from "./namespace/namespace-dialog";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import { formSchema, uiSchema, formValidation } from "./schemas/password-reset";

class UserProfile extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      user: Session.user,
      avatarDialog: false,
      namespaceDialog: false,
      isLocalUser: Session.user.type === "local"
    };
  }

  componentDidMount() {
    var self = this;
    h.Vent.addListener("edit-profile:avatar", function(params) {
      self.setState({
        avatarDialog: params.state
      });
    });

    h.Vent.addListener("user:edit:default-namespace", function(params) {
      self.setState({
        namespaceDialog: params.state
      });
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("edit-profile:avatar");
    h.Vent.removeAllListeners("user:edit:default-namespace");
  }

  openAvatarDialog() {
    this.setState({
      avatarDialog: true
    });
  }

  openNamespaceDialog() {
    this.setState({
      namespaceDialog: true
    });
  }

  changePassword() {
    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchema,
      uiSchema: uiSchema,
      validate: formValidation,
      title: "Change Password",
      icon: "glyphicons glyphicons-lock",
      small: true,
      onAction: function(form, callback) {
        h.fetch({
          method: "post",
          endpoint: "/users/password",
          body: JSON.stringify({
            current: form.current_password,
            password: form.password
          }),
          success: function(u) {
            h.Vent.emit("notification", {
              message: `User ${u.context.result.username} successfully updated.`
            });

            h.Vent.emit("layout:form-dialog:close");

            Session.destroy();

            if (callback && typeof callback === "function") {
              return callback();
            }
          },
          error: function(a) {
            h.Vent.emit("request-error:confirm-box", a);

            h.Vent.emit("notification", {
              message: "Error while saving..."
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
          }
        });
      }
    });
  }

  render() {
    let self = this;

    return (
      <div>
        <Card>
          <CardHeader
            className="settings-cardheader-avatar"
            title={self.state.user.username}
            subheader={self.state.user.email}
            avatar={<Avatar />}
          />
          <CardHeader
            className="settings-cardheader-avatar"
            title="You can change your profile settings here"
            subheader="What setting would you like to change?"
          />
          <CardContent>
            <div className="settings-edit-label" onClick={self.openNamespaceDialog.bind(self)}>
              <i className="csicon csicon-namespace" />
              Change Default Namespace
            </div>
            {
              self.state.isLocalUser && (
                <div className="settings-edit-label" onClick={self.changePassword.bind(self)}>
                  <i className="glyphicons glyphicons-lock" />
                  Password
                </div>
              )
            }
            <div className="settings-edit-label" onClick={self.openAvatarDialog.bind(self)}>
              <i className="glyphicons glyphicons-camera" />
              Avatar
            </div>
          </CardContent>
        </Card>
        {self.state.avatarDialog ? <AvatarDialog /> : ""}
        {self.state.namespaceDialog ? <NamespaceDialog user={self.state.user} /> : ""}
      </div>
    );
  }
}

export default UserProfile;
