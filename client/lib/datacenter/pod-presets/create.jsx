import h from "../../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "csicon csicon-pod-presets",
    title: "Create PodPreset",
    type: "podpreset-simple",
    help: "PodPreset",
    endpoint: "podpresets"
  });
};
