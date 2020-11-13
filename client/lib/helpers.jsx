"use strict";

import React from "react";
import _ from "lodash";
import Logger from "../shared/logger/logger";
import Views from "./helpers/view";
import FetchHelpers from "./helpers/fetch";
import WebSocketHelpers from "./helpers/websocket";
import MasterWebsocket from "./helpers/master-socket";
import LocalStorageData from "./helpers/localstorage";
import LoaderHelpers from "./helpers/loading";

window.CSOS = {};

var global = {
  // kube
  PROTOCOL: window.location.protocol || "http:",
  HOSTNAME: window.location.hostname,
  HOST: window.location.host,
  MASTER_PORT: "7330",
  KUBEPORT: "8080",
  API_VERSION: "1",
  DefaultNamespace: "critical-stack",
  AppSpecRoot: "/marketplace/static",
  requests: {},
  EditMode: false,
  ignoreWebsocket: false,
  VentCache: {
    avatar: []
  }
};

Logger.useDefaults({
  formatter: function(messages, context) {
    messages.unshift("[critical-stack]");

    if (context.name) {
      messages.unshift("[" + context.name + "]");
    }
  }
});

if (window.localStorage.getItem("csos-log")) {
  Logger.setLevel(Logger.DEBUG);
} else {
  Logger.setLevel(Logger.ERROR);
}

global.log = Logger;

// global helper views
global.view = Views;
// helpers end

// Load helper plugins
_.extend(global, LoaderHelpers);
_.extend(global, WebSocketHelpers);
_.extend(global, MasterWebsocket);
_.extend(global, FetchHelpers);
_.extend(global, LocalStorageData);

// Debug
window.CSOS = global;

// bootstrap localStorage defaults
_.each(window.CSOS.localStorage, function(value, key) {
  CSOS.log.info(`localstorage init: ${key}`);
  value.init();
});

// Global Logging and Log level info.
window.CSOS.log = global.log;

window.CSOS.log.on = function() {
  window.localStorage["csos-log"] = true;
  this.setLevel(this.DEBUG);
};

window.CSOS.log.off = function() {
  delete window.localStorage["csos-log"];
  this.setLevel(this.ERROR);
};

// websocket queue
// window.CSOS.wsQueue = [];
// window.CSOS.wsRunning = false;
// global.websocketQueueMonitor();

export default global;
