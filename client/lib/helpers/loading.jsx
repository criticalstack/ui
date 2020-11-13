"use strict";

import {EventEmitter} from "fbemitter";
import Pace from "../../shared/pace/pace";

var global = {};

global.init = function() {
  var self = this;

  if (!self.hasOwnProperty("Vent")) {
    var emitter = new EventEmitter();
    self.Vent = emitter;
  }

  Pace.start({
    catchupTime: 100,
    initialRate: ".03",
    minTime: 250,
    ghostTime: 100,
    maxProgressPerFrame: 20,
    easeFactor: 1.25,
    startOnPageLoad: true,
    restartOnPushState: true,
    restartOnRequestAfter: 500,
    target: "body",
    elements: {
      checkInterval: 100,
      selectors: ["body"]
    },
    eventLag: {
      minSamples: 10,
      sampleCount: 3,
      lagThreshold: 3
    },
    ajax: {
      trackMethods: ["GET", "POST"],
      trackWebSockets: false,
      ignoreURLs: []
    }
  });
};

export default global;
