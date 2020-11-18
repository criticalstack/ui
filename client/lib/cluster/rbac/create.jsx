import h from "../../helpers";
import Session from "../../helpers/session";

export default ({}, route) => {
  // let self = this;
  let type;
  let namespace = Session.namespace();
  let title = "";

  switch (route) {
    case "clusterrolebindings":
      type = "ClusterRoleBinding";
      break;
    case "clusterroles":
      type = "ClusterRole";
      break;
    case "rolebindings":
      type = "RoleBinding";
      break;
    case "roles":
      type = "Role";
      break;
    default:
      type = "none";
  }

  if (type === "Role" || type === "RoleBinding") {
    title = `Add a ${type} to ${namespace}`;
    route = h.ns(route);
  } else {
    title = `Add a ${type}`;
  }

  h.Vent.emit("rbac:form-dialog:open", {
    isEdit: false,
    open: true,
    type,
    title,
    icon: "glyphicons glyphicons-plus",
    type: type,
    onAction: function(form, callback) {
      h.fetch({
        method: "post",
        endpoint: "/" + route,
        body: JSON.stringify(form),
        success: function(u) {

          let x = u.context.result;
          h.Vent.emit("notification", {
            message: `The ${type} ${x.metadata.name} was successfully added`
          });

          h.Vent.emit("rbac:form-dialog:close");
          // self.props.closeFormDialog();

          if (callback && typeof callback === "function") {
            return callback();
          }
          return true;
        },
        error: function(a) {
          h.Vent.emit("request-error:confirm-box", a);

          h.Vent.emit("notification", {
            message: `Failed to add ${type}`
          });

          if (callback && typeof callback === "function") {
            return callback();
          }
          return true;
        }
      });
    }
  });

};
