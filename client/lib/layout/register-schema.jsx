"use strict";

module.exports = {
  formSchema: {
    "description": "You are about to create a Cluster Administrator account. This account will have full control of your new cluster. Once the account has been created you will be redirected to the cluster so that you may log in.",
    "type": "object",
    "required": [
      "name",
      "email",
      "password",
      "password1",
      "registration_token"
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
      },
      "registration_token": {
        "type": "string",
        "title": "Registration Token"
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
    },
    "registration_token": {
      "ui:disabled": true
    }
  },
  formValidation: function(formData, errors) {
    if (formData.password !== formData.password1) {
      errors.password.addError("Passwords don't match");
    }
    return errors;
  }
};
