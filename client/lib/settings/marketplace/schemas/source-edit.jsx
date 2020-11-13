"use strict";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": [
      "Name",
      "URL"
    ],
    "definitions": {
      "AuthPass": {"default": "a"}
    },
    "properties": {
      "Name": {
        "type": "string",
        "title": "Name",
        "readOnly": true
      },
      "Type": {
        "type": "string",
        "title": "Type",
        "enum": ["helm-repo"],
        "enumNames": ["helm-repo"],
        "default": "helm-repo"
      },
      "URL": {
        "type": "string",
        "title": "URL",
        "default": "https://kubernetes-charts.storage.googleapis.com"
      },
      "AuthType": {
        "type": "string",
        "title": "AuthType",
        "enum": ["none", "token", "user"],
        "enumNames": ["none", "token", "user"],
        "default": "none"
      }
    },
    "dependencies": {
      "Type": {
        "oneOf": [
          {
            "properties": {
              "Type": {
                "enum": ["github-org", "github-user"]
              }
            },
            "required": ["Owner"]
          },
          {
            "properties": {
              "Type": {
                "enum": ["helm-repo"]
              }
            }
          }
        ]
      },
      "AuthType": {
        "oneOf": [
          {
            "properties": {
              "AuthType": {
                "enum": ["none"]
              }
            }
          },
          {
            "properties": {
              "AuthType": {
                "enum": ["user"]
              },
              "AuthUser": {
                "type": "string",
                "title": "Username"
              },
              "AuthPass": {
                "type": "string",
                "title": "Password"
              }
            },
            "required": ["AuthUser", "AuthPass"]
          },
          {
            "properties": {
              "AuthType": {
                "enum": ["token"]
              },
              "AuthPass": {
                "title": "AuthPass",
                "type": "string",
                "$ref": "#/definitions/AuthPass"
              }
            },
            "required": ["AuthPass"]
          }
        ]
      }
    }
  },
  uiSchema: {
    "ui:order": ["Name", "Type", "URL", "AuthType", "*"],
    "Name": {
      "ui:placeholder": "app-source",
    },
    "URL": {
      "ui:placeholder": "github.com"
    },
    "AuthType": {
      "ui:emptyValue": ""
    },
    "AuthPass": {
      "ui:widget": "password",
      "ui:placeholder": "developer token",
      "ui:emptyValue": ""
    }
  },
  formValidation: function(formData, errors) {
    if (formData.AuthType === "token" && !formData.AuthPass) {
      errors.AuthPass.addError("source has auth type token, but no auth data provided");
    }
    if (formData.AuthType === "user" && !formData.AuthPass || !formData.AuthUser ) {
      errors.AuthPass.addError("source has auth type user, but no auth data provided");
    }
    if ((formData.AuthUser || formData.AuthPass) && !formData.AuthType) {
      errors.AuthType.addError("source has auth data provided, but no auth type set");
    }
    return errors;
  }
};
