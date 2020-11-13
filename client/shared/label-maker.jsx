"use strict";

import React from "react";

class LabelMaker extends React.Component {

  constructor(props) {
    super(props);

    var scope = "root";

    if (props.hasOwnProperty("scope")) {
      scope = props.scope;
    }

    this.state = {
      scope: scope,
      uid: props.uid,
      data: props.data,
      value: 0,
      hidden: true
    };
  }

  UNSAFE_componentWillReceiveProps(props) {
    var self = this;

    var scope = "root";

    if (props.hasOwnProperty("scope")) {
      scope = props.scope;
    }

    self.setState({
      uid: props.uid,
      scope: scope,
      data: props.data
    });
  }

  handleChange(e, index, value) {
    this.setState({
      value: value
    });
  }

  makeLabel(labels) {
    var self = this;

    var formatted = Object.keys(labels).map(function(key, i) {

      var val = labels[key];

      var separator = val.length > 0 ? <span className="label-split">=</span> : null;
      var tooltip = val.length > 0 ? `${key}=${val}` : key;

      let labelText = "";
      let scope = self.state.hasOwnProperty("scope")
        ? self.state.scope
        : false;

      let hidden = "";

      if (!self.props.hasOwnProperty("displayAll")) {
        if (self.state.hidden && i > 2) {
          hidden = "content-hide";
        }
      }

      switch (scope) {
        case "create":
          labelText = (
            <div
              data-tip
              data-balloon={tooltip}
              data-balloon-pos="up"
              key={i}
              className={`${hidden} label-pair`}
              style={{paddingLeft: 0}}>
              <span className="label-key">
                {key}
              </span>

              {separator}

              <span className="label-value">
                {val}
              </span>
            </div>
          );
          break;

        case "tag":
          labelText = (
            <div
              data-tip
              data-balloon={val}
              data-balloon-pos="up"
              key={i}
              className={`${hidden} label-pair-tag`}>
              <span className="label-value-tag">
                {val}
              </span>
            </div>
          );
          break;

        default:
          if (!self.props.hasOwnProperty("native")) {
            labelText = (
              <div
                data-tip
                data-balloon={tooltip}
                data-balloon-pos="up"
                key={i}
                className={`${hidden} label-pair`}
              >
                <span className="label-key">
                  {key}
                </span>
                {separator}
                <span className="label-value">
                {val}
                </span>
              </div>
            );
          } else {
            labelText = (
              <div
                title={tooltip}
                key={i}
                className={`${hidden} label-pair`}
              >
                <span className="label-key">
                  {key}
                </span>
                {separator}
                <span className="label-value">
                  {val}
                </span>
              </div>
            );
        }
      }

      return labelText;
    });

    return formatted;
  }

  render() {
    var entries = this.makeLabel(this.state.data, this.state.uid);

    if (entries.length === 0) {
      entries = <span className="labels-empty">No entries</span>;
    }

    let count = Number(Object.keys(this.state.data).length);
    let displayAll = this.props.hasOwnProperty("displayAll");

    let toggleMessage = this.state.hidden
      ? `+${count - 3} more..`
      : "less..";

    let toggleControl = (
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          this.setState({hidden: !this.state.hidden});
        }}
        className="label-toggle"
      >
        {toggleMessage}
      </div>
    );

    let toggle = count > 3 && !displayAll ? toggleControl : "";

    return (
      <div className="label-container">
        <div className="labels">
          {entries}
          {toggle}
        </div>
      </div>
    );
  }
}

export default LabelMaker;
