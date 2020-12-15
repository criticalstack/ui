"use strict";

import React from "react";
import AceEditor, { diff as DiffEditor } from "react-ace";
import h from "../lib/helpers";
import Mousetrap from "mousetrap";
import Session from "../lib/helpers/session";
import "mousetrap/plugins/global-bind/mousetrap-global-bind";
import _ from "lodash";
import "brace/mode/yaml";
import "brace/mode/json";
import "brace/theme/twilight";
import "brace/ext/searchbox";
import "brace/ext/whitespace";
import "brace/ext/error_marker";
import "brace/ext/language_tools";
import "brace/keybinding/vim";
import "brace/keybinding/emacs";
import YAML from "js-yaml";
import manifests from "./manifests/template";
import ButtonMaker from "./button-maker";
import SectionEditorSelect from "./section-editor-select";
import moment from "moment";
import resourceMetadata from "./manifests/resource-metadata";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { withStyles } from "@material-ui/core/styles";
import { RBACContext } from "./context/rbac";

const styles = {
  radioGroup: {
    flexDirection: "row",
    color: "#fff",
    marginLeft: "20px",
    userSelect: "none"
  },
  radioButton: {
    color: "#fff"
  }
};

class SectionEditor extends React.Component {
  constructor(props) {
    super(props);

    props.data.sort(function(a, b) {
      return (a.metadata.name > b.metadata.name) ? 1 : ((b.metadata.name > a.metadata.name) ? -1 : 0);
    });

    this.state = {
      index: props.index || props.data[0].metadata.uid,
      icon: props.icon,
      format: CSOS.localStorage.formats.data().editorFormat || "yaml",
      keyboardHandler: CSOS.localStorage.formats.data().editorMode || "",
      fontSize: CSOS.localStorage.formats.data().editorFontSize || 16,
      annotations: [],
      markers: [],
      resource: props.resource,
      mode: props.mode,
      current: false,
      versions: [],
      hasSaved: false,
      diffModeEnabled: false,
      documentData: []
    };
  }

  componentDidMount() {
    let self = this;
    self.editor = self.ace.editor;

    if (self.props.data.length > 0 && self.state.index !== "resources" && self.state.index !== "apprevisions") {
      self[self.state.index].scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    self.setData(self.state.index, true);

    h.Vent.addListener("SectionEditor:close", function() {
      self.onExit();
    });

    h.Vent.addListener("SectionEditor:error", function(err) {
      h.Vent.emit("notification", {
        message: `Syntax ${err.type} [Line ${err.actualRow} Column ${err.column}]: ${err.text}`
      });

      self.editor.getSession().setAnnotations([err]);
    });

    Mousetrap.bindGlobal([
      "ctrl+s",
      "command+s"
    ], function(e) {
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        // internet explorer
        e.returnValue = false;
      }

      self.onSave();
      return false;
    });

    Mousetrap.bindGlobal([
      "esc"
    ], function() {
      return false;
    });
  }

  componentDidUpdate() {
    if (this.state.mode === "edit") {
      let versions = this.state.versions;
      let last = versions[0];
      let update = this.getDataByIndex(this.state.index);
      let timestamp = moment().format("HH:mm:ss");

      if (last.version !== update.version) {
        let hasChanged = this.diffCheck(last.data, update.data);
        let updatedBy = _.get(update.data, "metadata.labels.updated-by", "unknown");

        if (hasChanged) {
          versions.unshift({
            version: update.version,
            updatedBy,
            timestamp,
            data: update.data,
            hasSaved: false
          });

          this.setState({
            versions
          });
        } else {
          let current = this.state.current;
          let lastUpdatedBy = _.get(current, "metadata.labels.updated-by", "unknown");

          if (updatedBy === lastUpdatedBy) {
            current = update.data;
          }
          versions[0].version = update.version;
          versions[0].data.metadata.resourceVersion = update.version;
          this.setState({
            versions,
            current: current
          });
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }

    h.Vent.removeAllListeners("SectionEditor:close");
    h.Vent.removeAllListeners("SectionEditor:error");

    Mousetrap.unbind([
      "ctrl+s",
      "command+s"
    ]);

    Mousetrap.unbind([
      "esc"
    ]);
  }

  diffCheck(last, current) {
    // when some resources are scaled the resource version is
    // continually updated until the process finishes but the
    // actual manifest doesn't change except the status and
    // the resource version. if this returns true we don't push
    // these updates onto the history stack, we simply update
    // the version on the last iteration.
    let lastMod = _.cloneDeep(last);
    let currentMod = _.cloneDeep(current);

    if (_.get(lastMod, "metadata.resourceVersion", false)) {
      delete lastMod.metadata.resourceVersion;
      delete lastMod.status;
    }

    if (_.get(currentMod, "metadata.resourceVersion", false)) {
      delete currentMod.metadata.resourceVersion;
      delete currentMod.status;
    }

    if (JSON.stringify(lastMod) === JSON.stringify(currentMod)) {
      return false;
    }

    return true;
  }

  getDataByIndex(index) {
    let modeActions = {
      edit: () => {
        let data = _.cloneDeep(_.find(this.props.data, {metadata: {uid: index}}));
        if (typeof data === "undefined") {
          data = _.cloneDeep(this.props.data[0]);
        }

        let updatedBy = _.get(data, "metadata.labels.updated-by", "unknown");
        let version = _.get(data, "metadata.resourceVersion", false);
        let timestamp = moment().format("HH:mm:ss");

        return {
          version,
          updatedBy,
          timestamp,
          data
        };
      },
      create: () => {
        let data = manifests(Session)[index];
        if (typeof data === "undefined") {
          data = "";
        }

        return {
          data
        };
      }
    };

    return modeActions[this.state.mode]();
  }

  getDataByVersion(version) {
    let data = _.find(this.state.versions, { version: version });
    return _.cloneDeep(data.data);
  }

  setData(index, init) {
    if (index === this.state.index && !init) {
      return false;
    }

    let data = this.getDataByIndex(index);
    let versions = [];
    versions.unshift(data);

    if (this.state.mode === "edit") {
      delete data.data.status;
    }

    let convertedData = this.convertToType(data.data);
    let newDocumentData = [...this.state.documentData];
    newDocumentData[0] = convertedData;

    if (this.state.mode === "create") {
      this.setState({
        index: index,
        resource: index,
        versions,
        current: data.data,
        documentData: newDocumentData
      });
      return false;
    }

    this.setState({
      index: index,
      versions,
      current: data.data,
      documentData: newDocumentData,
      diffModeEnabled: false,
    });
  }

  handleSelectChange(value) {
    let currentVersion = this.state.versions[0].version;

    if (currentVersion === value) {
      this.setState({
        diffModeEnabled: false,
      });
      return false;
    }

    let activeDiffData = this.getDataByVersion(value);
    let newDocumentData = [...this.state.documentData];

    if (this.state.mode === "edit") {
      delete activeDiffData.status;
    }

    newDocumentData[1] = this.convertToType(activeDiffData);

    this.setState({
      current: this.getDataByVersion(value),
      diffModeEnabled: true,
      documentData: newDocumentData
    });
  }

  convertToType(data) {
    if (this.state.format === "yaml") {
      return YAML.dump(data);
    } else {
      return JSON.stringify(data, null, "  ");
    }
  }

  onExit() {
    h.Vent.emit("edit:mode", false);
    h.Vent.emit("fullscreen-editor:emit:data", false, false);
    h.Vent.emit("fullscreen-editor", {editMode: false});
  }

  onSaveEdit() {
    let self = this;
    let manifest = false;

    if (this.editor) {
      if (this.state.diffModeEnabled) {
        manifest = this.onChange(this.state.documentData);
      } else {
        manifest = this.onChange(this.state.documentData[0]);
      }
    }

    if (!manifest) {
      h.Vent.emit("notification", {
        message: "Error: invalid manifest"
      });
    }

    let currentVersion = this.state.versions[0].version;
    let thisVersion = _.get(manifest, "metadata.resourceVersion", currentVersion);

    if (currentVersion === thisVersion) {
      self.onSaveEditAction(manifest, false);
      return false;
    }

    h.Vent.emit("layout:confirm:open", {
      open: true,
      title: "Warning!",
      message: "You are about to modify a resource that has already been updated. Your changes will overwrite what currently exists. Are you certain that you wish to continue?",
      primaryAction: "ok",
      onAction: function() {
        self.onSaveEditAction(manifest, currentVersion);
        h.Vent.emit("layout:confirm:close");
      }
    });
  }

  onSaveEditAction(manifest, version) {
    let self = this;

    if (version) {
      _.set(manifest, "metadata.resourceVersion", version);
    }

    let url = h.nsCheck(this.state.resource)
      ? h.ns(`/${this.state.resource}/${this.state.index}`, this.props.location)
      : `/${this.state.resource}/${this.state.index}`;

    if (this.props.nameIdentifier) {
      let selected = _.find(this.props.data, {metadata: {uid: this.state.index}});
      let name = selected.metadata.name;
      url = `/${this.state.resource}/${name}`;
    }

    h.fetch({
      method: "post",
      contentType: "application/x-www-form-urlencoded",
      endpoint: url,
      body: JSON.stringify(manifest),
      success: function(data) {
        self.setState({
          current: data.context.result,
          hasSaved: true
        });

        h.Vent.emit("notification", {
          message: "Save Complete"
        });
      },
      error: function(a) {
        h.Vent.emit("request-error:confirm-box", a);

        h.Vent.emit("notification", {
          message: "Error while saving..."
        });
      }
    });
  }

  onSaveCreate() {
    let self = this;
    let manifest = false;


    if (this.editor) {
      manifest = this.onChange(this.editor.getValue());
    }

    if (!manifest) {
      h.Vent.emit("notification", {
        message: "Error: invalid manifest"
      });
    }

    let kindToRouteMap = {
      Deployment: "/datacenter/deployments",
      ReplicaSet: "/datacenter/replica-sets",
      DaemonSet: "/datacenter/daemon-sets",
      StatefulSet: "/datacenter/stateful-sets",
      CronJob: "/datacenter/cron-jobs",
      Job: "/datacenter/jobs",
      Pod: "/datacenter/pods",
      Ingress: "/datacenter/ingress",
      Service: "/datacenter/services",
      Endpoints: "/datacenter/endpoints",
      PersistentVolumeClaim: "/datacenter/persistent-volume-claims",
      PersistentVolume: "/datacenter/persistent-volumes",
      StorageClass: "/datacenter/storage-classes",
      PodPreset: "/datacenter/pod-presets",
      NetworkPolicy: "/datacenter/network-policies",
      Secret: "/datacenter/secrets",
      ConfigMap: "/datacenter/config-maps",
      HorizontalPodAutoscaler: "/datacenter/horizontal-pod-autoscalers",
      ResourceQuota: "/datacenter/resource-quotas",
      LimitRange: "/datacenter/limit-ranges",
      StackApp: "/stackapps"
    };

    let url, redirect;

    if (this.props.hasOwnProperty("noReturn")) {
      url = "/";
    } else {
      let resource = self.state.resource;
      redirect = self.props.location.pathname;
      // check to see if the redirect path should be updated (eg. the case where
      // the user selects and creates a new resource type from the sidebar)
      let newRedirect = _.get(kindToRouteMap, manifest.kind, false);
      if (redirect !== "/datacenter/resources" && redirect !== newRedirect) {
        redirect = newRedirect;
      }

      url = h.nsCheck(resource)
        ? h.ns(`/${resource}`, this.props.location)
        : `/${resource}`;
    }

    h.fetch({
      method: "post",
      endpoint: url,
      body: JSON.stringify(manifest),
      success: function() {
        h.Vent.emit("notification", {
          message: "Save Complete"
        });

        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: "Resource Created",
          message: "The resource was successfully created. Would you like to exit the editor?",
          primaryAction: "ok",
          onAction: function() {
            h.Vent.emit("link", redirect);
            h.Vent.emit("layout:confirm:close");
            h.Vent.emit("edit:mode", false);
          }
        });
      },
      error: function(a) {
        h.Vent.emit("request-error:confirm-box", a);
        h.Vent.emit("notification", {
          message: "Error while saving..."
        });
      }
    });
  }

  onChange(data, event) {
    let results;
    h.Vent.emit("notification-close");

    let editorData = data;

    if (this.state.diffModeEnabled) {
      editorData = data[0];
      this.setState({
      documentData: [...data]
      });
    } else {
      let newDocumentData = [...this.state.documentData];
      newDocumentData[0] = data;
      this.setState({
        documentData: newDocumentData
      });
    }

    try {
      if (this.state.format === "yaml") {
        results = YAML.safeLoad(editorData);
      } else {
        results = JSON.parse(editorData);
      }
    } catch (e) {
      let row = _.get(event, "start.row", -1);

      const err = {
        row: row,
        actualRow: row + 1,
        column: _.get(event, "start.column", 0) + 2,
        type: "error",
        text: e.message
      };

      h.Vent.emit("SectionEditor:error", err, data);
      return;
    }

    this.editor.getSession().setAnnotations([]);

    return results;
  }

  renderSidebar() {
    let self = this;
    let names = [];
    let manifestList = manifests(Session);

    switch (this.state.mode) {
      case "edit":
        names = self.props.data.map(function(item, i) {
          return {
            index: i,
            name: item.metadata.name,
            uid: item.metadata.uid,
            kind: item.kind
          };
        });

        break;
      case "create":
        names = Object.keys(manifestList).map((m, i) => {
          let entry = manifestList[m];
          return {
            index: i,
            name: entry.kind,
            kind: entry.kind,
            uid: m
          };
        }).filter((entry) => {
          if (typeof entry.name !== "undefined") {
            return entry;
          }
        });

        break;
      default:
        names = [];
    }

    names = _.sortBy(names, "name");

    let lastIndex = "";

    return (
      <ul>
        {names.map(function(n) {
          let curIndex = n.name[0];
          let indexChar = curIndex !== lastIndex ? <div className="section-editor-indexchar">{curIndex}</div> : null;
          lastIndex = curIndex;
          let noIcon = "glyphicons glyphicons-package";
          let resourceIcon = _.get(resourceMetadata, `${n.kind}.icon`, noIcon);
          let resourceKind = self.state.mode === "edit" ?
            <div className="section-editor-item-kind">
              {n.kind}
            </div> : null;

          return (
            <div
              key={`s-${n.uid}`}
              ref={node => {
                self[n.uid] = node;
              }}
            >
              {indexChar}
              <li
                key={n.uid}
                style={{
                  height: self.state.mode === "edit" ? "60px" : "40px"
                }}
                className={self.state.index === n.uid ? "section-editor-item-current" : "section-editor-item"}
                onClick={() => self.setData(n.uid, false)}
              >
                <i title={n.kind} className={`${resourceIcon} section-editor-item-file`} />
                <div>
                  <div className="section-editor-item-name" title={n.name}>
                    {n.name}
                  </div>
                  {resourceKind}
                </div>
              </li>
            </div>
          );
        })}
      </ul>
    );
  }

  alterFont(action) {
    let min = 10;
    let max = 30;
    let current = this.state.fontSize;
    let newSize = current;

    switch (action) {
      case "up":
        if (current + 1 <= max) {
          newSize = current + 1;
        }
        break;
      case "down":
        if (current - 1 >= min) {
          newSize = current - 1;
        }
        break;
      default:
        return false;
    }

    if (window.localStorage.hasOwnProperty("csos-formats")) {
      CSOS.localStorage.formats.update({
        editorFontSize: newSize
      });
    }

    this.setState({
      fontSize: newSize
    });
  }

  toggleEditorOption(e) {
    let feature = e.currentTarget.name;
    let value = e.target.value;

    if (window.localStorage.hasOwnProperty("csos-formats")) {
      CSOS.localStorage.formats.update({
        [feature]: value
      });
    }

    this.setState({
      format: value
    });
  }
  // diff editor resize bug fix:
  // https://github.com/securingsincity/react-ace/issues/467
  diffOnLoad = editor => {
    window.addEventListener("resize", () => {
    editor.resize();
   });
  };

  render() {
    let versions = this.state.versions;
    let count = versions.length;
    let select = null;
    let data = _.get(versions[count - 1], "data", {});
    const classes = this.props.classes;
    if (this.state.current) {
      data = this.state.current;
    }

    if (this.state.mode === "edit") {
      delete data.status;
      let activeVersion = _.get(data, "metadata.resourceVersion", "");
      let actualVersion = _.get(versions[0], "data.metadata.resourceVersion", "");
      let update = false;

      if (activeVersion !== actualVersion) {
        update = true;
      }

      let ess = count > 1 ? "s" : "";

      let prefix = update ?
        <div
          className="section-editor-updated warn"
          title="this resource has a newer version"
        >
          <i className="glyphicons glyphicons-bell-ringing animated rubberBand" />
          <b>{count}</b> version{ess}:
        </div> :
        <div
          className="section-editor-updated check"
          title="this resource is current"
        >
          <i className="glyphicons glyphicons-check" />
          <b>{count}</b> version{ess}:
        </div>;

      select = (
        <SectionEditorSelect
          icon={this.state.icon}
          component="change-namespaces"
          data={this.state.versions}
          format={this.state.format}
          value={activeVersion}
          buttonClass="btn-header"
          prefix={prefix}
          action={(value) => this.handleSelectChange(value)}
        />
      );
    }

    if (data.hasOwnProperty("events")) {
      delete data.events;
    }

    let resourceAccess = _.get(resourceMetadata, `${this.state.current.kind}.resourceAccess`, "None");

    let buttons = {
      create: [
        {
          type: "reset",
          action: () => {
            this.editor.setValue(this.convertToType(manifests(Session)[this.state.resource]));
            this.editor.clearSelection();
          }
        },
        {
          type: "clear",
          action: () => {
            this.editor.setValue("");
            this.editor.clearSelection();
          }
        },
        {
          type: "create",
          ...(_.get(this.context.access, [resourceAccess, "create"], true) ? {} : {disabled: true}),
          action: () => this.onSaveCreate()
        }
      ],
      edit: [
        {
          type: "save",
          ...(_.get(this.context.access, [resourceAccess, "update"], true) ? {} : {disabled: true}),
          action: () => this.onSaveEdit()
        }
      ]
    };

    let exit = this.props.hasOwnProperty("onExit")
      ? () => this.props.onExit()
      : () => this.onExit();

    let title = this.props.hasOwnProperty("title")
      ? this.props.title
      : "Return";

    let resourceDoc = _.get(resourceMetadata, `${data.kind}.doc`, false);
    let docLink = resourceDoc ?
      <a
        href={resourceDoc}
        target="_new"
        rel="noopener"
        data-balloon="View Documentation"
        data-balloon-pos="up"
      >
        <i className="glyphicons glyphicons-circle-question" />
      </a>
      : "";

    const hasReturn = !this.props.hasOwnProperty("noReturn") ?
      <div
        className="section-editor-return"
        onClick={exit}
      >
        <i className="glyphicons glyphicons-chevron-left"></i>{title}
      </div> : <div style={{marginLeft: "10px"}}>Create resource</div>;

    return (
      <div id={this.props.id} className="section-editor">

        <div className="section-editor-header">

          <div className="section-editor-header-left">
            {hasReturn}
            <div className="section-editor-help">
              {docLink}
            </div>
          </div>

          <div className="section-editor-header-right">
            <div className="section-editor-buttons">
              <div className="se-font">
                <i
                  className="glyphicons glyphicons-text-smaller"
                  onClick={() => this.alterFont("down")}
                  title="make text smaller"
                />
                <i
                  className="glyphicons glyphicons-text-bigger"
                  onClick={() => this.alterFont("up")}
                  title="make text bigger"
                />
              </div>
              <div className="se-radio-group">
                <RadioGroup
                  onChange={(e) => this.toggleEditorOption(e)}
                  name="editorFormat"
                  value={this.state.format}
                  className={classes.radioGroup}
                >
                  <FormControlLabel
                    control={
                      <Radio className={classes.radioButton} />
                    }
                    value="json"
                    label="JSON"
                  />
                  <FormControlLabel
                    control={
                      <Radio className={classes.radioButton} />
                    }
                    value="yaml"
                    label="YAML"
                  />
                </RadioGroup>
              </div>
            </div>

            <div className="section-editor-buttons">
              {select}
              <ButtonMaker
                buttons={buttons[this.props.mode]}
              />
            </div>
          </div>
        </div>

        <div className="section-editor-sidebar">
          <div className="section-editor-item-list">
            {this.state.mode === "create" ?
              <div className="section-editor-sidebar-helper">
                <i className="glyphicons glyphicons-circle-empty-info" />
                To create a resource simply paste a valid manifest
                into the editor on the right and click "create".
                If you want to start from a basic template click on one
                of the resource kinds below.
              </div> : null
            }
            {this.renderSidebar()}
          </div>
          <div className="section-editor-sidebar-icon">
            <i
              className={this.state.icon}
            />
          </div>
        </div>

        <div className="section-editor-body">

          {this.state.diffModeEnabled ? <DiffEditor
            ref={node => {
              this.ace = node;
            }}
            height="100%"
            width="100%"
            mode={this.state.format}
            showGutter={true}
            highlightActiveLine={true}
            tabSize={2}
            enableBasicAutocompletion={true}
            enableLiveAutocompletion={true}
            enableSnippets={false}
            wrapEnabled={false}
            fontSize={this.state.fontSize}
            theme="twilight"
            onChange={(v, e) => this.onChange(v, e)}
            name="section-content-diff-editor"
            value={this.state.documentData}
            keyboardHandler={this.state.keyboardHandler}
            annotations={this.state.annotations}
            markers={this.state.markers}
            cursorStart={1}
            setOptions={{
              behavioursEnabled: true,
              enableBasicAutocompletion: true,
              tabSize: 2,
              useSoftTabs: true,
              showInvisibles: false
            }}
            editorProps={{
              $useWorker: false,
              $blockScrolling: Infinity
            }}
            onLoad={this.diffOnLoad}
            /> :
          <AceEditor
          ref={node => {
            this.ace = node;
          }}
          height="100%"
          width="100%"
          mode={this.state.format}
          showGutter={true}
          highlightActiveLine={true}
          tabSize={2}
          enableBasicAutocompletion={true}
          enableLiveAutocompletion={true}
          enableSnippets={false}
          wrapEnabled={false}
          fontSize={this.state.fontSize}
          theme="twilight"
          onChange={(v, e) => this.onChange(v, e)}
          name="section-content-editor"
          value={this.state.documentData[0]}
          keyboardHandler={this.state.keyboardHandler}
          annotations={this.state.annotations}
          markers={this.state.markers}
          cursorStart={1}
          setOptions={{
            behavioursEnabled: true,
            enableBasicAutocompletion: true,
            tabSize: 2,
            useSoftTabs: true,
            showInvisibles: false
          }}
          editorProps={{
            $useWorker: false,
            $blockScrolling: "Infinity"
          }}
        />}
        </div>
      </div>
    );
  }
}

SectionEditor.contextType = RBACContext;

export default withStyles(styles)(SectionEditor);
