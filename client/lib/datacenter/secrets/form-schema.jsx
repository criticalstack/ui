"use strict";

module.exports = {
  formSchema: {
    kube: {
      "description": "",
      "type": "object",
      "properties": {
        "metadata": {
          "type": "object",
          "properties": {
            "name": {
              "title": "Secret Name",
              "type": "string"
            }
          },
          "required": ["name"]
        },
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "key": {
                "title": "Key",
                "type": "string"
              },
              "value": {
                "title": "Value",
                "type": "string"
              }
            }
          },
          "minItems": 1,
          "uniqueItems": true
        }
      },
      "required": ["data"]
    }
  },
  uiSchema: {
    kube: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name",
          "ui:autofocus": true
        }
      },
      "data": {
        "items": {
          "key": {
            "ui:placeholder": "Key"
          },
          "value": {
            "ui:placeholder": "Value"
          }
        }
      }
    }
  }
};
