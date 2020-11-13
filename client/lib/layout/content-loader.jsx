"use strict";

import React from "react";
import h from "../helpers";
import _ from "lodash";
import ContentTitle from "./content-title";
import NoResult from "../../shared/no-result";
import LoaderMaker from "../../shared/loader-maker";
import SectionEditor from "../../shared/section-editor";
import Session from "../helpers/session";
import Forbidden from "../../shared/forbidden";
import { RBACContext } from "../../shared/context/rbac";

class ContentLoader extends React.Component {
  constructor(props) {
    super(props);

    let self = this;

    self.state = {
      data: [],
      metadata: [],
      exData: {},
      initData: [],
      filters: {},
      loading: true,
      editMode: false, // create | edit | false
      includeMetrics: CSOS.localStorage.metrics.data()[props.config.endpoint] || false,
      namespace: Session.namespace(),
      index: 0,
      limitEnable: true,
      limit: 100
    };
  }

  componentDidMount() {
    let self = this;
    self.fetchState();

    h.Vent.addListener("content-loader:fetch:state", function() {
      self.destroyState();
      self.fetchState();
    });

    h.Vent.addListener(`${self.props.config.endpoint}-table-search`, function(obj) {
      h.Vent.emit("table:reset:checkboxes", null);

      self.destroyState(function() {

        let location = self.props.config.location;
        location.search = obj.search;

        self.setState({
          data: [],
          loading: true,
          location: location
        }, function() {
          self.fetchState(obj.callback);
        });

      });
    });

    if (_.get(self.props.config, "editor", false)) {
      h.Vent.addListener("edit:mode", function(id, mode) {

        if (id === false) {
          mode = false;
        }

        self.setState({
          index: id,
          editMode: mode,
        });
      });
    }

    h.Vent.addListener("fullscreen-editor:emit:data", function(uid, editMode) {
      let params = {
        config: self.props.config,
        data: self.state.data,
        index: uid,
        editMode: editMode
      };

      h.Vent.emit("fullscreen-editor", params);
    });
  }

  fetchState(callback) {
    let self = this;

    let config = self.props.config;
    let resUrl = config.hasOwnProperty("resUrl")
      ? config.resUrl
      : true;

    let namespaced = config.hasOwnProperty("namespaced")
      ? config.namespaced
      : true;

    let query = config.hasOwnProperty("query")
      ? config.query
      : false;

    let url = namespaced
      ? h.ns(`/${config.endpoint}`, config.location)
      : `/${config.endpoint}`;

    h.fetch({
      endpoint: url,
      resUrl: resUrl,
      query,
      success: function(data) {
        h.log.info(`${config.endpoint}: `, data);

        const result = data.context.result || [];
        let metadata = [];
        const hasMetadata = _.get(config, "metadata", false);

        if (hasMetadata) {
          metadata = _.get(data.context, hasMetadata, []);
        }

        if (config.endpoint === "events") {
          if ((self.state.limitEnable && result.length >= self.state.limit)) {
            result = result.slice(0, self.state.limit);
          }
        }

        self.setState({
          data: result,
          metadata,
          loading: false,
          namespace: Session.namespace()
        });

        // if a feature requires other data it will be fetched here and
        // emitted back to the parent.
        if (config.hasOwnProperty("exData")) {
          config.exData.map(function(md) {
            h.fetch({
              endpoint: h.ns(`/${md}`, config.location),
              success: function(d) {
                let exd = d.context.result || [];
                let exData = self.state.exData;
                _.set(exData, md, exd);
                let baseData = self.state.data;

                if (config.hasOwnProperty("exDataAction")) {
                  let augmentedData = config.exDataAction(baseData, exd);
                  _.set(exData, md, exd);

                  self.setState({
                    data: augmentedData,
                    exData: exData
                  });
                }
              }
            });
          });
        }

        self.loadWebsocket(data.context.resourceVersion);

        if (_.isFunction(callback)) {
          return callback();
        }
      },
      error: function() {
        self.setState({
          loading: false,
        });
      }
    });
  }

  destroyState(callback) {
    let self = this;
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

  componentWillUnmount() {
    let self = this;
    self.destroyState();
    h.Vent.removeAllListeners("content-loader:fetch:state");
    h.Vent.removeAllListeners(`${self.props.config.endpoint}-table-search`);
    h.Vent.removeAllListeners("fullscreen-editor:emit:data");
    if (_.get(self.props.config, "editor", false)) {
      h.Vent.removeAllListeners("edit:mode");
    }
  }

  loadWebsocket(resourceVersion) {
    let self = this;

    let endpoint = self.props.config.hasOwnProperty("websocket")
      ? self.props.config.websocket
      : self.props.config.endpoint;

    if (!endpoint) {
      return;
    }

    let apiVersion = self.props.config.hasOwnProperty("api")
      ? `${self.props.config.api}`
      : "";

    if (CSOS.ignoreWebsocket || self.props.config.ignoreWebsocket) {
      return;
    }

    self.websocket = h.websocket({
      action: "watch-resource",
      api: apiVersion,
      resourceType: endpoint,
      resourceVersion: resourceVersion
    });

    self.websocket.onerror = function(e) {
      h.log.error(e);
    };

    self.websocket.onmessage = function(event) {
      let json = JSON.parse(event.data);
      h.log.info("WS:", event, json);

      if (json.type === "ADDED") {
        let aData = self.state.data;
        aData.unshift(json.object);

        if (self.props.config.endpoint === "events") {
          if (self.state.limitEnable && aData.length >= self.state.limit) {
            aData.pop();
          }
        }

        self.setState({
          data: aData
        });

        return;
      }

      if (json.type === "DELETED") {
        _.each(self.state.data, function(p, dnpi) {
          if (p && p.metadata.uid === json.object.metadata.uid) {
            self.state.data.splice(dnpi, 1);

            self.setState({
              data: self.state.data.filter(Boolean)
            });
          }
        });
      }

      if (json.type === "MODIFIED") {
        let has = false;

        // these are rare and very noisy so we ignore the updates to them.
        // this is hacky but should have little impact.
        if (json.object.kind === "ConfigMap") {
          let key = "control-plane.alpha.kubernetes.io\/leader";
          let leaderCheck = _.get(json.object.metadata.annotations, [key], false);

          if (leaderCheck) {
            return;
          }
        }

        _.each(self.state.data.filter(Boolean), function(p, i) {
          if (p.metadata.uid === json.object.metadata.uid) {
            has = true;

            let data = self.state.data;
            data[i] = json.object;

            self.setState({
              data: data
            });

            return;
          }
        });

        if (!has) {
          let data = self.state.data;
          data.push(json.object);
          self.setState({
            data: data
          });
        }
      }
    };
  }

  toggleMetrics() {
    let self = this;

    let value = !self.state.includeMetrics;

    self.setState({
      includeMetrics: value
    }, function() {
      CSOS.localStorage.metrics.update({
        [self.props.config.endpoint]: value
      });
    });
  }

  renderContentOrNoData() {
    let self = this;
    let config = self.props.config;
    let bypass = _.get(config, "noResultBypass", false);

    if (self.state.loading) {
      return <LoaderMaker id={`${self.props.config.endpoint}-nodata`} config="no-data-large" />;
    }

    if (self.state.data.length > 0 || bypass) {
      let element = config.hasOwnProperty("table")
        ? config.table
        : config.content;

      let content = React.cloneElement(
        element,
        {
          loading: self.state.loading,
          data: self.state.data,
          metadata: self.state.metadata,
          history: self.props.history,
          includeMetrics: self.state.includeMetrics,
          route: config.endpoint
        }
      );

      return content;
    }

    return (
      <NoResult
        title={config.noResultTitle}
        body={config.noResultBody}
        icon={config.icon}
      />
    );
  }

  render() {
    let self = this;
    let icon = self.props.config.icon;
    let data = self.state.data;
    let count = data ? data.length : 0;
    let menu = {};

    let hasMetricsArg = self.props.config.hasOwnProperty("metrics") ? true : false;
    let ignoreMetrics = true;

    if (hasMetricsArg) {
      ignoreMetrics = !self.props.config.metrics;
    }

    let hasEditorArg = self.props.config.hasOwnProperty("editor") ? true : false;
    let ignoreEditor = true;

    if (hasEditorArg) {
      ignoreEditor = !self.props.config.editor;
    }

    let hasMenuArg = self.props.config.hasOwnProperty("menu") ? true : false;
    let hasMenu = true;

    if (hasMenuArg) {
      hasMenu = self.props.config.menu;
    }

    if (hasMenu === true) {
      menu = {
        "entries": {
          0: {
            "icon": "glyphicons glyphicons-dashboard menu-icon",
            "name": "Display Metrics",
            "ignore": ignoreMetrics,
            "toggle": {
              state: self.state.includeMetrics
            },
            "link": function() {
              self.toggleMetrics();
            }
          },
          1: {
            "icon": "glyphicons glyphicons-terminal menu-icon",
            "name": "Shell",
            "link": function() {
              h.Vent.emit("section:drawer:toggle");
            }
          },
          2: {
            "icon": "csicon csicon-settings-editor menu-icon",
            "name": "Edit Mode",
            "ignore": ignoreEditor,
            "link": function() {
              self.setState({
                editMode: "edit",
                index: null
              });
            }
          },
          3: {
            "icon": "csicon csicon-events menu-icon",
            "name": "All Events",
            "link": function() {
              h.Vent.emit("link", `/datacenter/events?fieldSelector=involvedObject.kind=${self.props.config.events}`);
            }
          }
        },
        "args": {
          "label": "Options",
          "icon": "csicon csicon-gear menu-icon-sub-header",
          "type": "options"
        }
      };
    }

    let noButtons = self.props.config.hasOwnProperty("noButtons") ? self.props.config.noButtons : false;
    let noTitle = self.props.config.hasOwnProperty("noTitle") ? self.props.config.noTitle : false;

    let html;

    if (self.state.editMode) {
      html = (
        <SectionEditor
          id={self.props.config.endpoint}
          resource={self.props.config.endpoint}
          data={data}
          icon={icon}
          index={self.state.index}
          nameIdentifier={self.props.config.nameIdentifier}
          location={self.props.config.location}
          title={self.props.config.title}
          mode={self.state.editMode}
          resourceAccess={self.props.config.endpoint}
        />
      );
    } else {
      html = [
        ...(noTitle ? [] : [<ContentTitle
          key="1"
          icon={icon}
          menu={menu}
          editor={self.props.config.editor}
          route={self.props.config.endpoint}
          title={self.props.config.title}
          count={count}
          noButtons={noButtons}
          resource={self.props.config.endpoint}
        />]),
        <div key="2" className={`content-body-${self.props.config.endpoint}`}>
          {
            self.props.config.hasOwnProperty("endpoint") ? (
              _.get(self.context.access, [self.props.config.endpoint, "list"], true) ? (self.renderContentOrNoData()) : <Forbidden />
            ) : (self.renderContentOrNoData())
          }
        </div>
      ];
    }

    return html;
  }
}

ContentLoader.contextType = RBACContext;

export default ContentLoader;
