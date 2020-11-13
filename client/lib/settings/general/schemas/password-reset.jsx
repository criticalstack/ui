"use strict";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": [
      "current_password",
      "password",
      "password1"
    ],
    "properties": {
      "current_password": {
        "type": "string",
        "title": "Current Password"
      },
      "password": {
        "type": "string",
        "title": "New Password (10 char min)",
        "minLength": 10
      },
      "password1": {
        "type": "string",
        "title": "Repeat Password"
      }
    }
  },
  uiSchema: {
    "current_password": {
      "ui:widget": "password",
      "ui:placeholder": "password",
      "ui:autofocus": true
    },
    "password": {
      "ui:widget": "password",
      "ui:placeholder": "password"
    },
    "password1": {
      "ui:widget": "password",
      "ui:placeholder": "password"
    }
  },
  formValidation: function(formData, errors) {
    if (formData.password !== formData.password1) {
      errors.password.addError("Passwords don't match");
    }
    return errors;
  }
};
