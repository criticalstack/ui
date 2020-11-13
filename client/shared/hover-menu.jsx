import React from "react";
import { withStyles } from "@material-ui/core/styles";
import menus from "../shared/manifests/menu-data";
import _ from "lodash";
import { RBACContext } from "../shared/context/rbac";
import CsTooltip from "../shared/cs-tooltip";

const styles = {
  cardParent: {
    display: "flex",
    position: "absolute",
    overflowY: "hidden",
    paddingLeft: "60px",
    top: "5px",
    right: "6px",
    zIndex: 10

  },
  cardContent: {
    background: "#ffffff",
    borderLeft: "1px dashed #c9c9c9",
    boxShadow: "-27px 0px 25px -2px rgba(255,255,255,1)",
    paddingLeft: "10px"
  },
  card1Parent: {
    display: "flex",
    position: "absolute",
    overflowY: "hidden",
    paddingLeft: "60px",
    top: 0,
    right: "15px",
    zIndex: 10
  },
  card1Content: {
    background: "#ffffff",
    borderLeft: "1px dashed #c9c9c9",
    paddingLeft: "10px"
  },
  rowParent: {
  },
  rowContent: {
    position: "absolute",
    top: "8px",
    right: "10px",
    background: "#ffffff",
    paddingLeft: "1px",
    paddingRight: "1px",
    border: "1px solid #dedede",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,.1)"
  },
  icon: {
    fontSize: "20px!important",
    margin: "0!important",
    color: "#333!important"
  },
  iconDisabled: {
    fontSize: "20px!important",
    margin: "0!important",
    color: "#999!important",
    cursor: "default"
  }
};

class HoverMenu extends React.Component {
  makeSimpleEntries(menu) {
    const classes = this.props.classes;
    const rootClass = _.get(this.props, "variant", "card");
    // we could pass in as a prop here but I think
    // limiting to these 3 probably makes sense
    const allow = [
      "Download",
      "Edit",
      "Labels"
    ];

    let buttons = menu.filter((entry) => {
      if (allow.includes(entry.name)) {
        return true;
      }
      return false;
    }).map((entry) => {
      let button;

      let hasAccess = _.get(this.context.access, [entry.resource, entry.verb], true);
      let action = hasAccess
        ? entry.action
        : () => {
          return false;
        };

      button = (
        <CsTooltip
          key={entry.name}
          text={entry.name}
          action={action}
          icon={`${entry.icon} ${hasAccess ? classes.icon : classes.iconDisabled}`}
        />
      );

      return button;
    });

    return (
      <div className={classes[`${rootClass}Parent`]}>
        <div className={classes[`${rootClass}Content`]}>
          {buttons}
        </div>
      </div>
    );
  }

  render() {
    const exclude = [
      "containers",
      "mp-installed",
      "mp-popular",
      "mp-dryrun",
      "sub-dryrun",
      "rbac-access",
      "releases",
      "sub-Rules",
      "sub-secrets",
      "sub-Subjects",
      "users",
      "component-statuses",
      "events"
    ];

    let { type, data } = this.props;
    let menu = exclude.includes(type) ? false : true;

    if (!menu) {
      return false;
    }

    menu = typeof menus[type] === "function" ? menus[type](data, false) : menus["generic-menu"](data, false);

    return this.makeSimpleEntries(menu);
  }
}

HoverMenu.contextType = RBACContext;

export default withStyles(styles)(HoverMenu);
