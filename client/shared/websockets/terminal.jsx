"use strict";

import React from "react";
import ReactDOM from "react-dom";
import h from "../../lib/helpers";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import Button from "@material-ui/core/Button";

class ContainerTerminal extends React.Component {
  get displayName() {
    return "ContainerTerminal";
  }

  constructor(props) {
    super(props);

    this.websocket = null;
    this.timeout = null;
    this.term = React.createRef();
    this.termParent = React.createRef();
    this.first = true;
    this.fitAddon = null;
    this.onResize = this.resize.bind(this);

    this.state = {
      attach: props.attach,
      container: props.container,
      pod: props.pod,
      type: props.type || false,
      logs: [],
      isFullScreen: false
    };
  }

  componentDidMount() {
    let self = this;

    window.addEventListener("resize", self.onResize);

    self.terminal(function() {
      self.connect();
    });
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);

    this.disconnect();

    if (this.term.current) {
      this.term.current.dispose();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.container !== prevProps.container) {
      this.setState({
        attach: this.props.attach,
        container: this.props.container,
        pod: this.props.pod,
        type: this.props.type || false,
        logs: []
      }, () => {
        this.disconnect(() => {
          this.fitAddon.fit();
          this.connect();
          this.term.current.clear();
        });
      });
    }
  }

  terminal(callback) {
    let self = this;

    // Initialize terminal
    self.term.current = new Terminal();

    // Initialize and load addons
    self.fitAddon = new FitAddon();

    // Start terminal
    self.term.current.open(self.termParent.current);
    self.term.current.setOption("theme", { background: "#14171b"});
    self.term.current.loadAddon(self.fitAddon);
    self.fitAddon.fit();

    self.term.current.refresh(self.term.current.rows, self.term.current.rows);

    self.term.current.onData(function(wsdata) {
      if (self.websocket && self.websocket.readyState === 1) {
        h.log.info("SEND", wsdata);
        self.websocket.send("0" + window.btoa(wsdata));
      }
    });

    if (callback && typeof callback === "function") {
      return callback();
    }
  }

  resize() {
    let self = this;
    self.fitAddon.fit();
  }

  toggleFullscreen = () => {
    if (this.state.isFullScreen) {
      this.setState({ isFullScreen: false }, () => {
        // Timeout for animation to get terminal properly fitted
        setTimeout(() => {
          this.fitAddon.fit();
        }, 300);
        this.term.current.refresh(0, this.term.current.rows);
      });
    } else {
      this.setState({ isFullScreen: true }, () => {
        this.fitAddon.fit();
      });
    }
  }

  connecting() {
    let self = this;

    let motd = `
      \r\x1b[1mNote: This is not a fully-featured shell. The commands available
      \rare determined by the underlying shell used within this container
      \rand may also be influenced by RBAC\x1b[m\n\r`;

    let errorMsg = "Failed to connect. Retrying...";
    self.term.current.write("\rAttempting to connect...\n\r");

    self.websocket.onopen = function() {
      self.timeoutDelay = 0;
      if (self.websocket && self.websocket.readyState === 1) {
        self.term.current.clear();
        self.term.current.write(motd);
        if (self.state.type === "shell") {
          self.websocket.send("0DQ==");
        }
        self.term.current.focus();
      }

      if (self.connectionTimeout) {
        clearTimeout(self.connectionTimeout);
      }

      h.log.info("WS ONOPEN:", self.websocket);

      if (self.alive) {
        clearInterval(self.alive);
      }

      self.alive = window.setInterval(function() {
        if (self.websocket && self.websocket.readyState === 1) {
          self.websocket.send("0");
        }
      }, 10 * 1000);
    };

    self.websocket.onerror = function(e) {
      console.log("WS ERROR:::", e);
      h.log.error(e);
    };

    self.websocket.onclose = function(e) {
      h.log.info("WS ONCLOSE:", e, self.state.pod, self.state.container);

      if (self.timeout) {
        clearTimeout(self.timeout);
      }

      self.timeout = setTimeout(function() {
        h.log.info("WS RECONNECT:", self.websocket);
        self.disconnect();
        self.term.current.write(`\r\n\x1b[41m${errorMsg}\x1b[m\r\n`);
        self.timeout = null;
        self.connect();
      }, 5000);
    };

    self.websocket.onmessage = function(event) {
      let data = event.data.slice(1);

      switch (event.data[0]) {
        case "1":
        case "2":
        case "3":
          self.term.current.write(atob(data));
          break;
        default:
          self.term.current.write("Unrecognized Event");
      }
    };
  }

  connect() {
    let self = this;
    if (this.state.type === "shell") {

    let char = ["\\", "|", "/", "-"];
    let x = 0;
    self.loadingInterval = setInterval(function() {
      self.term.current.write("\rLoading " + char[x++]);
      x &= 3;
    }, 250);

      h.fetch({
        endpoint: "/users/shell",
        resUrl: false,
        method: "post",
        success: function(data) {
          const pod = data.context.result.pod;
          const container = data.context.result.container;
          self.websocket = h.websocket({
            action: "container-attach",
            pod,
            stdout: 1,
            stdin: 1,
            stderr: 1,
            tty: 1,
            container,
            namespace: data.context.result.namespace,
            command: ["/bin/sh", "-i"],
            protocol: "base64.channel.k8s.io"
          });

          clearInterval(self.loadingInterval);

          self.setState({
            pod,
            container
          }, () => {
            self.connecting();
          });
        },
        error: function() {
          clearInterval(self.loadingInterval);
          self.term.current.write("\rConnection error");
        }
      });
    } else {
      self.websocket = h.websocket({
        action: "container-exec",
        pod: this.state.pod,
        stdout: 1,
        stdin: 1,
        stderr: 1,
        tty: 1,
        container: this.state.container,
        command: ["/bin/sh", "-i"],
        protocol: "base64.channel.k8s.io"
      });

      self.connecting();
    }
  }

  disconnect(callback) {
    let self = this;

    if (self.connectionTimeout) {
      clearTimeout(self.connectionTimeout);
    }

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

      window.clearInterval(self.alive);
      self.alive = null;
    }

    if (callback && typeof callback === "function") {
      return callback();
    }
  }

  render() {
    const { isFullScreen } = this.state;
    return (
      <div
        ref={this.termParent}
        className={`container-terminal-wrapper ${isFullScreen ? "fullscreen" : ""}`}>
        <Button
          className={"fullscreen-terminal-button"}
          onClick={this.toggleFullscreen}
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
          <i className="glyphicons glyphicons-fullscreen icon-text-icon" />
        </Button>
      </div>
    );
  }
}

export default ContainerTerminal;
