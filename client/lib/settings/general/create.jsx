import React from "react";
import h from "../../helpers";
import {
  formSchema,
  uiSchema,
  formValidation
} from "./schemas/user-create";
import _ from "lodash";

export default (props) => {
  h.fetch({
    endpoint: "/clusterroles",
    success: function(roles) {
      h.log.info("Roles:", roles);
      let simpleRoles = [];

      simpleRoles = roles.context.result.filter((role) => {
        let labels = _.get(role, "metadata.labels");
        if (labels) {
          if (labels.hasOwnProperty("criticalstack.com/rbac")) {
            return true;
          }
        }
        return false;
      }).map((match) => {
        return match;
      });

      let roleNames = [];
      let roleDescriptions = [];
      let namespaces = _.get(props, "history.location.state.namespaces", []);
      let namespaceNames = [];

      _.forEach(namespaces, function(namespace) {
        namespaceNames.push(namespace.metadata.name);
      });

      formSchema.definitions.defaultNamespace.enum = namespaceNames;

      _.forEach(simpleRoles, function(r) {
        let name = r.metadata.name;
        roleNames.push(name);

        let description = r.metadata.annotations["criticalstack.com/description"];
        roleDescriptions.push(
          <div
            key={r.metadata.name}
            style={{
              marginBottom: "10px"
            }}
          >
            <span style={{
              fontWeight: "bold",
              marginRight: "10px",
              marginBottom: "5px"
            }}
            >
              {name}:
            </span>
            <div style={{
              lineHeight: "1.5"
            }}
            >
              {description}
            </div>
          </div>
        );
      });

      formSchema.properties.roleID.enum = roleNames;

      uiSchema.roleID["ui:description"] = (
        <div className="custom-description">
          {roleDescriptions}
        </div>
      );

      h.Vent.emit("layout:form-dialog:open", {
        open: true,
        schema: formSchema,
        uiSchema: uiSchema,
        validate: formValidation,
        title: "Create a new user",
        icon: "glyphicons glyphicons-user",
        onAction: function(form, callback) {
          h.fetch({
            method: "post",
            endpoint: "/users",
            resUrl: false,
            body: JSON.stringify(form),
            success: function(u) {
              h.Vent.emit("notification", {
                message: `User ${u.context.result.spec.template.username} successfully added`
              });

              h.Vent.emit("layout:form-dialog:close");

              if (callback && typeof callback === "function") {
                return callback();
              }
              return true;
            },
            error: function() {
              h.Vent.emit("notification", {
                message: "Failed to add new user"
              });

              if (callback && typeof callback === "function") {
                return callback();
              }
              return true;
            }
          });
        }
      });
    }
  });
};

