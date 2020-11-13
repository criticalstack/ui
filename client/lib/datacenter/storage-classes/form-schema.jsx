"use strict";

module.exports = {
  formSchema: {
    AWS: {
      "description": "",
      "type": "object",
      "required": [],
      "properties": {
        "metadata": {
          "type": "object",
          "required": [
            "name"
          ],
          "properties": {
            "name": {
              "title": "Name",
              "type": "string"
            }
          },
        },
        "provisioner": {
          "type": "string",
          "title": "Provisioner",
          "default": "kubernetes.io/aws-ebs"
        },
        "parameters": {
          "type": "object",
          "required": [
            "type",
            "zone",
          ],
          "properties": {
            "type": {
              "title": "Type",
              "type": "string",
              "enum": [
                "io1",
                "gp2",
                "sc1",
                "st1"
              ],
              "default": "io1",
            },
            "iopsPerGB": {
              "title": "I/O Operations per second per GB (io1 volumes only)",
              "type": "integer",
              "minimum": 1,
              "maximum": 20000,
              "default": 50
            },
            "zone": {
              "title": "AWS Region",
              "type": "string",
              "enum": [
                "us-east-1a",
                "us-east-1b",
                "us-east-1c",
                "us-east-1e",
                "us-west-1a",
                "us-west-1b",
                "us-west-2a",
                "us-west-2b",
                "us-west-2c",
              ],
              "enumNames": [
                "US East (Virginia). Zone 1A.",
                "US East (Virginia). Zone 1B.",
                "US East (Virginia). Zone 1C.",
                "US East (Virginia). Zone 1E.",
                "US West (N. California). Zone 1A.",
                "US West (N. California). Zone 1B.",
                "US West (Oregon). Zone 2A.",
                "US West (Oregon). Zone 2B.",
                "US West (Oregon). Zone 2C."
              ],
              "default": "us-east-1a"
            },
            "encrypted": {
              "title": "Encrypt Volume",
              "type": "string",
              "enum": [
                "True",
                "False"
              ],
              "default": "True"
            },
            "kmsKeyId": {
              "title": "Encryption Key (optional if above is set to true)",
              "type": "string"
            }
          },
        }
      }
    }
  },
  uiSchema: {
    AWS: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name",
          "ui:autofocus": true
        }
      },
      "provisioner": {
        "ui:readonly": true
      },
      "parameters": {
        "iopsPerGB": {
          "ui:widget": "range"
        },
        "kmsKeyId": {
          "ui:placeholder": "The full Amazon Resource Name of the key to use when encrypting the volume"
        }
      }
    }
  }
};
