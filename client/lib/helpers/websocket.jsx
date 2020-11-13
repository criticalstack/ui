"use strict";

import _ from "lodash";

var global = {};

global.socketurl = function(params) {
  let proto = "ws";
  if (this.PROTOCOL === "https:") {
    proto = "wss";
  }
  let url = `${proto}://${this.HOST}/api/v${this.API_VERSION}/websocket`;

  if (!params.hasOwnProperty("namespace")) {
    params.namespace = window.localStorage["csos-namespace"];
  }

  var items = [];
  _.forOwn(params, function(v, k) {
    if (Array.isArray(v)) {
      _.each(v, function(x) {
        items.push(`${k}=${x}`);
      });
    } else {
      items.push(`${k}=${v}`);
    }
  });
  if (items.length > 0) {
    return `${url}?${items.join("&")}`;
  }

  return url;
};

global.websocket = function(params) {
  const path = this.socketurl(params);
  this.log.info(`Connecting to websocket: ${path} - Protocol: ${params.protocol}`);
  return new WebSocket(path);
};

global.websocketCallbacks = [
  "onopen",
  "onerror",
  "onclose",
  "onmessage"
];

global.websocketQueueAdd = function(path, options) {
  window.CSOS.wsQueue.push({
    path: path,
    options: options
  });
};

global.websocketQueueCloseAll = function() {};

global.websocketQueueMonitor = function() {
  var that = this;

  setInterval(function() {
    if (window.CSOS.wsQueue.length > 0) {
      if (!window.CSOS.wsRunning) {
        window.CSOS.wsRunning = true;
        var ws = window.CSOS.wsQueue.pop();
        that.websocketRun(ws);
      }
    } else {
      that.log.info("Waiting for new items in ws queue.");
    }
  }, 500);

};

global.websocketRun = function(object) {
  var that = this;

  var path = object.path;
  var options = object.options;

  window.CSOS.wsRunning = true;

  var websocket = that.websocket(path, options.ignoreWatch, options.protocol);

  websocket.ConnectionTimeout = setTimeout(function() {
    window.CSOS.wsRunning = false;

    if (websocket) {
      _.each(websocket.websocketCallbacks, function(name) {
        if (_.isFunction(options[name])) {
          websocket[name] = null;
        }
      });

      if (websocket.readyState < 2) {
        websocket.close();
      }

      websocket = null;
    }
  }, 3000);

  _.each(that.websocketCallbacks, function(name) {
    if (_.isFunction(options[name])) {
      websocket[name] = function(e) {
        if (name === "onerror" || name === "onclose") {
          window.CSOS.wsRunning = false;
        }
        options[name](e);
      };
    }
  });

};

export default global;
