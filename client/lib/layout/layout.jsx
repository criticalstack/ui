"use strict";

import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Header from "./header";
import Login from "./login";
import h from "../helpers";
import _ from "lodash";
import Session from "../helpers/session";
import { RBACProvider } from "../../shared/context/rbac";
import Notifications from "./notifications";
import ConfirmBox from "./confirm-box";
import FormDialog from "./form-dialog";
import FormDialogAdvanced from "./form-dialog-advanced";
import ManifestDialogSimple from "./manifest-dialog-simple";
import RBACFormDialog from "../cluster/rbac/rbac-form-dialog";
import FullscreenEditor from "./fullscreen-editor";
import { withRouter } from "react-router";
import ThePast from "./the-past";
import SectionDrawer from "../../shared/section-drawer";
import CreateDrawer from "./create/create-drawer";

class Layout extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      session: Session.fetch(this.setStateOnAuth.bind(this))
    };
  }

  setStateOnAuth(session) {
    this.setState({
      session
    });

    if (!session) {
      this.props.history.push("/login");
    }
  }

  componentDidMount() {
    var self = this;
    Session.onChange = self.setStateOnAuth.bind(self);

    h.Vent.addListener("link", function(msg, state) {
      if (typeof state !== "undefined") {
        self.props.history.push(msg, state);
      } else {
        self.props.history.push(msg);
      }
    });

    h.Vent.addListener("system:edit-mode:toggle", function(callback) {
      CSOS.EditMode = !CSOS.EditMode;

      if (_.isFunction(callback)) {
        return callback();
      }
    });
  }

  componentDidUpdate(prevProps) {
    let self = this;
    let prevPath = prevProps.location.pathname;
    if (this.props.location.pathname !== prevPath && prevPath === "/login") {
      Session.fetch(self.setStateOnAuth.bind(self));
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("link");
  }

  renderWithSession() {
    if (this.state.session && this.props.location.pathname !== "/login") {

      if (this.props.location.pathname === "/sso/callback") {
        this.props.history.push("/datacenter/nodes");
      }

      return (
        <RBACProvider namespace={Session.namespace()}>
          <DndProvider backend={HTML5Backend}>
            <div className="layout-container">
              <div id="header">
                <Header />
              </div>

              <ThePast present={this.props.history.location.pathname} namespace={Session.namespace()}/>

              <div className="content">
                {this.props.children}
              </div>

              <div className="notifications">
                <Notifications />
              </div>

              <ConfirmBox />
              <FormDialog />
              <FormDialogAdvanced />
              <FullscreenEditor />
              <ManifestDialogSimple />
              <RBACFormDialog />
              <CreateDrawer />
              <SectionDrawer />
            </div>
          </DndProvider>
        </RBACProvider>
      );
    } else {
      return (
        <>
          <Login />
          <FormDialog />
        </>
      );
    }
  }

  render() {
    let html = this.renderWithSession();
    return html;
  }
}

export default withRouter(Layout);
