import h from "../../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "swollicon swollicon-swoll_icon",
    title: "Create Trace",
    type: "trace-simple",
    // help: "Trace",
    endpoint: "traces.tools.swoll.criticalstack.com"
  });
};
