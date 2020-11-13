"use strict";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "properties": {
      "metadata": {
        "type": "object",
        "properties": {
          "name": {
            "title": "Service Account Name",
            "type": "string"
          }
        },
        "required": ["name"]
      },
      "imagePullSecrets": {
        "type": "array",
        "title": "Image Pull Secrets",
        "items": {
          "type": "string",
          "enum": [],
          "enumNames": []
        },
        "uniqueItems": true
      },
      "secrets": {
        "type": "array",
        "title": "Secrets",
        "items": {
          "type": "string",
          "enum": [],
          "enumNames": []
        },
        "uniqueItems": true
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
    "imagePullSecrets": {
      "ui:widget": "checkboxes"
    },
    "secrets": {
      "ui:widget": "checkboxes"
    }
  }
};
