"use strict";

module.exports = {
  formSchema: {
    persistentVolume: {
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
              "title": "Name of Volume Claim",
              "type": "string"
            }
          },
        },
        "spec": {
          "type": "object",
          "required": [
            "volumeName",
            "accessModes"
          ],
          "properties": {
            "volumeName": {
              "title": "Name of Persistent Volume",
              "type": "string",
              "enum": [],
              "enumNames": []
            },
            "accessModes": {
              "title": "Access Modes",
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "ReadWriteOnce"
                ]
              },
              "uniqueItems": true,
              "default": [
                "ReadWriteOnce"
              ]
            },
            "resources": {
              "type": "object",
              "properties": {
                "requests": {
                  "type": "object",
                  "required": [
                    "storage"
                  ],
                  "properties": {
                    "storage": {
                      "title": "Size of Volume Claim",
                      "type": "string",
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    storageClass: {
      "description": "",
      "type": "object",
      "properties": {
        "metadata": {
          "type": "object",
          "required": [
            "name",
            "annotations"
          ],
          "properties": {
            "name": {
              "title": "Name of Volume Claim",
              "type": "string"
            },
            "annotations": {
              "type": "object",
              "properties": {
                "volume.beta.kubernetes.io/storage-class": {
                  "title": "Name of Storage Class",
                  "type": "string",
                  "enum": []
                }
              }
            }
          },
        },
        "spec": {
          "type": "object",
          "required": [
            "accessModes"
          ],
          "properties": {
            "accessModes": {
              "title": "Access Modes",
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "ReadWriteOnce"
                ]
              },
              "uniqueItems": true,
              "default": [
                "ReadWriteOnce"
              ]
            },
            "resources": {
              "type": "object",
              "properties": {
                "requests": {
                  "type": "object",
                  "required": [
                    "storage"
                  ],
                  "properties": {
                    "storage": {
                      "title": "Size of Volume Claim",
                      "type": "string",
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  uiSchema: {
    persistentVolume: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name",
          "ui:autofocus": true
        }
      },
      "spec": {
        "volumeName": {
          "ui:placeholder": "Select a Persistent Volume..."
        },
        "accessModes": {
          "ui:widget": "checkboxes"
        },
        "resources": {
          "requests": {
            "storage": {
              "ui:placeholder": "eg. 500Mi or 5Gi"
            }
          }
        }
      }
    },
    storageClass: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name",
          "ui:autofocus": true
        },
        "annotations": {
          "volume.beta.kubernetes.io/storage-class": {
            "ui:placeholder": "Select a Storage Class..."
          }
        }
      },
      "spec": {
        "accessModes": {
          "ui:widget": "checkboxes"
        },
        "resources": {
          "requests": {
            "storage": {
              "ui:placeholder": "eg. 500Mi or 5Gi"
            }
          }
        }
      }
    }
  }
};
