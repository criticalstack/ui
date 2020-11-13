"use strict";

import React from "react";

class SelectorMaker extends React.Component {

  constructor(props) {
    super(props);

    var scope = "root";

    if (props.hasOwnProperty("scope")) {
      scope = props.scope;
    }

    var data = props.data.hasOwnProperty("matchLabels") ? props.data.matchLabels : props.data;

    this.state = {
      uid: props.uid,
      scope: scope,
      data: data,
      value: 0,
      current: {
        key: "",
        value: ""
      },
      hidden: true
    };
  }

  UNSAFE_componentWillReceiveProps(props) {
    var self = this;

    var scope = "root";

    if (props.hasOwnProperty("scope")) {
      scope = props.scope;
    }

    var data = props.data.hasOwnProperty("matchLabels") ? props.data.matchLabels : props.data;

    self.setState({
      uid: props.uid,
      scope: scope,
      data: data
    });
  }

  handleChange(e, index, value) {
    this.setState({
      value: value
    });
  }

  makeIcon(selectors) {
    var len = Number(Object.keys(selectors).length);
    return (
      <div className="selector-badge">
        <i className="glyphicons glyphicons-tag"></i>
        <span>{len}</span>
      </div>
    );
  }

  makeSelector(selectors) {
    var self = this;

    var formatted = Object.keys(selectors).map(function(key, i) {

      var val = selectors[key];
      var separator = val.length > 0 ? <span className="selector-split">=</span> : null;
      var tooltip = val.length > 0 ? `${key}=${val}` : key;

      let hidden = "";

      if (!self.props.hasOwnProperty("displayAll")) {
        if (self.state.hidden && i > 2) {
          hidden = "content-hide";
        }
      }

      var selectorText = self.state.scope === "create" ?
        <div
          data-tip
          data-balloon={tooltip}
          data-balloon-pos="up"
          key={i}
          className={`${hidden} selector-pair`}>
          <span className="selector-key">
            {key}
          </span>

          {separator}

          <span className="selector-value">
            {val}
          </span>
        </div>
      :
        <div data-tip
          title={tooltip}
          key={i}
          className={`${hidden} selector-pair`}
        >
          <span className="selector-key">
            {key}
          </span>

        {separator}

        <span className="selector-value">
          {val}
        </span>
      </div>;

      return selectorText;
    });

    return formatted;
  }

  render() {
    var entries = this.makeSelector(this.state.data);
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
      <div className="selector-container">
        <div className="selectors">
          {entries}
          {toggle}
        </div>
      </div>
    );
  }
}

export default SelectorMaker;
