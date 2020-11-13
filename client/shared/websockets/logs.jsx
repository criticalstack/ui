"use strict";

import React from "react";
import ReactDOM from "react-dom";
import h from "../../lib/helpers";
import Button from "@material-ui/core/Button";

class ContainerLogs extends React.Component {
  get displayName() {
    return "ContainerLogs";
  }

  constructor(props) {
    super(props);

    this.websocket = null;
    this.timeout = null;

    this.state = {
      pod: props.pod,
      container: props.container,
      closed: false,
      logs: ["[!] This container currently has *NO* logs or is still loading.\n"],
      scroll: true,
      tailLines: 100,
      timestamps: false,
      follow: true,
      fullscreen: false,
      buffer: 100
    };

  }

  UNSAFE_componentWillReceiveProps(props) {
    var self = this;

    if (props.container !== self.state.container) {

      self.setState({
        logs: [
          `Chnage: ${props.pod} (${props.container})\n`,
          "[!] This container currently has *NO* logs or is still loading.\n"
        ],
        pod: props.pod,
        container: props.container
      }, function() {
        self.disconnect(function() {

          self.setState({
            closed: false
          }, function() {
            self.connect();
          });

        });
      });
    }
  }

  toggleFullscreen() {
    var self = this;
    var fullscreen = self.state.fullscreen;

    var node = this.logs;
    node.scrollTop = node.scrollHeight;

    self.setState({
      fullscreen: !fullscreen
    });
  }

  connect() {
    var self = this;

    self.websocket = h.websocket({
      action: "container-logs",
      pod: self.state.pod,
      container: self.state.container,
      follow: self.state.follow,
      tailLines: self.state.tailLines,
      timestamps: self.state.timestamps
    });

    self.websocket.onopen = function() {
      h.log.info("WS ONOPEN:", self.websocket);
    };

    self.websocket.onerror = function(e) {
      console.log("WS ERROR:::", e);
      h.log.error(e);
    };

    self.websocket.onclose = function(e) {
      h.log.info("WS ONCLOSE:", e, self.props.pod, self.props.container);

      if (self.timeout) {
        clearTimeout(self.timeout);
      }

      self.timeout = setTimeout(function() {
        h.log.info("WS RECONNECT:", self.websocket);
        self.timeout = null;
        self.connect();
      }, 1000);
    };

    self.websocket.onmessage = function(e) {
      var reader = new FileReader();

      reader.onload = function() {
        var logs = self.state.logs;

        var len = logs.length;

        logs.push(reader.result);

        if (len >= self.state.buffer) {
          logs.shift();
        }

        if (!self.state.closed) {
          self.setState({
            logs: logs
          });
        }

      };

      reader.readAsText(e.data);
    };
  }

  UNSAFE_componentWillUpdate() {
    var node = ReactDOM.findDOMNode(this.logs);
    this.shouldScrollBottom = node.scrollTop + node.offsetHeight === node.scrollHeight;
  }

  componentDidUpdate() {
    if (this.shouldScrollBottom) {
      var node = ReactDOM.findDOMNode(this.logs);
      node.scrollTop = node.scrollHeight;
    }
  }

  disconnect(callback) {
    var self = this;

    self.setState({
      closed: true
    });

    if (self.timeout) {
      clearTimeout(self.timeout);
    }

    if (self.websocket) {
      h.log.info("closing websocket");

      self.websocket.onopen = self.websocket.onmessage = self.websocket.onerror = self.websocket.onclose = null;

      if (self.websocket.readyState < 2) {
        self.websocket.close();
      }

      self.websocket = null;
    }

    if (callback && typeof callback === "function") {
      return callback();
    }
  }

  componentDidMount() {
    var self = this;
    self.connect();
  }

  componentWillUnmount() {
    this.disconnect();
  }

  render() {
    var self = this;

    return (

      <div>
        <pre
          ref={node => {
            this.logs = node;
          }}
          className={`container-logs-wrapper ${self.state.fullscreen ? "fullscreen" : ""}`}
        >
          {this.state.logs.map(function(l, e) {
            return <span className="log-line" key={e}>{l}</span>;
          })}
          <Button
            className={"fullscreen-terminal-button"}
            onClick={self.toggleFullscreen.bind(self)}
            style={{
              position: "absolute",
              padding: 0,
              top: 10,
              right: 10,
              width: 64,
              height: 64,
              zIndex: 99999,
              color: "#fff",
              borderRadius: "100%",
            }}
            tooltip="Toggle Fullscreen">
            <i
              className="glyphicons glyphicons-fullscreen icon-text-icon"
            />
          </Button>
        </pre>
      </div>
    );
  }
}

export default ContainerLogs;
