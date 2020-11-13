import h from "../../helpers";
import _ from "lodash";

export default () => {
  h.fetch({
    method: "get",
    endpoint: "/machines/schema",
    resUrl: false,
    success: function(response) {
      let schema = response.context.result.schema;
      let configSchema = {
        title: "Worker Configuration",
        type: "string",
        enum: [],
        enumNames: []
      };

      let uiSchema = {
        apiVersion: {
          "ui:title": "API Version",
          "ui:readonly": true
        },
        kind: {
          "ui:title": "Kind",
          "ui:readonly": true
        },
        metadata: {
          "name": {
            "ui:title": "Name",
            "ui:placeholder": "Name",
            "ui:autofocus": true
          }
        },
        spec: {
          "clusterName": {
            "ui:title": "Cluster Name",
          },
          "containerName": {
            "ui:title": "Container Name",
          },
          "image": {
            "ui:title": "Container Image"
          }
        },
        config: {
          "ui:placeholder": "Select a configuration..."
        }
      };

      schema.properties.config = configSchema;
      schema.required.push("config");

      h.Vent.emit("layout:form-dialog:open", {
        open: true,
        exData: [
          {
            endpoint: "configs.machine.crit.sh",
            key: "machineconfigs",
          },
        ],
        exDataAction: function(exData, _schema) {
          _schema.properties.config.enum = ["Create new configuration..."].concat(exData.machineconfigs.map(c => c.metadata.name));
          return _schema;
        },
        schema: schema,
        uiSchema: uiSchema,
        small: true,
        title: `New Worker Node (${schema.properties.kind.default})`,
        icon: "glyphicons glyphicons-vector-path",
        help: "Node",
        onChangeAction: (data) => {
          const openConfig = _.get(data, "formData.config", false);
          if (openConfig === "Create new configuration...") {
            h.Vent.emit("layout:manifest-dialog-simple:open", {
              open: true,
              icon: "glyphicons glyphicons-plus",
              title: "Add a new configuration",
              type: "machineconfigs-simple",
              endpoint: "configs.machine.crit.sh?namespace=kube-system",
              namespaced: false,
              callback: (resp) => {
                let newSchema = _.cloneDeep(schema);
                let configName = resp.context.result.metadata.name;
                newSchema.properties.config.enum.push(configName);
                _.set(data, "formData.config", configName);
                schema = newSchema;
                h.Vent.emit("layout:form-dialog:schema-update", newSchema, data.formData);
              }
            });
          }
        },
        onAction: function(form, callback) {
          if (!form) {
            h.Vent.emit("notification", {
              message: "Error: Unknown Error"
            });

            return false;
          }

          h.fetch({
            method: "post",
            endpoint: "/machines",
            resUrl: false,
            body: JSON.stringify(form),
            success: function() {
              h.Vent.emit("notification", {
                message: "New Worker Node is being created."
              });
              h.Vent.emit("layout:form-dialog:close");
              if (callback && typeof callback === "function") {
                return callback();
              }
            },
            error: function(a) {
              h.Vent.emit("request-error:confirm-box", a);

              h.Vent.emit("notification", {
                message: "Error while trying to create node..."
              });

              if (callback && typeof callback === "function") {
                return callback();
              }
            }
          });
        }
      });
    }
  });
};
