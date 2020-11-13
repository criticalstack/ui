import { formSchema, uiSchema } from "./../schemas/sso-connectors";
import _ from "lodash";
import h from "../../../helpers";

export default (d) => {
  function prepareFormData(data, form) {
    if (form.config) {
      if (form.config.hasOwnProperty("_advanced")) {
        _.assign(form.config, form.config._advanced);
        delete form.config._advanced;
      }
      form.config = btoa(JSON.stringify(form.config));
    }
    _.assign(data, form);
    // we want to use the same name as the id
    _.set(data, "metadata.name", data.id);
    d.kind = "Connector";
    d.apiVersion = "dex.coreos.com/v1";
    return data;
  }

  let endpoint = "/connectors.dex.coreos.com?namespace=critical-stack";
  let formData = {};
  let action = "Create";
  if (_.get(d, "metadata.name", false)) {
    action = "Edit";
    formData = prepareFormData({}, d);
    endpoint = `/connectors.dex.coreos.com/${d.metadata.name}?namespace=critical-stack`;
  }

  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    schema: formSchema,
    uiSchema: uiSchema,
    formData,
    title: `${action} SSO Connector`,
    icon: "glyphicons glyphicons-power-cord-plug",
    help: "connectors",
    small: true,
    onAction: function(form, callback) {
      let body = prepareFormData({}, form);
      h.fetch({
        method: "post",
        endpoint: endpoint,
        body: JSON.stringify(body),
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
