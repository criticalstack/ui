"use strict";
import React from "react";
import h from "../lib/helpers";

class NoResult extends React.Component {

  constructor(props) {
    super(props);

    this.onResize = this.resizeLogic.bind(this);

    this.state = {
      style: {
        minHeight: window.outerHeight - 450
      }
    };
  }

  resizeLogic() {
    this.setState({
      style: {
        minHeight: window.outerHeight - 450
      }
    });
  }

  componentDidMount() {
    window.addEventListener("resize", this.onResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
  }

  handleClick() {
    h.Vent.emit("layout:manifest-dialog-simple:open", {
      open: true,
      icon: "glyphicons glyphicons-plus",
      title: "Deploy a Containerized App",
      type: "deployment-simple",
      route: "deployments"
    });

    h.Vent.emit("link", "/datacenter/deployments");
  }

  handleAppClick() {
    window.open("https://support.criticalstack.com", "_blank");
  }

  render() {

    var style = this.props.hasOwnProperty("style")
      ? this.props.style
      : this.state.style;

    var addClass = this.props.hasOwnProperty("addClass")
      ? this.props.addClass
      : "";

    var appClass = this.props.hasOwnProperty("appClass")
      ? this.props.appClass
      : "";

    let actionLink = this.props.hasOwnProperty("action") ? (
      <div className={`no-result-message-sub ${addClass} ${appClass}`}>
        {this.props.action}
      </div>
    ) : (
      <div className={`no-result-message-sub ${addClass} ${appClass}`}>
        You can
        <a onClick={this.handleClick}>
          deploy a containerized app
        </a>
        &nbsp;or select another namespace
      </div>
    );

    return (
      <div
        className={`no-result ${addClass} ${appClass}`}
        style={style}>

        <div className="no-result-circle">
          <i className={`${this.props.icon} no-result-icon`} />
        </div>

        <div className={`no-result-message-main ${addClass} ${appClass}`}>
          {this.props.body}
        </div>

        {actionLink}

      </div>
    );
  }
}

export default NoResult;
