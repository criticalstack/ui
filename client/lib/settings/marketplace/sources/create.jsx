import h from "../../../helpers";
import { formSchema, uiSchema } from "../schemas/source";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    schema: formSchema,
    uiSchema: uiSchema,
    title: "Create a new Source",
    icon: "csicon csicon-config-maps",
    small: true,
    formData: {
      kind: "Source"
    },
    icon: "glyphicons glyphicons-folder-cogwheel",
    onAction: function(form, callback) {
      h.fetch({
        method: "post",
        endpoint: "/sources.marketplace.criticalstack.com",
        body: JSON.stringify(form),
        success: function(u) {
          h.Vent.emit("notification", {
            message: `Source ${u.context.result.metadata.name} successfully added`
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
