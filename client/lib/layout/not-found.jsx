"use strict";

import React from "react";
import NoResult from "../../shared/no-result";

class NotFound extends React.Component {

  constructor(props) {
    super(props);
  };

  render() {
    return (
      <div
        className="notfound"
        onClick={this.props.history.goBack}>
        <NoResult
          title="404"
          body="We are lost. Go back by clicking here"
          icon="glyphicons glyphicons-directions-sign"
          status="warning"
        />
      </div>
    );
  }
}

export default NotFound;
