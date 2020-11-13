"use strict";

module.exports = {
  formSchema: {
    "type": "object",
    "properties": {
      "metadata": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": {
            "title": "Name",
            "type": "string"
          }
        },
      },
      "spec": {
        "type": "object",
        "required": ["url"],
        "properties": {
          "url": {
            "type": "string",
            "title": "URL",
            "default": "https://kubernetes-charts.storage.googleapis.com"
          },
          "username": {
            "type": "string",
            "title": "Username",
          },
          "password": {
            "type": "string",
            "title": "Password"
          }
        },
        "dependencies": {
          "username": ["password"],
          "password": ["username"]
        }
      }
    },
  },
  uiSchema: {
    "metadata": {
      "name": {
        "ui:placeholder": "Name",
        "ui:autofocus": true
      }
    },
    "spec": {
      "username": {
        "ui:autocomplete": "source-username"
      },
      "password": {
        "ui:autocomplete": "source-password",
        "ui:widget": "password"
      }
    }
  },
  formValidation: function(formData, errors) {
    let regex = (/^[a-z0-9][-a-z0-9_.]*[a-z0-9]$/);

    if (!regex.test(formData.name)) {
      errors.name.addError("must consist of lowercase alphanumeric characters, \'-\', \'_\', \'.\'");
      errors.name.addError("must start and end with an alphanumeric character (e.g. \'my_value\',  or \'12345\')");
    }

    return errors;
  }
};
