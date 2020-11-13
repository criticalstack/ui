"use strict";

import React from "react";
import MenuMaker from "../../shared/menu-maker.jsx";
import Button from "@material-ui/core/Button";
import h from "../helpers";
import _ from "lodash";

class ContentTitle extends React.Component {
  constructor(props) {
    super(props);
    let self = this;

    self.state = {
      count: props.count
    };
  }

  componentDidMount() {
    let self = this;

    h.Vent.addListener("content:title:update:count", function(count) {
      if (count !== self.state.count) {
        self.setState({
          count: count
        });
      }
    });
  }

  componentDidUpdate(prevState) {
    if (this.props.count !== prevState.count) {
      this.setState({
        count: this.props.count
      });
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("content:title:update:count");
  }

  renderTitle() {
    let titleClass = "title no-buttons";

    let html = (
      <span className={titleClass} key="content-title">
        <span className="content-icon">
          <i className={this.props.icon} />
        </span>
        <span className="content-label">
          {this.props.title}
          <span>
            {this.props.count}
          </span>
        </span>
      </span>
    );
    return html;
  }

  toggleMenuItems() {
    let self = this;
    let entries = self.props.menu.hasOwnProperty("entries")
      ? self.props.menu.entries
      : {};

    Object.keys(entries).map(function(key) {
      if (entries[key].name === "Edit Mode") {
        if (self.state.count === 0) {
          entries[key].disabled = true;
        } else {
          delete entries[key].disabled;
        }
      }

      if (entries[key].name === "All Events") {
        let hasAccess = _.get(self.context.access, ["events", "list"], true);
        if (!hasAccess) {
          entries[key].disabled = true;
        }
      }
    });
  }

  render() {
    this.toggleMenuItems();
    let menu = null;
    let noButtons = this.props.hasOwnProperty("noButtons")
      ? this.props.noButtons
      : false;

    if (!noButtons) {
      // options button
      menu = Object.keys(this.props.menu).length > 0
        ? <MenuMaker data={this.props.menu} />
        : "";
    }

    return (
      <div className="content-title">
        {this.renderTitle()}
        <div className="title-menu-options">
          <Button
            disableFocusRipple={true}
            disableRipple={true}
            variant="contained"
            onClick={() => {
              h.Vent.emit("create:drawer:toggle", {
                context: this.props
              });
            }}
            className={"dialog-button btn-create"}
          >
            <i className={"glyphicons glyphicons-plus dialog-button-icon btn-create"} />
            Create
          </Button>
          {menu}
        </div>
      </div>
    );
  }
}

export default ContentTitle;
