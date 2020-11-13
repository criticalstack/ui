"use strict";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": [
      "Name",
      "URL"
    ],
    "properties": {
      "Name": {
        "type": "string",
        "title": "Name"
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
        "description": "If the \"token\" auth type is selected you will be required to add a token below.",
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
                "type": "string",
                "title": "AuthPass"
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
      "ui:autofocus": true
    },
    "URL": {
      "ui:placeholder": "https://kubernetes-charts.storage.googleapis.com"
    },
    "AuthType": {
      "ui:placeholder": "Select an auth type..."
    },
    "AuthUser": {
      "ui:placeholder": "username"
    },
    "AuthPass": {
      "ui:widget": "password",
      "ui:placeholder": "developer token"
    }
  },
  formValidation: function(formData, errors) {
    let regex = (/^[a-z0-9][-a-z0-9_.]*[a-z0-9]$/);

    if (!regex.test(formData.Name)) {
      errors.Name.addError("must consist of lowercase alphanumeric characters, \'-\', \'_\', \'.\'");
      errors.Name.addError("must start and end with an alphanumeric character (e.g. \'my_value\',  or \'12345\')");
    }

    return errors;
  }
};
