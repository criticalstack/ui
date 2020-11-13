"use strict";

import React from "react";
import Session from "../helpers/session";
import h from "../helpers";
import _ from "lodash";

const defaultAvatar = "//1.gravatar.com/avatar/0.png";

class Avatar extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      user: props.user || Session.user,
      avatar: defaultAvatar,
      id: _.uniqueId("avatar_")
    };
  }

  componentDidMount() {
    var self = this;

    CSOS.VentCache.avatar.push(`user:avatar:update:${this.state.id}`);

    h.Vent.addListener(`user:avatar:update:${this.state.id}`, function(user) {
      self.setState({
        user: user,
        avatar: defaultAvatar
      }, function() {
        self.updateAvatar();
      });
    });

    this.updateAvatar();
  }

  componentWillUnmount() {
    var self = this;

    _.remove(CSOS.VentCache.avatar, function(a) {
      return a === `user:avatar:update:${self.state.id}`;
    });

    h.Vent.removeAllListeners(`user:avatar:update:${self.state.id}`);
  }

  updateAvatar() {
    var a = defaultAvatar;

    if (this.state.user) {
      if (this.state.user.hasOwnProperty("customAvatar") && this.state.user.customAvatar.length !== 0 && this.state.user.customAvatar !== "0") {
        a = this.state.user.customAvatar;
      } else if (this.state.user.hasOwnProperty("avatar")) {
        a = "//1.gravatar.com/avatar/" + this.state.user.avatar;
      }
    }

    this.setState({
      avatar: a
    });
  }

  render() {
    return (
      <img className="content-avatar" width="36px" src={this.state.avatar} alt="" />
    );
  }

}

export default Avatar;
