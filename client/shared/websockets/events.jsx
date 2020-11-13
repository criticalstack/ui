"use strict";

import React from "react";
import ReactDOM from "react-dom";
import h from "../../lib/helpers";
import EventTable from "../../lib/datacenter/events/table";

class ContainerEvents extends React.Component {
  get displayName() {
    return "ContainerEvents";
  }

  constructor(props) {
    super(props);

    this.websocket = null;

    this.state = {
      container: props.container,
      // no need to pass the props.events
      events: [],
      max: 10,
      scroll: true
    };
  }

  UNSAFE_componentWillReceiveProps(props) {
    var self = this;

    if (props.container !== self.state.container) {
      self.setState({
        pod: props.pod,
        container: props.container
      }, function() {
        self.disconnect(function() {
          self.connect();
        });
      });
    }
  }

  connect() {
    var self = this;

    self.websocket = h.websocket({
      action: "watch-resource",
      resourceType: "events",
      fieldSelector: `involvedObject.fieldPath=spec.containers{${self.state.container}}`
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
    };

    self.websocket.onmessage = function(e) {
      var json = JSON.parse(e.data);
      var events = self.state.events;

      events.push(json.object);

      self.setState({
        logs: events
      });
    };
  }

  UNSAFE_componentWillUpdate() {
    var node = ReactDOM.findDOMNode(this);
    this.shouldScrollBottom = node.scrollTop + node.offsetHeight === node.scrollHeight;
  }

  componentDidUpdate() {
    if (this.shouldScrollBottom) {
      var node = ReactDOM.findDOMNode(this);
      node.scrollTop = node.scrollHeight;
    }
  }

  disconnect(callback) {
    var self = this;

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
    return (
      <div className="container-events-wrapper">
        <EventTable data={this.state.events} />
      </div>
    );
  }
}

export default ContainerEvents;
