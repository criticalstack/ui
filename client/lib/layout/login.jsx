"use strict";

import React from "react";
import h from "../helpers";
import Session from "../helpers/session";
import Notifications from "./notifications";
import { withRouter } from "react-router";
import CreatePendingUser from "./../settings/general/create-pending-user";

class Login extends React.Component {

  constructor() {
    super();

    this.state = {
      message: "",
      open: false,
      username: "",
      password: "",
      createUserEnabled: false,
      ssoLogin: false,
      ssoProvider: "",
      showForm: false,
    };

    this.toggleForm = this.toggleForm.bind(this);
  }

  componentDidMount() {
    let self = this;
    self.fetchState();
    let q = new URLSearchParams(window.location.search);
    if (q.has("error")) {
      h.Vent.emit("notification", {
        className: "notification-warn",
        message: `Login error: ${q.get("error")}`
      });
    }
  }

  fetchState() {
    let self = this;

    h.fetch({
      endpoint: "/sso/status",
      resUrl: false,
      api: false,
      success: function(u) {
        h.log.info("Result:", u);

        let result = u.context.result;
        self.setState({
          ssoLogin: result.status,
          ssoProvider: result.providerName
        });
      }
    });
  }

  handleChange(event) {
    const value = event.target.value;
    const name = event.target.name;

    this.setState({
      [name]: value
    });
  }

  loginTest(e) {
    e.preventDefault();
    var self = this;

    var email = this.state.username;
    var pass = this.state.password;

    Session.login(email, pass, function(loggedIn, resp) {
      if (!loggedIn) {
        self.setState({
          error: true,
          message: "Login Error.",
          open: true
        });

        h.Vent.emit("notification", {
          message: resp.error,
        });

        setTimeout( () => {
          self.setState({
            error: false
          });
        }, 2000);

        return false;
      } else {
        self.setState({
          error: false,
          open: true
        });

        if (resp && resp.hasOwnProperty("redirect") && typeof resp.redirect === "string") {
          window.location = resp.redirect;
          return false;
        }

        self.props.history.push("/");
        Session.onChange(loggedIn);
      }
    });

    return false;
  }

  toggleForm() {
    this.setState({
      showForm: !this.state.showForm
    });
  }

  render() {
    let hasIcon = false;
    let providerIcon = this.state.ssoProvider.toLowerCase();

    if (
      providerIcon === "google" ||
      providerIcon === "github" ||
      providerIcon === "dex" ||
      providerIcon === "pingid"
    ) {
      hasIcon = true;
    }

    return (
      <>
        <div className="login-box-parent">
          <div className="login-box">
            <img className="login-large-logo-animate" src="/assets/images/logo-color.svg" alt="Critical Stack, Inc" />
            <img className="login-logo login-fade-in" width="500px" src="/assets/images/cs-logo-textonly-white.svg" alt="Critical Stack, Inc"/>

            <div className="login-actions login-fade-in">
              {
                (this.state.showForm || !this.state.ssoLogin) && (
                  <form
                    onSubmit={(e) => this.loginTest(e)}
                    action="#"
                    method="post"
                  >
                    <label htmlFor="login-email">Email</label>
                    <input
                      placeholder="example@example.com"
                      id="login-email"
                      required
                      type="text"
                      name="username"
                      value={this.state.username}
                      onChange={(e) => this.handleChange(e)}
                    />

                    <label htmlFor="login-password">Password</label>
                    <input
                      placeholder="password"
                      id="login-password"
                      required
                      type="password"
                      name="password"
                      value={this.state.password}
                      onChange={(e) => this.handleChange(e)}
                    />

                    <input
                      value={this.state.error ? "Login Error" : "Sign In"}
                      type="submit"
                      className={`pure-button pure-button-primary ${this.state.error ? "warn" : ""}`}
                    />
                  </form>
                 )
               }
              {
                this.state.ssoLogin && !this.state.showForm && (
                  <div className="sso-box">
                    <a href="/sso"
                      className="sso-login-btn pure-button"
                    >
                      { hasIcon ? (
                        <img
                          className="sso-provider-logo"
                          src={`/assets/images/sso-provider-logos/${providerIcon}.png`}
                          alt={`${this.state.ssoProvider} icon`}
                        />
                      ) : (
                        <i className="glyphicons glyphicons-key"></i>
                      ) }
                      Log In with {this.state.ssoProvider}
                    </a>
                  </div>
                )
              }
            {this.state.ssoLogin && (
              <div className="login-toggle-container"
              >
                <a
                  href="#"
                  onClick={this.toggleForm}>
                    Log in with {this.state.showForm ? "SSO" : "email"}
                </a>
              </div>
            )}
            </div>

            {
              this.state.createUserEnabled && (
                <div className="signup-container">
                  <CreatePendingUser />
                </div>
              )
            }

          </div>
        </div>

        <div className="login-animation-parent">
          <div className="login-animation-overlay"></div>
          <img src="/assets/video/rack-animation.gif" />
        </div>

        <div className="notifications">
          <Notifications />
        </div>
      </>
    );
  }
}

export default withRouter(Login);
