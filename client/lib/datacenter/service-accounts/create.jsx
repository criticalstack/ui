import h from "../../helpers";
import _ from "lodash";
import { formSchema, uiSchema } from "./form-schema";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    exData: [
      "secrets"
    ],
    exDataAction: function(exData, schema) {
      let secretNames = [];
      let secrets = exData.secrets;

      _.forEach(secrets, function(s) {
        let secretName = _.get(s, "metadata.name", false);

        if (secretName) {
          secretNames.push(secretName);
        }
      });

      schema.properties.imagePullSecrets.items.enumNames = secretNames;
      schema.properties.imagePullSecrets.items.enum = secretNames;

      schema.properties.secrets.items.enumNames = secretNames;
      schema.properties.secrets.items.enum = secretNames;

      return schema;
    },
    schema: formSchema,
    uiSchema: uiSchema,
    title: "Create ServiceAccount",
    icon: "csicon csicon-service-accounts",
    help: "ServiceAccount",
    small: true,
    formData: {
      kind: "ServiceAccount"
    },
    onAction: function(form, callback) {
      let imagePullSecrets = _.get(form, "imagePullSecrets", []);
      form.imagePullSecrets = imagePullSecrets.map(x => {
        return {
          name: x
        };
      });
      let secrets = _.get(form, "secrets", []);
      form.secrets = secrets.map(x => {
        return {
          name: x
        };
      });
      h.fetch({
        method: "post",
        endpoint: h.ns("/serviceaccounts"),
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
