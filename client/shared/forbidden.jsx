"use strict";
import React from "react";

class Forbidden extends React.Component {

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

  render() {

    var style = this.props.hasOwnProperty("style")
      ? this.props.style
      : this.state.style;

     return (
       <div className="no-result" style={style}>
         <div className="no-result-circle">
           <i className="glyphicons glyphicons-no-symbol no-result-icon"/>
         </div>

         <div className="no-result-message-main">
           Access Forbidden
         </div>

         <div className="no-result-message-sub">
           Contact your administrator to request access to this resource.
         </div>
       </div>
    );
  }
}

export default Forbidden;
