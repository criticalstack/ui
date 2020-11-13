import h from "../../helpers";
import _ from "lodash";
import { formSchema, uiSchema } from "./form-schema";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    schema: formSchema.kube,
    uiSchema: uiSchema.kube,
    title: "Create Secret",
    icon: "csicon csicon-secrets",
    help: "Secret",
    small: true,
    formData: {
      kind: "Secret"
    },
    onAction: function(form, callback) {

      var flat = {};
      _.each(form.data, function(item) {
        flat[item.key] = window.btoa(item.value);
      });

      form.data = flat;

      h.fetch({
        method: "post",
        endpoint: h.ns("/secrets"),
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
};
