"use strict";

import React from "react";

class EnvVarMaker extends React.Component {

  constructor(props) {
    super(props);
  }

  makePair(data) {
    var formatted = data.map(function(obj, i) {
      var tooltip = obj.value.length > 0 ? `${obj.name}=${obj.value}` : obj.key;

      var pair = (
        <div data-tip
          data-balloon={tooltip}
          data-balloon-pos="up"
          key={`${i}-${obj.name}`}
          className="env-var-pair">
          <span className="env-var-key">
            {obj.name}
          </span>

          <span className="env-var-split">=</span>

          <span className="env-var-value">
            {obj.value}
          </span>

        </div>
      );

      return pair;
    });

    return formatted;
  }

  render() {

    var entries = this.makePair(this.props.data);

    return (
      <div className="env-var-container">
        <div className="env-vars">
          {entries}
        </div>
      </div>
    );
  }
}

export default EnvVarMaker;
