"use strict";

import React from "react";
import h from "../helpers";

const StackValueForm = {
  newAnnotation(name, kind, formData, formCallback) {
    const descriptions = {
      Secret: "This secret must be converted to a StackValue. To configure it, fill in the fields below.",
      ConfigMap: "This ConfigMap is a potential StackValue. If you would like to convert it to one, simply fill out the fields below. If you want to keep it as-is, just click \"Exit\" below."
    };

    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: {
        "description": descriptions[kind],
        "type": "object",
        "required": [
          "stackvalues.criticalstack.com/sourceType",
          "stackvalues.criticalstack.com/path"
        ],
        "properties": {
          "stackvalues.criticalstack.com/sourceType": {
            "title": "Source type",
            "default": "vault",
            "type": "string",
            "enum": [
              "artifactory",
              "vault",
              "s3"
            ],
          },
          "stackvalues.criticalstack.com/path": {
            "title": "Path",
            "type": "string"
          }
        }
      },
      uiSchema: {
        "stackvalues.criticalstack.com/path": {
          "ui:placeholder": "Path"
        }
      },
      title: `Create StackValue from ${name}`,
      icon: "glyphicons glyphicons-layers-cogwheel",
      help: false,
      dialogClass: "small",
      formData: formData,
      onAction: function(form, callback) {
        if (formCallback && typeof formCallback === "function") {
          return formCallback([form, callback]);
        }
      }
    });
  }
};

export default StackValueForm;
