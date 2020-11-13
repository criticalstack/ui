import h from "../../helpers";
import _ from "lodash";
import { formSchema, uiSchema } from "./form-schema";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    exData: [
      "persistentvolumes"
    ],
    exDataAction: function(exData, schema) {
      let volumeNames = [];
      let volumeIds = [];
      let persistentVolumes = exData.persistentvolumes;

      _.forEach(persistentVolumes, function(v) {
        volumeNames.push(v.metadata.name);
        volumeIds.push(`pvc-${v.metadata.uid}`);
      });

      schema.properties.spec.properties.volumeName.enum = volumeIds;
      schema.properties.spec.properties.volumeName.enumNames = volumeNames;

      return schema;
    },
    schema: formSchema.persistentVolume,
    uiSchema: uiSchema.persistentVolume,
    title: "Create volume claim from a Persistent Volume",
    icon: "csicon csicon-persistent-volume-claims",
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
