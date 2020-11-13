"use strict";

import React from "react";
import { findDOMNode } from "react-dom";
import { withStyles } from "@material-ui/core/styles";
import Popover from "@material-ui/core/Popover";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import h from "../lib/helpers";

const styles = {
  paper: {
    padding: "16px",
    width: "300px"
  }
};

class SectionEditorSelect extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      anchorEl: null,
      value: props.value || "",
      data: [],
      updated: false
    };

    this.button = React.createRef();
  }

  componentDidUpdate(prevProps) {
    if (this.props.value !== prevProps.value) {
      this.setState({
        value: this.props.value
      });
      return false;
    }
  }

  handleOpen(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      open: true,
      anchorEl: findDOMNode(this.button.current)
    });
  };

  handleClick(value) {
    let action = this.props.hasOwnProperty("action")
      ? this.props.action
      : false;

    if (action) {
      action(value);
    }

    this.setState({
      open: false,
      value: value,
    });
  };

  handleRequestClose(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      open: false
    });
  };

  render() {
    let self = this;
    let menuItems = [];

    menuItems = self.props.data.map(function(d, i) {
      let activeColor = self.state.value === d.version ? "#0078e7" : "#545454";

      return (
        <ListItem
          key={i}
          onClick={() => self.handleClick(d.data.metadata.resourceVersion)}
          className="menu-entry-root"
        >
          <ListItemText
            className="menu-entry"
            style={{
              color: activeColor
            }}
            primary={`${d.timestamp}: ${d.version}`}
            secondary={`${d.updatedBy}`}
          />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              title="download"
              aria-label="download"
              onClick={() => h.view.helpers.resourceDownload(d.data)}
            >
              <i className="glyphicons glyphicons-save"
                style={{
                  fontSize: "24px"
                }}
              />
           </IconButton>
         </ListItemSecondaryAction>
        </ListItem>
      );
    });

    let buttonClass = self.props.hasOwnProperty("buttonClass")
      ? self.props.buttonClass
      : "btn-ok";

    let prefix = self.props.hasOwnProperty("prefix")
      ? self.props.prefix
      : "";

    return (
      <div style={{
        display: "inline-block",
        color: "#fff"
      }}>
        {prefix}
        <Button
          variant="contained"
          color="primary"
          ref={this.button}
          onClick={(e) => self.handleOpen(e)}
          aria-label="change resource version"
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
          <List>
            {menuItems}
          </List>
        </Popover>
      </div>
    );
  }
}

export default withStyles(styles)(SectionEditorSelect);
