"use strict";

import React from "react";
import h from "../../helpers";
import {
  formSchema,
  uiSchema,
  formValidation
} from "./schemas/create-pending-user";

class CreatePendingUser extends React.Component {

  constructor(props) {
    super(props);

    this.addUser = this.addUser.bind(this);
  }

  addUser() {
    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchema,
      uiSchema: uiSchema,
      validate: formValidation,
      title: "Create an account",
      icon: "glyphicons glyphicons-user",
      onAction: function(form, callback) {
        h.fetch({
          method: "post",
          endpoint: "/users",
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
      <div className="signup-box">
        <span
          onClick={this.addUser}
          className="signup-link"
        >
          Need an account?
        </span>
      </div>
    );
  }
}

export default CreatePendingUser;
