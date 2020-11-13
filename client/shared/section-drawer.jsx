import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import CsTooltip from "./cs-tooltip";
import ContainerTerminal from "./websockets/terminal";
import h from "../lib/helpers";

const useStyles = makeStyles(() => ({
  root: {
    display: "flex",
    position: "fixed",
    bottom: "10px",
    right: "20px",
    zIndex: 1000
  },
  drawer: {
    width: "100%",
    flexShrink: 0,
  },
  drawerPaper: {
    width: "100%",
    height: "25%",
    backgroundColor: "#31383d"
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: "20px",
    backgroundColor: "#31383d"
  },
  drawerHeaderTitle: {
    float: "left",
    marginLeft: "19px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "40px",
    marginBottom: "-10px",
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

export default function SectionDrawer() {
  const defaultContent = (
    <ContainerTerminal
      attach={false}
      type="shell"
    />
  );
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [icon, setIcon] = React.useState("csicon csicon-critical-stack-outline");
  const [name, setName] = React.useState("Developer Shell");
  const [content, setContent] = React.useState(defaultContent);

  useEffect(() => {
    h.Vent.addListener("section:drawer:content", (params) => {
      setContent(
        <ContainerTerminal
          attach={false}
          container={params.container}
          pod={params.pod}
        />
      );
      setName(params.container);
      setIcon("csicon csicon-containers");
      setOpen(true);
    });

    h.Vent.addListener("section:drawer:toggle", () => {
     setOpen(!open);
    });

    return function cleanup() {
      h.Vent.removeAllListeners("section:drawer:content");
      h.Vent.removeAllListeners("section:drawer:toggle");
    };
  });

  return (
    <div className={classes.root}>
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
            <i className={icon} />
            <span className={classes.drawerHeaderTitleText}>
              {name}
            </span>
            {name !== "Developer Shell" ?
            <span
              className={classes.drawerHeaderDefault}
              onClick={() => {
                setContent(defaultContent);
                setName("Developer Shell");
                setIcon("csicon csicon-critical-stack-outline");
              }}
            >
              (return to developer shell)
            </span> : null}
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
        {open ? content : null}
      </Drawer>
    </div>
  );
}
