import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import IconButton from "@material-ui/core/IconButton";
import _ from "lodash";

const styles = makeStyles(() => ({
  tooltip: {
    background: "#000",
    fontSize: "14px",
    padding: "10px",
    maxWidth: "400px"
  },
  arrow: {
    color: "#000"
  }
}));

const icons = {
  "Error": "csicon csicon-events offline",
  "Not ready": "csicon csicon-events offline",
  "Pending": "glyphicons glyphicons-refresh table-loading",
  "Problem": "csicon csicon-events offline",
  "Ready": "glyphicons glyphicons-circle-check active",
  "Running": "glyphicons glyphicons-circle-check active",
  "Succeeded": "glyphicons glyphicons-check table-job-complete",
  "Terminating": "glyphicons glyphicons-refresh table-loading"
};

const CsTooltip = (props) => {
  const classes = styles();
  const action = _.get(props, "action", () => {
    return false;
  });
  let icon = _.get(props, "icon", "");
  icon = _.get(icons, icon, icon);
  const style = _.get(props, "style", false)
    ? props.style
    : {
      fontSize: "24px"
    };

  return (
    <Tooltip classes={classes} title={props.text} arrow>
      <IconButton
        aria-label={props.text}
        onClick={action}
      >
        <i
          className={icon}
          style={style}
        />
      </IconButton>
    </Tooltip>
  );
};

export default CsTooltip;
