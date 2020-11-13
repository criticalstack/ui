"use strict";

import React from "react";
import h from "../helpers";
import FormDialog from "./form-dialog";
import {
  formSchema,
  uiSchema,
  formValidation
} from "./register-schema";

class Register extends React.Component {

  componentDidMount() {
    this.registerUser();
    h.Vent.addListener("register:close", () => {
      this.props.history.push("/login");
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("register:close");
  }

  registerUser() {

    let token = this.props.match.params.token;

    let re = /^[a-zA-z0-9]+$/;
    let tokenCheck = re.exec(token);

    if (tokenCheck === null) {
      this.props.history.push("/login");
      return false;
    }

    formSchema.properties.registration_token.default = token;

    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchema,
      uiSchema: uiSchema,
      validate: formValidation,
      title: "Create initial cluster account",
      icon: "glyphicons glyphicons-user",
      register: true,
      onAction: function(form, callback) {
        h.fetch({
          method: "post",
          endpoint: "/register",
          api: false,
          body: JSON.stringify(form),
          success: function(u) {
            h.Vent.emit("notification", {
              message: `Account ${u.context.result.name} successfully created`
            });

            h.Vent.emit("layout:form-dialog:close");

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          },
          error: function() {
            h.Vent.emit("notification", {
              message: "Failed to create account"
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          }
        });
      }
    });
  }

  render() {
    return (
      <>
        <div className="login-box-parent">
          <div className="login-animation-parent">
            <div className="login-animation-overlay"></div>
            <img src="/assets/video/rack-animation.gif" />
          </div>
          <FormDialog />
        </div>
      </>
    );
  }
}

export default Register;
