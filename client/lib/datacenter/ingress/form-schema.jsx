"use strict";

module.exports = {
  formSchema: {
    ingress: {
      "description": "",
      "type": "object",
      "properties": {
        "metadata": {
          "type": "object",
          "required": [
            "name"
          ],
          "properties": {
            "name": {
              "title": "Ingress Name",
              "type": "string"
            }
          },
        },
        "spec": {
          "type": "object",
          "properties": {
            "backend": {
              "type": "object",
              "required": [
                "serviceName",
                "servicePort"
              ],
              "properties": {
                "serviceName": {
                  "title": "Name of Service",
                  "type": "string",
                  "enum": []
                },
                "servicePort": {
                  "title": "Port Number",
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 65535
                }
              }
            },
            "tls": {
              "title": "TLS Secret (optional)",
              "type": "string",
              "enum": []
            }
          }
        }
      }
    }
  },
  uiSchema: {
    ingress: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name",
          "ui:autofocus": true
        }
      },
      "spec": {
        "backend": {
          "serviceName": {
            "ui:placeholder": "Select a Service..."
          },
          "servicePort": {
            "ui:placeholder": "Port number"
          }
        },
        "tls": {
          "ui:placeholder": "Select a Secret..."
        }
      }
    }
  }
};
