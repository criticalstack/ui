"use strict";

module.exports = {
  formSchema: {
    service: {
      "description": "",
      "type": "object",
      "properties": {
        "metadata": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": {
              "title": "Service Name",
              "type": "string"
            }
          }
        },
        "spec": {
          "type": "object",
          "required": ["type"],
          "properties": {
            "selector": {
              "type": "object",
              "required": ["app"],
              "properties": {
                "app": {
                  "title": "Selector",
                  "type": "string",
                  "description": "The selector is used to bind this service to a pod. To achieve this simply add a label that matches this selector when you create a Pod or Deployment"
                }
              }
            },
            "type": {
              "title": "Mode",
              "type": "string",
              "enum": [
                "0",
                "ClusterIP",
                "LoadBalancer",
                "NodePort"
              ],
              "enumNames": [
                "Select a mode..",
                "Cluster IP",
                "Load Balancer",
                "Node Port"
              ],
              "default": "0"
            },
            "ports": {
              "type": "array",
              "items": {
                "type": "object",
                "required": [
                  "name",
                  "protocol",
                  "port",
                  "targetPort"
                ],
                "properties": {
                  "name": {
                    "title": "Name",
                    "type": "string"
                  },
                  "protocol": {
                    "title": "Protocol",
                    "type": "string",
                    "enum": [
                      "0",
                      "TCP",
                      "UDP"
                    ],
                    "enumNames": [
                      "Select a protocol..",
                      "TCP",
                      "UDP"
                    ],
                    "default": "0"
                  },
                  "port": {
                    "title": "Port",
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 65535
                  },
                  "targetPort": {
                    "title": "Target Port",
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 65535
                  },
                }
              }
            }
          },
          "minItems": 1,
          "uniqueItems": true
        }
      }
    },
    externalName: {
      "$schema": "http://json-schema.org/draft-04/schema#"
    }
  },
  uiSchema: {
    service: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name",
          "ui:autofocus": true
        }
      },
      "type": {
        "ui:placeholder": "Type"
      },
      "spec": {
        "selector": {
          "app": {
            "ui:placeholder": "Selector"
          }
        },
        "ports": {
          "ui:options": {
            "orderable": false
          },
          "items": {
            "ui:options": {
              "orderable": false
            },
            "name": {
              "ui:placeholder": "Name"
            },
            "port": {
              "ui:placeholder": "Port",
            },
            "targetPort": {
              "ui:placeholder": "Target Port"
            }
          }
        }
      }
    }
  }
};
