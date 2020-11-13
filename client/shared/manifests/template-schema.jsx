"use strict";

module.exports = {
  "$schema": "http://json-schema.org/schema#",
  "type": "object",
  "definitions": {
    "number": {
      "type": "number"
    },
    "password": {
      "type": "string"
    },
    "string": {
      "type": "string",
      "description": "A String"
    }
  },
  "required": [
    "username",
    "password",
    "password1"
  ],
  "properties": {
    "username": {
      "$ref": "#/definitions/string",
      "title": "Username"
    },
    "password": {
      "$ref": "#/definitions/password",
      "title": "Password"
    },
    "password1": {
      "$ref": "#/definitions/password",
      "title": "Repeat Password"
    }
  },
  "uiSchema": {
    "username": {
      "ui:placeholder": "user1"
    },
    "password": {
      "ui:placeholder": "password",
      "ui:widget": "password"
    },
    "password1": {
      "ui:placeholder": "password",
      "ui:widget": "password"
    }
  },
  "formValidation": "function(formData, errors) {\n\n  if (formData.password !== formData.password1) {\n    errors.password.addError(\"Passwords do not match\");\n  }\n\n\n  return errors;\n};\n"
};
