"use strict";

import React from "react";
import h from "../lib/helpers";

var CSFormScaleEditor = {
  "type": "object",
  "required": [
    "replicas"
  ],
  "properties": {
    "replicas": {
      "title": "Number of pods",
      "type": "number",
      "minimum": 0,
      "maximum": 50
    }
  }
};

export default function(options) {

  if (!options.beforeSend) {
    options.beforeSend = function(params) {
      return params;
    };
  }

  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    formData: options.formData || {},
    schema: CSFormScaleEditor,
    icon: options.icon || "glyphicons glyphicons-more-items",
    title: options.title || "",
    dialogClass: "confirm",
    uiSchema: {
      replicas: {
        "ui:widget": "range"
      }
    },
    fields: options.fields || {},
    onAction: function(form, callback) {

      h.fetch({
        method: "patch",
        endpoint: options.url,
        body: JSON.stringify(options.beforeSend(form)),
        success: function() {
          h.Vent.emit("notification", {
            message: "Save Complete"
          });

          if (callback && typeof callback === "function") {
            return callback();
          }
        },
        error: function(a) {
          h.Vent.emit("request-error:confirm-box", a);

          h.Vent.emit("notification", {
            message: "Error while saving..."
          });

          if (callback && typeof callback === "function") {
            return callback();
          }
        }
      });
    }
  });
}
