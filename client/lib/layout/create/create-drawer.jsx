import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import CsTooltip from "../../../shared/cs-tooltip";
import h from "../../helpers";
import CreateContent from "./create-content";

const useStyles = makeStyles(() => ({
  drawerPaper: {
    width: "100%",
    height: "100%",
    backgroundColor: "#31383d",
    overflowY: "hidden"
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 7px 10px 20px",
    backgroundColor: "#31383d"
  },
  drawerHeaderTitle: {
    display: "flex",
    alignItems: "center",
    fontSize: "40px",
    color: "#fff"
  },
  drawerHeaderDefault: {
    marginLeft: "15px",
    fontSize: "12px",
    cursor: "pointer"
  },
  drawerHeaderTitleText: {
    marginLeft: "15px",
    fontSize: "18px"
  }
}));

export default function CreateDrawer() {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    h.Vent.addListener("create:drawer:toggle", () => {
     setOpen(!open);
    });

    return function cleanup() {
      h.Vent.removeAllListeners("create:drawer:toggle");
    };
  });

  return (
    <div className={`${classes.root} create-drawer`}>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="bottom"
        open={open}
        classes={{
          paper: classes.drawerPaper
        }}
      >
        <div className={classes.drawerHeader}>
          <div className={classes.drawerHeaderTitle}>
            <i className="csicon csicon-critical-stack-outline" />
            <span className={classes.drawerHeaderTitleText}>
              Create resources
            </span>
          </div>
          <CsTooltip
            text="close"
            action={() => {
              setOpen(false);
            }}
            icon="glyphicons glyphicons-chevron-down"
            style={{
              color: "#fff",
              fontSize: "30px"
            }}
          />
        </div>
        {open ? <CreateContent /> : null}
      </Drawer>
    </div>
  );
}
