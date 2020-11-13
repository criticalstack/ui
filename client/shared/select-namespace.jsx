"use strict";

import React from "react";
import h from "../lib/helpers";
import Session from "../lib/helpers/session";
import { findDOMNode } from "react-dom";
import _ from "lodash";
import { withStyles } from "@material-ui/core/styles";
import Popover from "@material-ui/core/Popover";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Button from "@material-ui/core/Button";
import { RBACContext } from "../shared/context/rbac";
import ButtonMaker from "./button-maker";

const styles = {
  paper: {
    padding: "16px",
    width: "300px"
  }
};

class SelectNamespace extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      anchorEl: null,
      matches: props.namespaces || [],
      namespaces: props.namespaces || [],
      value: Session.namespace()
    };

    this.button = React.createRef();
  }

  componentDidUpdate(prevProps) {
    if (this.props.namespaces !== prevProps.namespaces) {
      this.setState({
        matches: this.props.namespaces,
        namespaces: this.props.namespaces
      });

      return true;
    }

    return false;
  }

  handleOpen(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      open: true,
      anchorEl: findDOMNode(this.button.current)
    });
  };

  handleClick(namespace) {
    h.Vent.emit("settings:namespace:settings", namespace);

    let action = this.props.hasOwnProperty("action")
      ? this.props.action
      : false;

    if (action) {
      action(namespace);
    }

    this.setState({
      open: false,
      value: namespace,
      matches: this.state.namespaces,
    });
  };

  handleCreate() {
    h.Vent.emit("layout:manifest-dialog-simple:open", {
      open: true,
      icon: "glyphicons glyphicons-plus",
      title: "Add a new namespace",
      type: "namespaces-simple",
      endpoint: "namespaces",
      namespaced: false
    });
  }

  handleRequestClose(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      open: false,
      matches: this.state.namespaces
    });
  };

  handleFilter(e) {
    let self = this;
    let needle = e.target.value;
    let namespaces = this.state.namespaces;
    let matches = this.state.namespaces;

    matches = namespaces.filter(ns => ns.metadata.name.toLowerCase().indexOf(needle.toLowerCase()) > -1);

    this.setState({
      matches: matches
    }, function() {
      self.filterInput.focus();
    });
  }

  render() {
    let self = this;
    let menuItems = [];

    menuItems = self.state.matches.map(function(ns) {
      let label = Session.namespace() === ns.metadata.name
        ? `${ns.metadata.name}`
        : ns.metadata.name;

      return (
        <ListItem
          key={ns.metadata.uid}
          onClick={() => self.handleClick(label)}
          className="menu-entry-root"
        >
          <ListItemText
            className={`${label === self.state.value ? "menu-entry active" : "menu-entry"}`}
            primary={label}
          />
        </ListItem>
      );
    });

    let count = self.state.matches.length;
    let buttonClass = self.props.hasOwnProperty("buttonClass")
      ? self.props.buttonClass
      : "btn-ok";

    let prefix = self.props.hasOwnProperty("prefix")
      ? self.props.prefix
      : "";

    let button = [
      {
        type: "create",
        action: () => {
          self.handleCreate();
        }
      }
    ];

    return (
      <div style={{display: "inline-block"}}>
        {prefix}
        <Button
          variant="contained"
          color="primary"
          ref={this.button}
          onClick={(e) => self.handleOpen(e)}
          aria-label="change namespace"
          className={`dialog-button ${buttonClass}`}
          disableRipple={true}
          disableFocusRipple={true}
        >
          {self.state.value}
          <i
            style={{
              marginLeft: "15px",
            }}
            className="glyphicons glyphicons-chevron-down"
          />
        </Button>

        <Popover
          open={self.state.open}
          anchorEl={self.state.anchorEl}
          anchorReference="anchorEl"
          anchorOrigin={{horizontal: "left", vertical: "top"}}
          onClose={(e) => this.handleRequestClose(e)}
          classes={{
            paper: this.props.classes.paper
          }}
        >
          <div>
            <input
              ref={
                node => {
                  self.filterInput = node;
                }
              }
              className="change-namespace-filter-input"
              type="text"
              onChange={(e) => self.handleFilter(e)}
              autoFocus
              placeholder="Filter"
            />
            <i className="glyphicons glyphicons-filter change-namespace-filter-icon" />
          </div>
          {
            _.get(this.context.access, ["namespaces", "create"], true) && (
              <ButtonMaker
                buttons={button}
                parentStyle={{
                  float: "left",
                  marginLeft: "-15px",
                  marginBottom: "10px"
                }}
                label="Create Namespace"
                icon="glyphicons glyphicons-plus"
              />
            )
          }
          <div
            style={{
              float: "right",
              color: "#c9c9c9",
              marginBottom: "10px"
            }}
          >
            {`${count} match${count === 1 ? "" : "es"}`}
          </div>
          {menuItems}
          {this.props.error && (
            <div style={{
              clear: "both",
              textAlign: "center",
              padding: "15px"
            }}>
            <div className="icon-text" style={{display: "inline-block"}}>
            <i className="glyphicons glyphicons-circle-empty-alert icon-red"/>
              Error loading namespaces
            </div>
          </div>
          )}
        </Popover>
      </div>
    );
  }
}

SelectNamespace.contextType = RBACContext;

export default withStyles(styles)(SelectNamespace);
