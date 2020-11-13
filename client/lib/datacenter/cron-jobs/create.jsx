import h from "../../helpers";

export default () => {
  h.Vent.emit("layout:manifest-dialog-simple:open", {
    open: true,
    icon: "csicon csicon-cron-jobs",
    title: "Create CronJob",
    type: "cronjobs-simple",
    help: "CronJob",
    endpoint: "cronjobs"
  });
};
