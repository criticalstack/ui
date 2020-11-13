import h from "../../helpers";
import { formSchema, uiSchema } from "./form-schema";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    schema: formSchema.configMaps,
    uiSchema: uiSchema.configMaps,
    title: "Create ConfigMap",
    icon: "csicon csicon-config-maps",
    help: "configmaps",
    small: true,
    formData: {
      kind: "ConfigMap"
    },
    onAction: function(form, callback) {
      let flat = {};

      Object.keys(form.data).map(function(item) {
        flat[form.data[item].key] = form.data[item].value;
      });

      form.data = flat;

      let annotatedForm = h.view.helpers.addCsAnnotations(form);

      h.fetch({
        method: "post",
        endpoint: h.ns("/configmaps"),
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
