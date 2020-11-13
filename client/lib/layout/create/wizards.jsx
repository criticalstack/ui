import React from "react";
import { withRouter } from "react-router";
import { makeStyles } from "@material-ui/core/styles";
import h from "../../helpers";
import resourceMetadata from "../../../shared/manifests/resource-metadata";

const useStyles = makeStyles(() => ({
  root: {
    position: "absolute",
    top: "134px",
    bottom: "20px",
    left: "20px",
    right: "20px"
  },
  content: {
    padding: "40px",
    overflowY: "auto",
    height: "100%"
  },
  entryParent: {
    width: "280px",
    borderRadius: "10px",
    border: "1px solid #d4d4d4",
    boxShadow: "0 2px 4px rgba(0,0,0,.1)",
    padding: "0.5rem 1rem",
    float: "left",
    position: "relative",
    marginLeft: 0,
    marginTop: 20,
    marginBottom: 20,
    marginRight: 40,
    transition: ".3s",
    animation: "fadein 1s"
  },
  entry: {
    position: "relative",
    width: "280px",
    alignItems: "center",
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "48px 260px",
    width: "340px",
    height: "60px",
    userSelect: "none"
  },
  entryIcon: {
    marginLeft: "10px",
    marginRight: "10px",
    color: "#2196f3",
    fontSize: "24px",
    width: "30px",
    textAlign: "center"
  },
  entryLabel: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: "20px"
  },
  link: {
    color: "#0077e7",
    cursor: "pointer",
    textDecortaion: "underline",
    marginRight: "5px",
    marginLeft: "5px"
  }
}));

export default withRouter(function Wizards(props) {
  const classes = useStyles();
  let wizards = [];
  Object.keys(resourceMetadata).filter((key) => {
    if (resourceMetadata[key].hasOwnProperty("wizard")) {
      return true;
    }
    return false;
  }).map((entry) => {
    const resource = resourceMetadata[entry];
    const index = window.location.pathname.split("/").pop();
    let path = resource.hasOwnProperty("menu") ? resource.menu : resource.route;
    if (resource.hasOwnProperty("path")) {
      path = resource.path;
    }

    const thisContext = index === path ? true : false;

    const wizard = (
      <div
        key={index}
        className={`${classes.entryParent} wizard-resource scale`}
        style={{
          backgroundColor: thisContext ? "aliceblue" : "none"
        }}
        onClick={() => resource.wizard(props)}
      >
        <div
          className={classes.entry}
        >
          <i className={`${classes.entryIcon} ${resource.icon}`} />
          <div className={classes.entryLabel}>
            {entry}
          </div>
        </div>
      </div>
    );

    if (thisContext) {
      wizards.unshift(wizard);
    } else {
      wizards.push(wizard);
    }
  });

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        <div>
          These wizards are intended to fast track creation of some of the more common resource types.
          If what you are looking for isn't here, you also have the option to use the
          <span
            className={classes.link}
            onClick={() => h.Vent.emit("create-content:tab-click", 1)}
          >
            editor
          </span>or
          <span
            className={classes.link}
            onClick={() => h.Vent.emit("create-content:tab-click", 2)}
          >
            upload
          </span>manifests from the other tabs above.
        </div>
        {wizards}
      </div>
    </div>
  );
});
