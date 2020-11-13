import h from "../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "glyphicons glyphicons-plus",
    title: "Create a StackApp",
    type: "stackapp-simple",
    endpoint: "stackapps"
  });
};
