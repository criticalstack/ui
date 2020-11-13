"use strict";

import React from "react";
import MainMenu from "./header/main-menu";
import SubMenu from "./header/sub-menu";
import MpContentHeader from "./header/mp-content-header";
import { Route, Redirect, withRouter } from "react-router-dom";

class Header extends React.Component {
  render() {
    let re = /^\/{1}(\w+)($|\/)/;
    let path = this.props.location.pathname.match(re);
    let subMenu = "";

    if (path !== null && path.length > 1 && path[1] !== "stackapps") {
      if (path[1] !== "marketplace") {
        subMenu = <SubMenu />;
      }
    }

    return (
      <div className="header-parent">
        <MainMenu />
        {subMenu}
        <Route exact path="/marketplace" render={() => (
          <Redirect to="/marketplace/feature/home" />
        )} />
        <Route exact path="/marketplace/feature/:feature" component={MpContentHeader} />
        <Route exact path="/marketplace/feature/:feature/category/:category" component={MpContentHeader} />
        <Route exact path="/marketplace/feature/:feature/category/:category/source/:source" component={MpContentHeader} />
        <Route exact path="/marketplace/feature/:feature/source/:source" component={MpContentHeader} />
        <Route exact path="/marketplace/app/:app" component={MpContentHeader} />
      </div>
    );
  }
}

export default withRouter(Header);
