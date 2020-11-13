import h from "../../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "csicon csicon-limit-ranges",
    title: "Create LimitRange",
    type: "limitranges-simple",
    help: "LimitRange",
    endpoint: "limitranges"
  });
};
