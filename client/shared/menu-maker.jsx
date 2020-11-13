"use strict";

import React from "react";
import { findDOMNode } from "react-dom";
import Popover from "@material-ui/core/Popover";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import Switch from "@material-ui/core/Switch";
import _ from "lodash";
import { withRouter } from "react-router-dom";
import { RBACContext } from "../shared/context/rbac";

class MenuMaker extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      data: props.hasOwnProperty("data") ? props.data : {},
      raw: props.hasOwnProperty("raw") ? props.raw : {},
      path: props.hasOwnProperty("path") ? props.path : false,
      open: false,
      anchorEl: null
    };

    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.handleRequestClose = this.handleRequestClose.bind(this);
  }

  UNSAFE_componentWillReceiveProps(props) {
    var self = this;

    self.setState({
      data: props.hasOwnProperty("data") ? props.data : {},
      raw: props.hasOwnProperty("raw") ? props.raw : {},
      path: props.hasOwnProperty("path") ? props.path : false
    });
  }

  handleButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      open: true,
      anchorEl: findDOMNode(this.button),
    });
  };

  handleRequestClose(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      open: false
    });
  };

  disableClick(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  makeMenuEntry(entries) {
    let self = this;

    let formatted = Object.keys(entries).map(function(key, i) {
      let entry = entries[key];

      if (!entry) {
        return;
      }

      let ignoreEntry = entry.hasOwnProperty("ignore") ? true : false;

      if (ignoreEntry) {
        if (entry.ignore) {
          return;
        }
      }

      if (!entry.hasOwnProperty("name")) {
        return;
      }

      let itemClass = "menu-entry";

      let divider = "";
      if (entry && entry.hasOwnProperty("divider")) {
        divider = ` ${entry.divider}`;
      }

      if (self.state.path) {
        let path = self.state.path.split("/");
        let index = 2;
        if (path.length === 4) {
          index = 3;
        }

        if (path[index] === entry.ident) {
          itemClass = "menu-entry active";
        }
      }

      let click = ((entry.hasOwnProperty("link") && _.isFunction(entry.link)) ? function(e) {
        e.preventDefault();
        e.stopPropagation();
        entry.link(e, self, self.state.raw);

        if (!entry.hasOwnProperty("menuOpen")) {
          self.handleRequestClose(e);
        }

        return false;
      } : function(e) {
        e.preventDefault();
        e.stopPropagation();
        self.handleRequestClose(e);
        return false;
      });

      if (entry.hasOwnProperty("disabled")) {
        click = function(e) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };
      }

      let listItem;

      if (entry.hasOwnProperty("toggle")) {
        listItem = <ListItem
          key={`${entry.name}-${i}`}
          onClick={click}
          disabled={entry.hasOwnProperty("disabled") ? true : false}
          className={`menu-entry-root${divider}`}
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
        </ListItem>;

      } else if (entry.hasOwnProperty("component")) {

        listItem = <ListItem
          key={`${entry.name}-${i}`}
          onClick={(e) => e.stopPropagation()}
          disabled={entry.hasOwnProperty("disabled") ? true : false}
          className={`menu-entry-root${divider}`}
        >
          <ListItemIcon>
            {entry.icon}
          </ListItemIcon>
          {entry.component}
        </ListItem>;

      } else if (entry.hasOwnProperty("resource")) {

        let hasAccess = _.get(self.context.access, [entry.resource, entry.verb], true);

        listItem = <ListItem
          key={`${entry.name}-${i}`}
          onClick={hasAccess ? click : self.disableClick}
          disabled={!hasAccess}
          className={`menu-entry-root${divider}`}
        >
          <ListItemIcon>
            <i className={`${entry.icon} ${itemClass}`} />
          </ListItemIcon>
          <ListItemText
            className={itemClass}
            primary={entry.name}
          />
        </ListItem>;
      } else {
        listItem = <ListItem
          key={`${entry.name}-${i}`}
          onClick={click}
          disabled={entry.hasOwnProperty("disabled") ? true : false}
          className={`menu-entry-root${divider}`}
        >
          <ListItemIcon>
            <i className={`${entry.icon} ${itemClass}`} />
          </ListItemIcon>
          <ListItemText
            className={itemClass}
            primary={entry.name}
          />
        </ListItem>;
      }

      return listItem;
    });

    return formatted;
  }

  render() {
    var self = this;
    var menuData = this.state.data;
    var type = menuData.args.hasOwnProperty("type") ? menuData.args.type : "";
    var entries = this.makeMenuEntry(menuData.entries);
    var icon = menuData.args.icon;
    var button, menu;

    if (menuData.args.hasOwnProperty("label")) {
      if (menuData.args.hasOwnProperty("sub-menu")) {
        var pathParts = this.state.path.split("/");

        var isActive = "";

        Object.keys(menuData.entries).map(function(key) {
          if (menuData.entries[key].ident === pathParts[pathParts.length - 1]) {
            isActive = " active";
          }
        });

        // Submenu menus
        button = (
          <Button
            aria-label={menuData.args.ariaLabel}
            disableFocusRipple={true}
            disableRipple={true}
            ref={node => {
              this.button = node;
            }}
            onClick={self.handleButtonClick}
            className={`icon-text-button${isActive}`}>
            {menuData.args.label}
            <i className={`${menuData.args.icon} icon-text-icon`} />
          </Button>
        );

      } else {

        // content title buttons
        button = (
          <Button
            aria-label={menuData.args.ariaLabel}
            disableFocusRipple={true}
            disableRipple={true}
            variant="contained"
            ref={node => {
              this.button = node;
            }}
            className={`dialog-button btn-${type}`}
            onClick={self.handleButtonClick}>
            <i className={`${menuData.args.icon} dialog-button-icon btn-${type}`} />
            {menuData.args.label}
          </Button>
        );
      }

    } else {

      // table rows and cards - icon only.
      button = (
        <IconButton
          aria-label={menuData.args.ariaLabel}
          disableRipple={true}
          ref={node => {
            this.button = node;
          }}
          onClick={self.handleButtonClick}
          className={type}
        >
          <i className={`${icon} btn-${type}`} />
        </IconButton>
      );

    }

    menu = (
      <>
        {button}
        <Popover
          open={self.state.open}
          anchorEl={self.state.anchorEl}
          anchorReference="anchorEl"
          anchorOrigin={{horizontal: "left", vertical: "bottom"}}
          onClose={self.handleRequestClose}
        >
          <List>
            {entries}
          </List>
        </Popover>
      </>
    );

    return menu;

  }
}

MenuMaker.contextType = RBACContext;

export default withRouter(MenuMaker);
