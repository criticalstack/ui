import h from "../../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "csicon csicon-resource-quotas",
    title: "Create ResourceQuota",
    type: "resourcequotas-simple",
    help: "ResourceQuota",
    endpoint: "resourcequotas"
  });
};
