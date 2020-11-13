"use strict";

var global = {};

global.masterSocket = null;

global.masterSocketCommand = function(command, id) {
  var self = this;

  if (self.hasOwnProperty("masterSocket") && self.masterSocket) {
    if (self.masterSocket.readyState !== 1) {
      return;
    }

    self.masterSocket.send(JSON.stringify({
      command: command,
      id: id || "all"
    }));
  }
};

global.masterWebsocket = function() {
  var self = this;

  var wsProtocol = location.protocol.match(/^https/) ? "wss" : "ws";

  var url = `${wsProtocol}://${this.HOST}/api/v${this.API_VERSION}/websocket`;

  CSOS.log.info(`Connecting to master web socket ${url}`);

  try {

    if (self.hasOwnProperty("masterSocket") && self.masterSocket) {
      self.masterSocket.onopen = self.masterSocket.onmessage = self.masterSocket.onerror = null;

      if (self.masterSocket.readyState < 2) {
        self.masterSocket.close();
      }

      self.masterSocket = null;
    }

    self.masterSocket = new WebSocket(url);

    self.masterSocket.onopen = function() {

      self.masterSocket.send(JSON.stringify({
        command: "auth",
      }));

      self.Vent.addListener("master-send", function(msg) {
        self.masterSocket.send(JSON.stringify(msg));
      });
    };

    self.masterSocket.onerror = function(error) {
      CSOS.log.error(error);
      self.Vent.emit("master-error", error);
    };

    self.masterSocket.onmessage = function(event) {
      var json = JSON.parse(event.data);

      if (json.error) {
        CSOS.log.error("master websocket connection: ", json.data);
      }

      self.Vent.emit("master-message", json);

      // TODO: fix json struct output on csos-cli
      var id = `node:${json.Id}`;
      self.Vent.emit(id, json);
    };

  } catch (e) {

    CSOS.log.error(e);

  }
};

export default global;
