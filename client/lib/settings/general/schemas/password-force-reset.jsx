"use strict";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": [
      "password",
      "password1"
    ],
    "properties": {
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
    "password": {
      "ui:widget": "password",
      "ui:placeholder": "password",
      "ui:autofocus": true
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
