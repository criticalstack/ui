import h from "../../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "csicon csicon-daemon-sets",
    title: "Create DaemonSet",
    type: "daemonset-simple",
    help: "DaemonSet",
    endpoint: "daemonsets"
  });
};
