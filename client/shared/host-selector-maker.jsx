"use strict";

import React from "react";

class HostSelectorMaker extends React.Component {

  constructor(props) {
    super(props);
  }

  makeEntries(data) {
    let entries = data.map(function(host, i) {

      let entry = (
        <div data-tip
          data-balloon={host}
          data-balloon-pos="up"
          key={`${i}-${host}`}
          className="host-selector-pair">
          <span className="host-selector-value">
            {host}
          </span>

        </div>
      );

      return entry;
    });

    return entries;
  }

  render() {

    let hostSelectors = this.makeEntries(this.props.data);

    return (
      <div className="host-selector-container">
        <div className="host-selector">
          {hostSelectors}
        </div>
      </div>
    );
  }
}

export default HostSelectorMaker;
