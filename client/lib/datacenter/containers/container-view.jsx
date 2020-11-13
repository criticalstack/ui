"use strict";

import React from "react";
import h from "../../helpers";
import _ from "lodash";
import moment from "moment";

import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { Link } from "react-router-dom";
import ContainerTerminal from "../../../shared/websockets/terminal";
import ContainerLogs from "../../../shared/websockets/logs";
import ContainerEvents from "../../../shared/websockets/events";
import ContainerMetrics from "./container-metrics";

import MenuMaker from "../../../shared/menu-maker";
import LabelEditor from "../../../shared/label-editor";
import LabelMaker from "../../../shared/label-maker";
import ClipboardEntry from "../../../shared/clipboard-entry";
import NoResult from "../../../shared/no-result";

import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";

import Tooltip from "react-tooltip";

class ContainerView extends React.Component {

  constructor(props) {
    super(props);

    this.websocket = null;

    this.state = {
      location: props.location,
      params: props.match.params,
      container: {},
      updateContainerData: false,
      loading: true,
      events: [],
      includeMetrics: CSOS.localStorage.metrics.data().containerview
    };

    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    var self = this;

    h.Vent.emit("main-menu:filter:toggle", false);

    let ns = window.localStorage["csos-namespace"];
    let url = `/namespaces/${ns}/pods/${self.state.params.pod}/containers/${self.state.params.id}`;

    h.fetch({
      endpoint: url,
      resUrl: false,
      success: function(data) {
        h.log.info("CONTAINER:", data);

        self.setState({
          container: data.context.result,
          loading: false
        });

        self.loadWebsocket(data.context.resourceVersion);
      }
    });
  }

  componentWillUnmount() {
    var self = this;
    self.destroyState();
    h.Vent.emit("main-menu:filter:toggle", true);
  }

  destroyState(callback) {
    var self = this;

    if (self.websocket) {
      h.log.info("closing websocket");

      self.websocket.onopen = self.websocket.onmessage = self.websocket.onerror = self.websocket.onclose = null;

      if (self.websocket.readyState < 2) {
        self.websocket.close();
      }

      self.websocket = null;

      if (callback && typeof callback === "function") {
        return callback();
      }
    }

    if (callback && typeof callback === "function") {
      return callback();
    }
  }

  loadWebsocket() {
    var self = this;

    self.websocket = h.websocket({
      action: "watch-resource",
      resourceType: "pods",
      fieldSelector: `metadata.name=${self.state.params.pod}`
    });

    self.websocket.onerror = function(e) {
      h.log.error(e);
    };

    self.websocket.onmessage = function(event) {
      var json = JSON.parse(event.data);
      h.log.info("WS:", event, json);

      if (json.type === "DELETED") {
        // move to pod page and show notification box
        h.Vent.emit("link", "/datacenter/pods");

        h.Vent.emit("notification", {
          message: "Container deleted by another user."
        });
      }

      if (json.type === "ADDED" || json.type === "MODIFIED") {

        _.each(json.object.spec.containers, function(c) {
          if (c.name !== self.state.params.id) {
            return;
          }

          var cData = {};

          _.each(json.object.status.containerStatuses, function(cs) {
            if (cs.name === c.name) {
              cData.status = cs;
            }
          });

          cData.pod = json.object;
          cData.metadata = c;
          cData.events = self.state.container.events || [];

          if (self.state.updateContainerData) {
            h.Vent.emit("notification", {
              message: "Notice: Container information has changed."
            });
          }

          var params = self.state.params;

          self.setState({
            params: params,
            updateContainerData: true,
            container: cData
          });
        });
      }
    };
  }

  toggleMetrics() {
    var self = this;

    var value = self.state.includeMetrics ? false : true;
    self.setState({
      includeMetrics: value
    });

    CSOS.localStorage.metrics.update({
      containerview: value
    });
  }

  handleChange(event) {
    var self = this;
    var value = event.target.value;

    if (value === self.state.params.id) {
      return false;
    }

    var location = `/datacenter/pods/${self.state.params.pod}/${value}/${self.state.params.tab}`;
    h.Vent.emit("link", location);

    let ns = window.localStorage["csos-namespace"];
    let url = `/namespaces/${ns}/pods/${self.state.params.pod}/containers/${self.state.params.id}`;

    h.fetch({
      endpoint: url,
      resUrl: false,
      success: function(data) {
        h.log.info("CONTAINER:", data);

        self.setState({
          params: {
            tab: self.state.params.tab,
            id: value,
            pod: self.state.params.pod
          },
          container: data.context.result,
          loading: false
        });

        self.loadWebsocket(data.context.resourceVersion);
      }
    });
  }

  containerMenu(containers) {
    if (containers.length <= 0) {
      return "";
    }

    var podName = this.state.container.hasOwnProperty("pod") ? this.state.container.pod.metadata.name : "";

    return (
      <FormControl className="container-select">
        <InputLabel>{`pod: ${podName}`}</InputLabel>
        <Select
          value={this.state.params.id}
          onChange={this.handleChange}
          className="container-select-selected"
        >
          {containers.map(function(c) {
            return (
              <MenuItem
                disableRipple={true}
                key={c.name}
                value={c.name}
                className="container-select-mi"
              >
                {c.name}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    );
  }

  makeMenu(container) {
    let self = this;

    let menuData = {
      "entries": {
        0: {
          "icon": "glyphicons glyphicons-dashboard menu-icon",
          "name": "Toggle Metrics",
          "toggle": {
            state: self.state.includeMetrics
          },
          "link": function() {
            self.toggleMetrics();
          }
        },
        1: {
          "icon": "glyphicons glyphicons-tags menu-icon",
          "name": "Labels",
          "link": function(e, that, raw) {
            h.Vent.emit("layout:confirm:open", {
              open: true,
              title: (
                <span>
                  <i className="glyphicons glyphicons-tags dialog-title-icon" />
                  {`Editing labels on ${raw.pod.metadata.name}`}
                </span>
              ),
              message: <LabelEditor data={raw.pod} />,
              disableButtons: true
            });
          }
        },
        2: {
          "icon": "glyphicons glyphicons-bin menu-icon-warn",
          "divider": "menu-divider-top",
          "name": "Delete",
          "link": function(e, that, raw) {

            h.Vent.emit("layout:confirm:open", {
              open: true,
              title: `Confirm Request: Delete Pod ${raw.metadata.name}?`,
              message: `Are you sure you want to delete Pod ${raw.metadata.name}? This action cannot be reversed.`,
              onAction: function() {
                h.Vent.emit("notification", {
                  message: `Deleting Pod ${raw.metadata.name}`
                });

                h.Vent.emit("layout:confirm:close");

                h.fetch({
                  method: "delete",
                  endpoint: h.ns(`/pods/${raw.metadata.name}`, self.props.location),
                  success: function() {
                    // wait for it
                  }
                });
              }
            });

          }
        }
      },
      "args": {
        "style": {
          textAlign: "left",
          fontSize: "0.9em"
        },
        "icon": "csicon csicon-gear menu-icon-container container-menu-icon"
      }
    };

    return (
      <div className="container-view-options">
        <MenuMaker data={menuData} raw={container} />
      </div>
    );
  }

  getPodDetail(container) {
    var self = this;
    var cArgs = container.metadata.hasOwnProperty("args") ?
      Object.keys(container.metadata.args).map(function(key, i) {
        var detail = (
          <div key={`${i}-${key}`}>
            {container.metadata.args[key]}
          </div>
        );

        return detail;
      })

      : "-";

    var cComms = container.metadata.hasOwnProperty("command") ?
      Object.keys(container.metadata.command).map(function(key, i) {
        var detail = (
          <div key={`${i}-${key}`}>
            {container.metadata.command[key]}
          </div>
        );

        return detail;
      })

      : "-";

    var labels = (
      <span className="labels-empty"></span>
    );

    if (container.pod.metadata.hasOwnProperty("labels")) {
      labels = (
        <LabelMaker
          scope="create"
          data={container.pod.metadata.labels}
          caller=".container-view-labels"
          displayAll={true}
        />
      );
    }

    var images = "-";
    var imagesObj = container.pod.spec.containers || [];

    if (imagesObj.length > 0) {
      images = "";
    }

    for (var i = 0; i < imagesObj.length; i++) {
      var imageName = imagesObj[i].image;
      images += `${imageName} `;
    }

    var replicationControllers = "-";
    var rc = container.replicationControllers || [];

    if (rc.length > 0) {
      replicationControllers = "";
    }

    for (var k = 0; k < rc.length; k++) {
      var rcName = rc[k].metadata.name;
      var rcCount = rc[k].spec.replicas;
      var rcOnline = rc[k].status.replicas;

      replicationControllers += `${rcName} (${rcOnline}/${rcCount} replicas created)`;
    }

    var state = "-";
    var started = "-";
    var containerId = "-";
    var image = "-";
    var imageId = "-";
    var ready = "-";
    var startTime = "-";
    var restartCount = "-";

    if (container.hasOwnProperty("status")) {

      var containerIdText = container.status.containerID;
      var containerIdShort = containerIdText ? containerIdText.split("://")[1] : "";

      containerId = (
        <>
          {containerIdText}
          <ClipboardEntry
            copyText={containerIdShort}
            uniqueId={`copy-${containerIdShort}`}
            toolTip="Copy container ID"
            message="Container ID"
            icon={true}
          />
        </>
      );

      image = container.status.image;
      var imageIdText = container.status.imageID;

      if (imageIdText === "") {
        imageId = "-";
      } else {
        var imageIdShort = imageIdText ? imageIdText.split("://")[1] : "";
        imageId = (
          <>
            {imageIdText}
            <ClipboardEntry
              copyText={imageIdShort}
              uniqueId={`copy-${imageIdShort}`}
              toolTip="Copy image ID"
              message="Image ID"
              icon={true}
            />
          </>
        );
      }

      ready = (container.status.ready ? "True" : "False");
      restartCount = container.status.restartCount;
      startTime = moment(container.pod.status.startTime).format("YYYY-MM-DD HH:mm:ss");

      if (container.status.hasOwnProperty("state")) {
        if (container.status.state.hasOwnProperty("running")) {
          state = "Running";
          started = moment(container.status.state.running.startedAt).format("YYYY-MM-DD HH:mm:ss");
        }
      }
    }

    var statusObject = (
      <i className="glyphicons glyphicons-power container-view-status container-on"></i>
    );

    if (ready !== "True" || state !== "Running") {
      statusObject = (
        <i className="glyphicons glyphicons-refresh table-loading" />
      );
    }

    // see if there is a problem with the pod
    var podStatusObj = h.view.helpers.pod.getPodStatus(container.pod, true);

    if (podStatusObj.statusProblem) {
      statusObject = (
        <i className="glyphicons glyphicons-power container-view-status container-off" />
      );
    }

    var containerList = self.state.container.hasOwnProperty("pod") ? self.state.container.pod.spec.containers : {};
    var containerMenu = self.containerMenu(containerList, self.state.container.metadata.name);

    var heading = (
      <div>
        <div className="container-view-name">
          <div className="container-status-icon">
            {statusObject}
          </div>
          <div className="container-view-menu">
            {containerMenu}
          </div>
        </div>
      </div>
    );

    var raw = {
      "Namespace": container.pod.metadata.namespace || "-",
      "Image(s)": images || "-",
      "Node": container.pod.spec.nodeName || "-",
      "Start Time": startTime || "-",
      "IP": container.pod.status.podIP || "-",
      "Rep. Controllers": replicationControllers || "-",
      "Container ID": containerId || "-",
      "Image": image || "-",
      "Image ID": imageId || "-",
      "State": state || "-",
      "Started": started || "-",
      "Ready": ready || "-",
      "Args": cArgs,
      "Commands": cComms,
      "Restart Count": restartCount || "-",
      "Labels": labels || "-"
    };

    var details = Object.keys(raw).map(function(key, j) {
      var val = raw[key];

      var valObj = (
        <span
          data-top
          data-for={`${val}-${j}`}
          data-place="right"
          className="container-prop-value">
          {val}
        </span>
      );

      if (val.toString().length > 30 && typeof (val) !== "object") {
        valObj = (
          <div>
            <span
              data-tip
              data-for={`${val}-${j}`}
              className="container-prop-value">
              {val}
            </span>

            <Tooltip
              id={`${val}-${j}`}
              type="dark"
              place="top"
              effect="float">
              {val}
            </Tooltip>
          </div>
        );
      }

      var line;

      if (key === "Labels") {
        line = (
          <div key={`${val}-${j}`} className="container-prop">
            <span className="container-prop-key">
              {key}
            </span>
            <span
              className="container-prop-value"
              style={{
                marginTop: "-3px"
              }}>
              {val}
            </span>
          </div>
        );
      } else {
        line = (
          <div key={`${val}-${j}`} className="container-prop">
            <span className="container-prop-key">
              {key}
            </span>
            {valObj}
          </div>
        );
      }

      return line;

    });

    return [heading, details];
  }

  renderEventsOrNoData(events) {
    var self = this;

    if (events && events.length > 0) {
      return (
        <ContainerEvents container={self.state.params.id} events={events} />
      );
    }

    if (self.state.loading) {
      return null;
    }

    return (
      <div className="container-noresult-wrapper">
        <NoResult
          title="No Events"
          body="There are no events for this container"
          icon="csicon csicon-events"
          style={{
            height: "100%"
          }}
        />
      </div>
    );
  }

  handleSelect(index) {
    var self = this;

    var params = self.state.params;
    params.tab = index;

    var url = `/datacenter/pods/${params.pod}/${params.id}/${params.tab}`;
    self.props.history.push(url);

    self.setState({
      params: params
    });
  }

  render() {
    var podDetail = (
      <div className="container-view-sidebar-loading">
        Retrieving pod information...
      </div>
    );

    var events = [];
    var activeTab = Number(this.state.params.tab) || 0;

    if (this.state.container.hasOwnProperty("metadata")) {
      podDetail = this.getPodDetail(this.state.container);

      if (this.state.container.hasOwnProperty("events") &&
        this.state.container.events.hasOwnProperty("items")) {
        events = this.state.container.events.items;
      }
    }

    return (
      <div className="container-view">
        <div className="container-view-sidebar">
          <div className="container-view-header">
            <Link to="/datacenter/pods">
              <i className="glyphicons glyphicons-chevron-left"></i>Return to Pods
            </Link>
            {this.makeMenu(this.state.container)}
          </div>
          <div className="pod-name fixed">
            {podDetail[0]}
          </div>
          <div className="scroll">
            {podDetail[1]}
          </div>
        </div>

        <div className="container-view-content">
          <Tabs
            onSelect={this.handleSelect.bind(this)}
            className="cs-tabs light"
            selectedIndex={activeTab}>

            <TabList>
              <Tab>
                <span className="tab-label">
                  <i className="glyphicons glyphicons-terminal-isolated tab-icon" />
                  <span>Shell</span>
                </span>
              </Tab>
              <Tab>
                <span className="tab-label">
                  <i className="glyphicons glyphicons-magic-wand tab-icon" />
                  <span>Logs</span>
                </span>
              </Tab>
              <Tab>
                <span className="tab-label">
                  <i className="csicon csicon-events tab-icon" />
                  <span>Events</span>
                </span>
              </Tab>

              {this.state.includeMetrics ? (
                <Tab>
                  <span className="tab-label">
                    <i className="glyphicons glyphicons-stats tab-icon" />
                    <span>Metrics</span>
                  </span>
                </Tab>
              ) : null}
            </TabList>

            <TabPanel>
              <ContainerTerminal
                attach={false}
                container={this.state.params.id}
                pod={this.state.params.pod} />
            </TabPanel>

            <TabPanel>
              <ContainerLogs container={this.state.params.id} pod={this.state.params.pod} />
            </TabPanel>

            <TabPanel>
              {this.renderEventsOrNoData(events)}
            </TabPanel>

            {this.state.includeMetrics ? (
              <TabPanel>
                <ContainerMetrics pod={this.state.params.pod} container={this.state.params.id} />
              </TabPanel>
            ) : null}
          </Tabs>
        </div>
      </div>
    );
  }
}

export default ContainerView;
