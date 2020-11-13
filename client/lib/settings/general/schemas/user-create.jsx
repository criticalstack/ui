"use strict";
import React from "react";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": [
      "username",
      "email",
      "password",
      "password1"
    ],
    "definitions": {
      "defaultNamespace": {
        "type": "string",
        "title": "Namespace",
        "enum": [],
      }
    },
    "properties": {
      "username": {
        "type": "string",
        "title": "User Name"
      },
      "email": {
        "type": "string",
        "title": "Email Address",
        "format": "email"
      },
      "roleID": {
        "type": "string",
        "title": "Role Type",
        "enum": []
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
      "active": {
        "type": "boolean",
        "title": "This user will be Active",
        "default": true
      }
    },
    "dependencies": {
      "roleID": {
        "properties": {
          "clusterWide": {
            "type": "boolean",
            "title": "Apply Role Cluster Wide",
            "default": false
          },
        }
      },
      "clusterWide": {
        "oneOf": [
          {
            "properties": {
              "clusterWide": {"const": false},
              "defaultNamespace": {
                  "$ref": "#/definitions/defaultNamespace",
              }
            },
            "required": ["defaultNamespace"]
          },
          {
            "properties": {
              "clusterWide": {"const": true},
              "dummyDefaultNamespace": {
                "type": "string",
                "title": "Namespace",
                "readOnly": true,
                "default": "",
                "enum": [""],
              }
            }
          }
        ]
      }
    }
  },
  uiSchema: {
    "ui:order": [
      "username",
      "email",
      "password",
      "password1",
      "roleID",
      "dummyDefaultNamespace",
      "defaultNamespace",
      "clusterWide",
      "*"
    ],
    "password": {
      "ui:widget": "password",
      "ui:placeholder": "password"
    },
    "password1": {
      "ui:widget": "password",
      "ui:placeholder": "password"
    },
    "username": {
      "ui:placeholder": "New User",
      "ui:autofocus": true
    },
    "email": {
      "ui:placeholder": "example@example.com"
    },
    "roleID": {
      "ui:placeholder": "No access"
    },
    "dummyDefaultNamespace": {
      "ui:description": "Restrict user's role to a namespace, or check 'Cluster Wide'",
      "ui:placeholder": "Select a namespace"
    },
    "defaultNamespace": {
      "ui:description": "Restrict user's role to a namespace, or check 'Cluster Wide'",
      "ui:placeholder": "Select a namespace"
    }
  },
  formValidation: function(formData, errors) {
    if (formData.password !== formData.password1) {
      errors.password.addError("Passwords don't match");
    }
    return errors;
  }
};
