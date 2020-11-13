"use strict";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": ["workload", "minReplicas", "maxReplicas"],
    "properties": {
      "workload": {
        "type": "string",
        "title": "Workload",
        "enum": ["Deployment", "ReplicaSet", "StatefulSet"],
        "enumNames": ["Deployment", "Replica Set", "Stateful Set"],
      },
      "minReplicas": {
        "type": "integer",
        "title": "Minimum Replicas",
        "minimum": 1,
        "default": 1
      },
      "maxReplicas": {
        "type": "integer",
        "title": "Maximum Replicas",
        "minimum": 1,
        "default": 10
      },
      "enableCPU": {
        "type": "boolean",
        "title": "Include CPU Metrics"
      },
      "enableMemory": {
        "type": "boolean",
        "title": "Include Memory Metrics"
      },
    },
    "dependencies": {
      "workload": {
        "oneOf": [
          {
            "properties": {
              "workload": {
                "enum": ["Deployment"]
              },
              "deploymentName": {
                "type": "string",
                "title": "Deployment Name",
                "enum": []
              }
            },
            "required": ["deploymentName"],
          },
          {
            "properties": {
              "workload": {
                "enum": ["ReplicaSet"]
              },
              "replicaSetName": {
                "type": "string",
                "title": "Replica Set Name",
                "enum": []
              }
            },
            "required": ["replicaSetName"],
          },
          {
            "properties": {
              "workload": {
                "enum": ["StatefulSet"]
              },
              "statefulSetName": {
                "type": "string",
                "title": "Stateful Set Name",
                "enum": []
              }
            },
            "required": ["statefulSetName"],
          }
        ]
      },
      "enableCPU": {
        "oneOf": [
          {
            "properties": {
              "enableCPU": {
                "const": false
              }
            }
          },
          {
            "properties": {
              "enableCPU": {
                "const": true
              },
              "targetCPU": {
                "type": "integer",
                "title": "Target Utilization CPU (%)",
                "minimum": 1,
                "maximum": 100,
                "default": 80
              }
            }
          }
        ]
      },
      "enableMemory": {
        "oneOf": [
          {
            "properties": {
              "enableMemory": {
                "const": false
              }
            }
          },
          {
            "properties": {
              "enableMemory": {
                "const": true
              },
              "targetMemory": {
                "type": "integer",
                "title": "Target Utilization Memory (%)",
                "minimum": 1,
                "maximum": 100,
                "default": 50
              }
            }
          }
        ]
      }
    }
  },
  uiSchema: {
    "ui:order": ["workload", "*", "minReplicas", "maxReplicas", "enableCPU", "targetCPU", "enableMemory", "targetMemory"],
    "workload": {
      "ui:placeholder": "Select a Workload..."
    },
    "deploymentName": {
      "ui:placeholder": "Select a Deployment..."
    },
    "replicaSetName": {
      "ui:placeholder": "Select a Replica Set..."
    },
    "statefulSetName": {
      "ui:placeholder": "Select a Stateful Set..."
    },
    "targetCPU": {
      "ui:widget": "range"
    },
    "targetMemory": {
      "ui:widget": "range"
    }
  }
};
