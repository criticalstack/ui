"use strict";

import h from "../helpers";
import _ from "lodash";

export default {

  user: {},

  loginRequest(email, pass, callback) {
    var self = this;

    h.fetch({
      api: false,
      resUrl: false,
      endpoint: "/authorize",
      method: "post",
      body: JSON.stringify({
        email: email,
        password: pass
      }),
      success: function(data) {
        if (!_.isEmpty(data.context.error)) {
          return callback({
            authenticated: false,
            error: data.context.error,
          });
        }
        window.localStorage["csos-email"] = data.context.result.email;
        window.localStorage["csos-user"] = JSON.stringify(data.context.result);
        window.localStorage["csos-version"] = data.version;
        window.localStorage["csos-namespace"] = _.get(data.context.result, "defaultNamespace", "default");
        window.localStorage["cs-config"] = JSON.stringify(_.get(data.context, "config", {}));

        self.user = data.context.result;
        h.Vent.emit("user:avatar:update", self.user);

        return callback({
          authenticated: true,
          user: data.user,
          redirect: data.context.redirect_uri
        });
      },
      error: function(jqXHR, textStatus) {
        return callback({
          authenticated: false,
          user: null,
          error: _.get(jqXHR, "responseJSON.context.error", textStatus || "Unkown"),
        });
      }
    });
  },

  login(email, password, callback) {
    var self = this;

    self.loginRequest(email, password, function(res) {
      if (res.authenticated) {
        if (_.isFunction(callback)) {
          return callback(true, res);
        }

        self.onChange(true);
      } else {
        if (_.isFunction(callback)) {
          return callback(false, res);
        }

        self.onChange(false);
      }
    });
  },

  setUser(callback) {
    var self = this;

    if (window.localStorage["csos-user"]) {
      try {
        var json = JSON.parse(window.localStorage["csos-user"]);
        self.user = json;

        self.updateUser(function(ok, user) {
          if (ok) {
            h.Vent.emit("user-data-update", user);
          }
        });
      } catch (e) {}
    }

    if (_.isFunction(callback)) {
      return callback();
    }

  },

  updateUser(callback) {
    var self = this;
    var id = self.user.metadata.name;

    h.fetch({
      api: true,
      endpoint: `/users.criticalstack.com/${id}`,
      success: function(data) {
        if (_.isEmpty(data.context.error)) {
          self.user = data.context.result;

          h.log.debug("UPDATE USER::", self.user);

          window.localStorage["csos-email"] = self.user.email;
          window.localStorage["csos-user"] = JSON.stringify(self.user);
          window.localStorage["csos-version"] = data.version;

          h.Vent.emit("user:avatar:update", self.user);

          return callback(true, self.user);
        } else {
          self.destroy();
          return callback(false, {});
        }
      },
      error: function() {
        self.destroy();
        return callback(false, {});
      }
    });
  },

  namespace() {
    return window.localStorage["csos-namespace"];
  },

  changeNamespace(newNamespace) {
    window.localStorage["csos-namespace"] = newNamespace;
  },

  version() {
    return window.localStorage["csos-version"];
  },

  fetch(callback) {
    this.setUser();

    h.fetch({
      resUrl: false,
      endpoint: "/config",
      success: function(data) {
        h.log.info("Server Configuration", data);
        let result = data.context.result;
        window.localStorage["cs-config"] = JSON.stringify(result);
        window.localStorage["csos-user"] = JSON.stringify(result.user);
        if (!window.localStorage["csos-namespace"]) {
          window.localStorage["csos-namespace"] = _.get(result.user, "defaultNamespace", "default");
        }
        h.Vent.emit("main-menu:update");
        return callback(true);
      },
      error: function(a) {
        console.log("error: ", a);
        return callback(false);
      }
    });
  },

  destroy(e, callback) {
    if (e && e.hasOwnProperty("preventDefault")) {
      e.preventDefault();
    }

    delete window.localStorage["csos-user"];
    delete window.localStorage["csos-email"];
    delete window.localStorage["csos-namespace"];

    h.fetch({
      api: false,
      resUrl: false,
      endpoint: "/authorize",
      method: "delete",
      dataType: "html",
      success: function() {
        window.location = "/";
        if (callback && typeof callback === "function") {
          return callback();
        }
      },
      error: () => {
        window.location = "/";
      }
    });
  },

  onChange() {}
};
