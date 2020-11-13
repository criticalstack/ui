import h from "../../helpers";
import _ from "lodash";
import { formSchema, uiSchema } from "./form-schema";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    exData: [
      "services",
      "secrets"
    ],
    exDataAction: function(exData, schema) {
      let serviceNames = [];
      let secretNames = [];
      let services = exData.services;
      let secrets = exData.secrets;

      _.forEach(services, function(srv) {
        serviceNames.push(srv.metadata.name);
      });

      schema.properties.spec.properties.backend.properties.serviceName.enum = serviceNames;

      _.forEach(secrets, function(sec) {
        secretNames.push(sec.metadata.name);
      });

      schema.properties.spec.properties.tls.enum = secretNames;

      return schema;
    },
    schema: formSchema.ingress,
    uiSchema: uiSchema.ingress,
    title: "Create Ingress",
    icon: "csicon csicon-ingress",
    help: "Ingress",
    small: true,
    onAction: function(form, callback) {

      let annotatedForm = h.view.helpers.addCsAnnotations(form);

      h.fetch({
        method: "post",
        endpoint: h.ns("/ingresses"),
        body: JSON.stringify(annotatedForm),
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
};
