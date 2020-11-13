import h from "../../helpers";
import { formSchema, uiSchema } from "./form-schema";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    schema: formSchema.AWS,
    uiSchema: uiSchema.AWS,
    title: "Create StorageClass",
    icon: "csicon csicon-storage-classes",
    onAction: function(form, callback) {
      if (form.parameters.hasOwnProperty("iopsPerGB")) {
        let iopVal = form.parameters.iopsPerGB;
        form.parameters.iopsPerGB = iopVal.toString();
      }

      let annotatedForm = h.view.helpers.addCsAnnotations(form);

      h.fetch({
        method: "post",
        endpoint: h.ns("/storageclasses"),
        body: JSON.stringify(annotatedForm),
        success: function() {
          h.Vent.emit("notification", {
            message: "New storage class successfully added"
          });

          h.Vent.emit("layout:form-dialog:close");

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
