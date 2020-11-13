import h from "../../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "csicon csicon-deployments",
    title: "Create Deployment",
    type: "deployment-simple",
    endpoint: "deployments"
  });
};
