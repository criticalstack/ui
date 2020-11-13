"use strict";

module.exports = {
  formSchema: {
    "description": "When you create an account here it will be inactive until the request has been approved by a system administrator.",
    "type": "object",
    "required": [
      "name",
      "email",
      "password",
      "password1"
    ],
    "properties": {
      "name": {
        "type": "string",
        "title": "User Name"
      },
      "email": {
        "type": "string",
        "title": "Email Address",
        "format": "email"
      },
      "password": {
        "type": "string",
        "title": "Password (10 char min)",
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
      "ui:placeholder": "password"
    },
    "password1": {
      "ui:widget": "password",
      "ui:placeholder": "password"
    },
    "name": {
      "ui:placeholder": "New User",
      "ui:autofocus": true
    },
    "email": {
      "ui:placeholder": "example@example.com"
    }
  },
  formValidation: function(formData, errors) {
    if (formData.password !== formData.password1) {
      errors.password.addError("Passwords don't match");
    }
    return errors;
  }
};
