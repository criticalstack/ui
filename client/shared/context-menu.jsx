import React from "react";
import Popover from "@material-ui/core/Popover";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Switch from "@material-ui/core/Switch";
import menus from "../shared/manifests/menu-data";
import h from "../lib/helpers";
import _ from "lodash";
import { RBACContext } from "../shared/context/rbac";

class ContextMenu extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      args: props.args
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.args !== prevProps.args) {
      this.setState({
        args: this.props.args
      });
    }
  }

  handleRequestClose(e) {
    e.preventDefault();
    e.stopPropagation();

    this.state.args.callback();

    this.setState({
      args: {
        open: false
      }
    });
  };

  handleClick(e) {
    this.handleRequestClose(e);
  }

  makeManySelectedEntries(menu, multi) {
    let args = this.state.args;
    let entries = [];
    let noDelete = menu.indexOf("noDelete");

    if (multi) {
      entries = menu.map((entry, i) => {
        return (
          <ListItem
            key={i}
            button
            className="menu-entry"
            onClick={entry.action}
          >
            <ListItemIcon>
              <i className={entry.icon} />
            </ListItemIcon>
            <ListItemText
              primary={entry.name}
              secondary={`${args.selected} items`}
            />
          </ListItem>
        );
      });
    }

    if (noDelete === -1) {
      entries.push(
        <ListItem
          key={-1}
          button
          className="menu-entry"
          onClick={() => {
            h.view.helpers.resourceDeleteMultiple(args.route, args.type, "Deleted selected items", false);
          }}
        >
          <ListItemIcon>
            <i className="glyphicons glyphicons-bin menu-icon-warn menu-icon" />
          </ListItemIcon>
          <ListItemText
            primary="Delete selected"
            secondary={`${args.selected} items`}
          />
        </ListItem>
      );
    }

    if (noDelete !== -1) {
      entries.splice(noDelete, 1);
    }

    return entries;
  }

  makeEntries(menu) {
    let entries = menu.map((entry, i) => {
      let listItem;

      if (entry.hasOwnProperty("toggle")) {
        listItem = (
          <ListItem
            key={i}
            onClick={entry.action}
            disabled={entry.hasOwnProperty("disabled") ? true : false}
            className="menu-entry-root"
          >
            <ListItemIcon>
              <Switch
                checked={entry.toggle.state}
                className="switch-selector-root"
              />
            </ListItemIcon>
            <ListItemText
              className= "switch-label-root"
              primary={entry.name}
            />
          </ListItem>
        );
      } else if (entry.hasOwnProperty("resource")) {
        let hasAccess = _.get(this.context.access, [entry.resource, entry.verb], true);

        listItem = (
          <ListItem
            key={i}
            button
            className="menu-entry"
            onClick={entry.action}
            disabled={!hasAccess}
          >
            <ListItemIcon>
              <i className={entry.icon} />
            </ListItemIcon>
            <ListItemText
              primary={entry.name}
            />
          </ListItem>
        );
      } else {
        listItem = (
          <ListItem
            key={i}
            button
            className="menu-entry"
            onClick={entry.action}
            disabled={entry.hasOwnProperty("disabled") ? true : false}
          >
            <ListItemIcon>
              <i className={entry.icon} />
            </ListItemIcon>
            <ListItemText
              primary={entry.name}
            />
          </ListItem>
        );
      }

      return listItem;
    });

    return (
      <div>
        {entries}
      </div>
    );
  }

  render() {
    let args = this.state.args;
    if (args.open === false) {
      return false;
    }

    let type = this.state.args.type.replace("-table", "");
    let menu = false;
    let multi = args.selected > 1 ? true : false;

    if (args.menu) {
      if (multi) {
        menu = args.menu.multi || false;
      } else {
        menu = args.menu.menu;
      }
    } else {
      menu = typeof menus[type] === "function" ? menus[type](args.data, multi) : [];
    }

    if (!menu) {
      return false;
    }

    let entries;

    if (multi) {
      entries = this.makeManySelectedEntries(menu, multi);
    } else {
      entries = this.makeEntries(menu);
    }

    return (
      <Popover
        open={args.open}
        anchorPosition={{
          left: args.x,
          top: args.y
        }}
        anchorReference="anchorPosition"
        anchorOrigin={{
          horizontal: "left",
          vertical: "bottom"
        }}
        onContextMenu={(e) => this.handleRequestClose(e)}
        onClick={(e) => this.handleRequestClose(e)}
        onClose={(e) => this.handleRequestClose(e)}
      >
        <List
          dense={true}
          className={`menu-parent ${type}`}
        >
          {entries}
        </List>
      </Popover>
    );
  }
}

ContextMenu.contextType = RBACContext;

export default ContextMenu;
