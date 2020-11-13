"use strict";

import React from "react";

class LoaderMaker extends React.Component {
  render() {

    let extraClass = this.props.hasOwnProperty("extraClass")
      ? this.props.extraClass
      : "";

    let icon = <i className="glyphicons glyphicons-refresh" />;

    let loader = this.props.hasOwnProperty("overlay") ?
      <div className="lm-loading-overlay">
        <div className={`lm-loading ${extraClass}`}>
          {icon}
        </div>
      </div> :
      <div className={`lm-loading ${extraClass}`}>
        {icon}
      </div>;

    return loader;
  }
}

export default LoaderMaker;
