"use strict";

import h from "../../helpers";
import _ from "lodash";
import { formSchema, uiSchema } from "./form-schema";

var ServiceForm = {
  newService(formSource, formData, formCallback) {

    var formDefaults = {
      kind: "Service",
      spec: {
        ports: [{
          name: "",
          protocol: "",
          port: "",
          targetPort: ""
        }]
      }
    };

    var schemaLocation = uiSchema.service;
    var sfName = "metadata.name.ui:readonly";
    var sfSelector = "spec.selector.app.ui:readonly";

    if (formSource === "dialog") {
      // if we are coming from the simple dialog component
      // we need to force the selector on the created service
      // to match the label on the new resource
      _.merge(formDefaults, formData);

      _.set(schemaLocation, sfName, true);
      _.set(schemaLocation, sfSelector, true);
    } else {
      _.set(schemaLocation, sfName, false);
      _.set(schemaLocation, sfSelector, false);
    }

    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchema.service,
      uiSchema: uiSchema.service,
      title: "Create Service",
      icon: "csicon csicon-services",
      help: "Service",
      small: true,
      formData: formDefaults,
      onAction: function(form, callback) {

        h.fetch({
          method: "post",
          endpoint: h.ns("/services"),
          body: JSON.stringify(form),
          success: function() {
            h.Vent.emit("notification", {
              message: "Save Complete"
            });

            if (formCallback && typeof formCallback === "function") {
              return formCallback([form, callback]);
            } else {
              if (callback && typeof callback === "function") {
                return callback();
              }
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
  },

  externalName() {
    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchema.externalName,
      uiSchema: uiSchema.externalName,
      title: "Create a new External Name Service",
      icon: "glyphicons glyphicons-engineering-networks",
      help: "Service",
      small: true,
      formData: {
        data: [{
          key: "",
          value: ""
        }]
      },
      onAction: function(form, callback) {

        var flat = {};
        _.each(form.data, function(item) {
          flat[item.key] = window.btoa(item.value);
        });

        form.data = flat;

        h.fetch({
          method: "post",
          endpoint: h.ns("/services"),
          body: JSON.stringify(form),
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
  },
};

export default ServiceForm;
