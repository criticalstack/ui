"use strict";

import React from "react";
import { findDOMNode } from "react-dom";
import { withStyles } from "@material-ui/core/styles";
import Popover from "@material-ui/core/Popover";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Button from "@material-ui/core/Button";

const styles = {
  paper: {
    padding: "16px",
    width: "300px"
  }
};

class ResourceActionSelect extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      anchorEl: null,
      value: "Create StackApp",
      updated: false
    };

    this.button = React.createRef();
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
    let entries = [
      {
        name: "Create StackApp",
        action: () => {}
      },
      {
        name: "Export",
        action: () => {}
      },
      {
        name: "Label",
        action: () => {}
      },
      {
        name: "Copy to namespace",
        action: () => {}
      }
    ];

    menuItems = entries.map(function(d, i) {
      let activeColor = self.state.value === d.name ? "#0078e7" : "#545454";

      return (
        <ListItem
          key={i}
          onClick={() => self.handleClick(d.name)}
          className="menu-entry-root"
        >
          <ListItemText
            className="menu-entry"
            style={{
              color: activeColor
            }}
            primary={d.name}
          />
        </ListItem>
      );
    });

    return (
      <div style={{ height: "60px" }}>
        <div style={{ position: "absolute", left: "-4px" }}>
          <Button
            variant="contained"
            color="primary"
            ref={this.button}
            onClick={(e) => self.handleOpen(e)}
            aria-label="select action"
            className="dialog-button btn-header"
            disableRipple={true}
            disableFocusRipple={true}
          >
          {self.state.value}
          <i style={{ marginLeft: "15px" }} className="glyphicons glyphicons-chevron-down" />
          </Button>
        </div>

        <Popover
          open={self.state.open}
          anchorEl={self.state.anchorEl}
          anchorReference="anchorEl"
          anchorOrigin={{horizontal: "left", vertical: "top"}}
          transformOrigin={{horizontal: "left", vertical: "bottom"}}
          onClose={(e) => this.handleRequestClose(e)}
          classes={{
            paper: this.props.classes.paper
          }}
        >
          <List>
            {menuItems}
          </List>
        </Popover>

        <div style={{ position: "absolute", right: "10px" }}>
          <Button
            variant="contained"
            color="primary"
            ref={this.button}
            aria-label="perform action"
            className="btn-header"
            disableRipple={true}
            disableFocusRipple={true}
          >
            OK
            <i style={{ marginLeft: "15px" }} className="glyphicons glyphicons-check" />
          </Button>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(ResourceActionSelect);
