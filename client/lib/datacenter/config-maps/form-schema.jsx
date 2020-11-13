"use strict";

module.exports = {
  formSchema: {
    configMaps: {
      "type": "object",
      "properties": {
        "metadata": {
          "type": "object",
          "properties": {
            "name": {
              "title": "Config Map Name",
              "type": "string"
            }
          },
          "required": ["name"]
        },
        "data": {
          "title": "Data",
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
    configMaps: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name",
          "ui:autofocus": true
        }
      },
      "data": {
        "ui:options": {
          "orderable": false
        },
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
