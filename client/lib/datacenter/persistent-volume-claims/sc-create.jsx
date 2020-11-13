import h from "../../helpers";
import _ from "lodash";
import { formSchema, uiSchema } from "./form-schema";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    exData: [
      "storageclasses"
    ],
    exDataAction: function(exData, schema) {
      let scNames = [];
      let storageClasses = exData.storageclasses;

      _.forEach(storageClasses, function(cs) {
        scNames.push(cs.metadata.name);
      });

      let annotations = schema.properties.metadata.properties.annotations.properties;

      annotations["volume.beta.kubernetes.io/storage-class"].enum = scNames;

      return schema;
    },
    schema: formSchema.storageClass,
    uiSchema: uiSchema.storageClass,
    title: "Create volume claim from a Storage Class",
    icon: "csicon csicon-storage-classes",
    help: "PersistentVolumeClaim",
    small: true,
    onAction: function(form, callback) {

      let annotatedForm = h.view.helpers.addCsAnnotations(form);

      h.fetch({
        method: "post",
        endpoint: h.ns("/persistentvolumeclaims"),
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
