"use strict";

import React from "react";
import h from "../../../helpers";

class TableTitle extends React.Component {

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

    render() {
      return (
          <div className="content-title">
            {this.renderTitle()}
          </div>
      );
    }
  }

  export default TableTitle;
