"use strict";

import React from "react";
import Session from "../helpers/session";

import h from "../helpers";
import _ from "lodash";
import uuid from "uuid4";

import DialogMaker from "../../shared/dialog-maker";

import TextField from "@material-ui/core/TextField";
import Checkbox from "@material-ui/core/Checkbox";
import Switch from "@material-ui/core/Switch";

import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Select from "@material-ui/core/Select";

import HostSelectorMaker from "../../shared/host-selector-maker";
import EnvVarMaker from "../../shared/env-var-maker";
import LabelMaker from "../../shared/label-maker";
import SelectorMaker from "../../shared/selector-maker";
import LabelEditor from "../../shared/label-editor";
import TransferList from "../stackapps/transfer-list";
import StackValueForm from "../stackapps/stackvalue-form";
import manifests from "../../shared/manifests/template";
import resourceMetadata from "../../shared/manifests/resource-metadata";
import cronParser from "cron-parser";
import {
  formSchema as formSchemaSecret,
  uiSchema as uiSchemaSecret } from "../datacenter/secrets/form-schema";
import {
  formSchema as formSchemaPvc,
  uiSchema as uiSchemaPvc } from "../datacenter/persistent-volume-claims/form-schema";
import {
  formSchema as formSchemaConfigMap,
  uiSchema as uiSchemaConfigMap } from "../datacenter/config-maps/form-schema";
import Mousetrap from "mousetrap";
import "mousetrap/plugins/global-bind/mousetrap-global-bind";
import LoaderMaker from "../../shared/loader-maker";
import ServiceForm from "../datacenter/services/form";

class ManifestDialogSimple extends React.Component {
  constructor(props) {
    super(props);

    this.editor = null;

    this.state = {
      advanced: {
        show: false,
        index: false
      },
      open: false,
      small: false,
      title: "",
      formData: {},
      icon: props.icon,
      type: props.type,
      data: {},
      form: [],
      exData: {},
      selected: {},
      autoComplete: {
        "image": {
          entries: [],
          matches: []
        }
      },
      tlData: {
        data: {
          a: [],
          b: []
        },
        metadata: []
      }
    };
  }

  updateExData(type) {
    let self = this;
    if (type) {
      let exData = {};
      let m = manifests(Session)[type];

      // check for any dependent data
      if (m.hasOwnProperty("exData")) {
        m.exData.map((entry) => {
          let endpoint = _.get(entry, "absolute", false) ? `/${entry.endpoint}` : h.ns(`/${entry.endpoint}`, self.state.location);
          let key = _.get(entry, "key", entry.endpoint);
          let resUrl = _.get(entry, "resUrl", true);
          let query = _.get(entry, "query", false);

          h.fetch({
            endpoint,
            query,
            resUrl,
            success: function(data) {
              let result = data.context.result || [];
              _.set(exData, key, result);
              self.setState({
                exData: exData
              });

              if (type === "stackapp-simple" && key === "resources") {
                result.sort(function(a, b) {
                  return (a.metadata.name > b.metadata.name) ? 1 : ((b.metadata.name > a.metadata.name) ? -1 : 0);
                });

                let noIcon = "glyphicons glyphicons-package";
                let tlMetadata = {};
                let ignoreList = _.get(data.context, "ignore", []).map((r) => {
                  return r.uid;
                });

                let potentialStackValues = _.get(data.context, "potentialStackValues", []).map((r) => {
                  return r.uid;
                });

                let a = [];
                let b = [];
                result.map((r) => {
                  let icon = _.get(resourceMetadata, `${r.kind}.icon`, noIcon);
                  let ignore = ignoreList.includes(r.metadata.uid);
                  let potentialStackValue = potentialStackValues.includes(r.metadata.uid);

                  tlMetadata[r.metadata.uid] = {
                    name: r.metadata.name,
                    kind: r.kind,
                    icon,
                    ignore,
                    potentialStackValue
                  };

                  if (ignore && !potentialStackValue) {
                    b.push(r.metadata.uid);
                  } else {
                    a.push(r.metadata.uid);
                  }
                });

                self.setState({
                  tlData: {
                    data: {
                      a,
                      b
                    },
                    metadata: tlMetadata
                  },
                });
              }
            }
          });
        });
      }
    }
  }

  bindEvents() {
    let self = this;

    h.Vent.addListener("layout:manifest-dialog-simple:open", function(params) {
      let manifestType = params.type;

      let m = manifests(Session)[manifestType];

      let aIndex = _.findIndex(m.form, {"type": "advanced"});

      self.updateExData(params.type);

      let isNamespaced = params.hasOwnProperty("namespaced")
        ? params.namespaced
        : true;

      self.setState({
        advanced: {
          show: false,
          index: aIndex
        },
        open: params.open,
        icon: params.icon,
        title: params.title,
        small: params.small || false,
        endpoint: params.endpoint,
        namespaced: isNamespaced,
        callback: params.callback || false,
        onSuccess: params.onSuccess || false,
        form: m.form,
        data: m.manifest,
        type: manifestType,
        exData: {},
        selected: {},
        errors: false,
        tlData: {
          data: {
            a: [],
            b: []
          },
          metadata: []
        }
      }, function() {
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

          self.submitForm();
          return false;
        });
      });
    });

    // listener for labels and environment variable controls
    h.Vent.addListener("manifest-dialog-simple:labels", function(params) {

      let data = self.state.data;
      _.set(data, params.path, params.labels);

      if (params.format === "label") {
        // push onto selector
        let selectors = Object.assign({}, params.labels);
        if (selectors.hasOwnProperty("created-by")) {
          delete selectors["created-by"];
        }

        let existingSelectors = _.get(data, "spec.selector.matchLabels", false);
        _.set(data, "spec.selector.matchLabels", Object.assign({}, existingSelectors, selectors));
      }

      self.setState({
        data: data,
        labelsOpen: false
      });
    });
  }

  componentDidMount() {
    this.bindEvents();
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("layout:manifest-dialog-simple:open");
    h.Vent.removeAllListeners("manifest-dialog-simple:labels");
  }

  handleClose() {
    this.setState({
      open: false,
      formData: {},
      data: {},
      form: [],
      exData: {}
    }, function() {

      Mousetrap.unbind([
        "ctrl+s",
        "command+s"
      ]);

      Mousetrap.unbind([
        "esc"
      ]);

    });
  }

  submitForm() {
    let self = this;

    // return if we have any flagged form errors
    let errorCount = 0;
    self.state.form.map(function(fe) {
      if (fe.hasOwnProperty("error")) {
        if (fe.error === true) {
          errorCount++;
        }
      }
    });

    if (errorCount > 0) {
      h.Vent.emit("notification", {
        message: `Error(${errorCount}): You have form errors. To proceed, please correct the highlighted fields.`
      });
      return false;
    }

    let data = self.state.data;

    // check if we have enough info to add a pvc. if we don't, we need to
    // remove the boiler plate or creation will fail
    let pvcPaths = {
      cronjobs: {
        pvcTest: "spec.jobTemplate.spec.template.spec.volumes[0].persistentVolumeClaim.claimName",
        pvcPath: "spec.jobTemplate.spec.template.spec.containers[0].volumeMounts[0].mountPath"
      },
      daemonsets: {
        pvcTest: "spec.template.spec.volumes[0].persistentVolumeClaim.claimName",
        pvcPath: "spec.template.spec.containers[0].volumeMounts[0].mountPath"
      },
      deployments: {
        pvcTest: "spec.template.spec.volumes[0].persistentVolumeClaim.claimName",
        pvcPath: "spec.template.spec.containers[0].volumeMounts[0].mountPath"
      },
      podpresets: {
        pvcTest: "spec.volumes[0].persistentVolumeClaim.claimName",
        pvcPath: "spec.volumeMounts[0].mountPath"
      }
    };

    let pvcTest = _.get(pvcPaths, `${self.state.endpoint}.pvcTest`, false);
    let pvcPath = _.get(pvcPaths, `${self.state.endpoint}.pvcPath`, false);
    let defaultPath = "/tmp";

    if (pvcTest) {

      if (!_.get(data, pvcTest)) {
        // deployments
        if (_.get(data, "spec.template.spec.containers[0].volumeMounts")) {
          delete data.spec.template.spec.volumes;
          delete data.spec.template.spec.containers[0].volumeMounts;
        }

        // cronjobs
        if (_.get(data, "spec.jobTemplate.spec.template.spec.containers[0].volumeMounts")) {
          delete data.spec.jobTemplate.spec.template.spec.volumes;
          delete data.spec.jobTemplate.spec.template.spec.containers[0].volumeMounts;
        }

        // pod presets
        if (_.get(data, "spec.volumeMounts")) {
          delete data.spec.volumes;
          delete data.spec.volumeMounts;
        }

      } else {
        // set default path if none was specified
        if (!_.get(data, pvcPath)) {
          _.set(data, pvcPath, defaultPath);
        }
      }
    }

    let endpoint = self.state.namespaced
      ? h.ns(`/${self.state.endpoint}`, self.props.location)
      : `/${self.state.endpoint}`;

    h.fetch({
      method: "post",
      endpoint,
      body: JSON.stringify(self.state.data),
      success: function(r) {
        h.Vent.emit("notification", {
          message: "Save Complete"
        });

        self.handleClose();

        if (self.state.callback && typeof self.state.callback === "function") {
          return self.state.callback(r);
        }

        if (self.state.onSuccess && typeof self.state.onSuccess === "function") {
          self.state.onSuccess();
        }
      },
      error: function(a) {
        h.Vent.emit("request-error:confirm-box", a);

        h.Vent.emit("notification", {
          message: "Error while saving..."
        });
      }
    });
  }

  testValue(r, v, i) {
    let formControl = this.state.form[i];
    let result = false;

    if (!r.test(v)) {
      result = true;
    }

    _.set(formControl, "error", result);

    this.setState({
      [formControl]: formControl
    });

    return result;
  }

  convertValue(a) {
    let multipliers = {
      "Mi": 1.049e+6,
      "Gi": 1.074e+9,
      "Ti": 1.1e+12,
      "Pi": 1.126e+15,
      "m": 0.001,
      "k": 1.024e+3
    };

    let re = /\D+$/;

    let aa = re.exec(a);
    if (aa !== null) {
      a = a.replace(/\D/g, "") * multipliers[aa[0]] || 0;
    }

    return Number(a);
  }

  buildControls() {
    let self = this;

    let c = self.state.form.map(function(v, i) {

      let control;

      if (self.state.advanced.index !== -1) {
        if (!self.state.advanced.show) {
          if (i > self.state.advanced.index) {
            return;
          }
        }
      }

      function handleAdvanced(e, d) {
        let data = self.state;

        _.set(data, v.key, d);

        self.setState({
          [data]: data
        });
      }

      function handleAuto(e) {
        let data = self.state.data;
        let acParent = self.state.autoComplete[v.source];
        let dataValue = e.target.getAttribute("data-value");
        let wasSelected = dataValue !== null ? true : false;
        let value = "";
        let matches = [];

        if (wasSelected) {
          // autocomplete was clicked
          value = dataValue;
        } else {
          // typed input
          value = e.target.value;
          matches = acParent.entries.filter(function(entry) {
            return entry.toLowerCase().indexOf(value.toLowerCase()) > -1;
          });
        }

        // add version label to created resource
        if (v.source === "image") {
          let version = value.split(":")[1] || "latest";

          if (version.length > 0) {
            _.set(data, v.label, version);
            _.set(data, "spec.selector.matchLabels.version", version);
          } else {
            _.unset(data, v.label);
            _.unset(data, "spec.selector.matchLabels.version");
          }
        }

        _.set(data, v.key, value);
        _.set(acParent, "matches", matches);

        self.setState({
          data: data,
          [acParent]: acParent
        });

        if (v.hasOwnProperty("test")) {
          if (self.testValue(v.test, value, i)) {
            return;
          }
        }
      }

      function handleText(e) {
        let data = self.state.data;
        let value = e.target.value;

        if (v.hasOwnProperty("test")) {
          if (self.testValue(v.test, value, i)) {
            return;
          }
        }

        // add app name label to created resource
        if (v.hasOwnProperty("source") && v.source === "name") {
          if (v.hasOwnProperty("sub")) {
            _.set(data, v.sub, value);
            _.set(data, "spec.selector.matchLabels.app", value);
          }

          if (value.length > 0) {
            _.set(data, v.label, value);
          } else {
            _.unset(data, v.label);
          }
        }

        // if the manifest has a secondary place it wants this
        // value, set it here.
        if (v.hasOwnProperty("sub")) {
          _.set(data, v.sub, value);
        }

        // check destination type and act accordingly
        if (_.get(data, v.key).constructor === Array) {
          _.get(data, v.key).splice(0, 1, value);
        } else {
          _.set(data, v.key, value);
        }

        self.setState({
          data: data
        });
      };

      function handleCheck(e, d) {
        let data = self.state.data;

        _.set(data, v.key, d);

        self.setState({
          [data]: data
        });
      };

      function handleConfigMapSelect(e) {
        let data = self.state.data;
        let key = v.key;
        let value = e.target.value;

        if (value === "" ) {
          return;
        }

        if (value === "csCreateNewConfigMap") {

          h.Vent.emit("layout:form-dialog:open", {
            open: true,
            schema: formSchemaConfigMap.configMaps,
            uiSchema: uiSchemaConfigMap.configMaps,
            title: "Create Config Map",
            icon: "glyphicons glyphicons-notes",
            small: true,
            onAction: function(form, callback) {

              let flat = {};
              _.each(form.data, function(item) {
                flat[item.key] = item.value;
              });

              form.data = flat;

              let annotatedForm = h.view.helpers.addCsAnnotations(form);

              h.fetch({
                method: "post",
                endpoint: h.ns("/configmaps"),
                body: JSON.stringify(annotatedForm),
                success: function() {
                  h.Vent.emit("notification", {
                    message: "Save Complete"
                  });

                  self.state.exData.configmaps.push(form);

                  _.set(data, key, form.metadata.name);

                  self.setState({
                    [data]: data
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                },
                error: function(a) {
                  h.Vent.emit("request-error:confirm-box", a);

                  h.Vent.emit("notification", {
                    message: "Error while saving..."
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                }
              });
            }
          });

          return false;

        }

        _.set(data, key, value);

        self.setState({
          [data]: data
        });
      }

      function handleCron(e) {
        let data = self.state.data;
        let value = e.target.value;
        let cronControl = self.state.form[i];
        let cronError = "";
        let errorState = false;
        let newSchedule;

        if (v.type === "cronAdvanced") {
          let cref = e.target.id;
          let schedule = _.get(data, v.key, "* * * * *").split(" ");

          let cMinute = cref === "cron-minute" ? value : schedule[0] || "*";
          let cHour = cref === "cron-hour" ? value : schedule[1] || "*";
          let cDay = cref === "cron-day" ? value : schedule[2] || "*";
          let cMonth = cref === "cron-month" ? value : schedule[3] || "*";
          let cWeek = cref === "cron-week" ? value : schedule[4] || "*";

          newSchedule = [
            cMinute,
            cHour,
            cDay,
            cMonth,
            cWeek
          ].join(" ");

          try {
            cronParser.parseExpression(newSchedule);
          } catch (err) {
            errorState = true;
            cronError = err.message;
          }

        } else {
          cronControl = self.state.form[i + 1];
          newSchedule = value;
        }

        _.set(cronControl, "error", errorState);
        _.set(cronControl, "errorMsg", cronError);
        _.set(data, v.key, newSchedule);

        self.setState({
          [cronControl]: cronControl,
          data: data
        });
      };

      function handleEnvVariables() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: "Add Environment Variables",
          message: <LabelEditor
            data={self.state.data}
            path={v.key}
            reportBack={true}
            format="env-var"
          />,
          disableButtons: true
        });
      }

      function handleHostSelector() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: "Add Host Selectors",
          message: <LabelEditor
            data={self.state.data}
            path={v.key}
            reportBack={true}
            format="string"
          />,
          disableButtons: true
        });
      }

      function handleLabels() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: v.title,
          message: <LabelEditor
            data={self.state.data}
            path={v.key}
            reportBack={true}
            format={v.type.slice(0, -1)}
          />,
          disableButtons: true
        });
      }

      function handlePersistentVolumeSelect(e) {
        let data = self.state.data;
        let key = "spec.volumeName";
        let value = e.target.value;

        _.set(data, key, value);

        let pvs = _.get(self.state, "exData.persistentvolumes", null);

        if (pvs !== null) {
          let annotations = false;

          for (let pv = 0; pv < pvs.length; pv++) {
            if (`pvc-${_.get(pvs[pv], "metadata.uid", 0)}` === value) {
              annotations = _.get(pvs[pv], "metadata.annotations", false);
            }
          }

          if (annotations) {
            _.set(data.metadata.annotations, annotations);
          }
        }

        self.setState({
          [data]: data
        });
      }

      function handlePersistentVolumeClaimSelect(e) {
        let value = e.target.value;
        let data = self.state.data;
        let key = v.key;
        let claimName = v.claimName;
        let volumeName = v.volumeName;

        // create a new pvc from a storage class
        if (value === "csCreateNewScVolume") {
          let scNames = [];

          _.forEach(self.state.exData.storageclasses, function(cs) {
            scNames.push(cs.metadata.name);
          });

          let annotations = formSchemaPvc.storageClass.properties.metadata.properties.annotations.properties;

          annotations["volume.beta.kubernetes.io/storage-class"].enum = scNames;

          h.Vent.emit("layout:form-dialog:open", {
            open: true,
            schema: formSchemaPvc.storageClass,
            uiSchema: uiSchemaPvc.storageClass,
            title: "Create volume claim from a Storage Class",
            icon: "glyphicons glyphicons-export",
            small: true,
            onAction: function(form, callback) {

              let annotatedForm = h.view.helpers.addCsAnnotations(form);

              h.fetch({
                method: "post",
                endpoint: h.ns("/persistentvolumeclaims"),
                body: JSON.stringify(annotatedForm),
                success: function() {
                  h.Vent.emit("notification", {
                    message: "Save Complete"
                  });

                  self.state.exData.persistentvolumeclaims.push(form);

                  let genName = `${form.metadata.name}-${uuid()}`;

                  _.set(data, key, form.metadata.name);
                  _.set(data, claimName, genName);
                  _.set(data, volumeName, genName);

                  self.setState({
                    [data]: data
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                },
                error: function(a) {
                  h.Vent.emit("request-error:confirm-box", a);

                  h.Vent.emit("notification", {
                    message: "Error while saving..."
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                }
              });
            }
          });

          return false;
        }

        if (value === "csCreateNewPvVolume") {
          let volumeNames = [];
          let volumeIds = [];

          _.forEach(self.state.exData.persistentvolumes, function(vol) {
            volumeNames.push(vol.metadata.name);
            volumeIds.push(`pvc-${vol.metadata.uid}`);
          });

          formSchemaPvc.persistentVolume.properties.spec.properties.volumeName.enum = volumeIds;
          formSchemaPvc.persistentVolume.properties.spec.properties.volumeName.enumNames = volumeNames;

          h.Vent.emit("layout:form-dialog:open", {
            open: true,
            schema: formSchemaPvc.persistentVolume,
            uiSchema: uiSchemaPvc.persistentVolume,
            title: "Create volume claim from a Persistent Volume",
            icon: "glyphicons glyphicons-cloud",
            small: true,
            onAction: function(form, callback) {

              let annotatedForm = h.view.helpers.addCsAnnotations(form);

              h.fetch({
                method: "post",
                endpoint: h.ns("/persistentvolumeclaims"),
                body: JSON.stringify(annotatedForm),
                success: function() {
                  h.Vent.emit("notification", {
                    message: "Save Complete"
                  });

                  self.state.exData.persistentvolumeclaims.push(form);

                  let genName = form.metadata.name;

                  _.set(data, key, form.metadata.name);
                  _.set(data, claimName, genName);
                  _.set(data, volumeName, genName);

                  self.setState({
                    [data]: data
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                },
                error: function(a) {
                  h.Vent.emit("request-error:confirm-box", a);

                  h.Vent.emit("notification", {
                    message: "Error while saving..."
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                }
              });
            }
          });

          return false;
        }

        // default
        let genName = value;

        _.set(data, key, value);
        _.set(data, claimName, genName);
        _.set(data, volumeName, genName);

        self.setState({
          [data]: data
        });
      }

      function handleSecretSelect(e) {
        let value = e.target.value;

        if (value === "csCreateNewSecret") {
          h.Vent.emit("layout:form-dialog:open", {
            open: true,
            schema: formSchemaSecret.kube,
            uiSchema: uiSchemaSecret.kube,
            title: "Create a new secret",
            icon: "glyphicons glyphicons-lock",
            small: true,
            formData: {
              kind: "Secret",
              data: [{
                key: "",
                value: ""
              }]
            },
            onAction: function(form, callback) {
              let flat = {};
              _.each(form.data, function(item) {
                flat[item.key] = window.btoa(item.value);
              });

              form.data = flat;

              h.fetch({
                method: "post",
                endpoint: h.ns("/secrets", self.props.location),
                body: JSON.stringify(form),
                success: function() {
                  h.Vent.emit("notification", {
                    message: "Save Complete"
                  });

                  let data1 = self.state.data;
                  let secretData = {
                    "name": form.metadata.name
                  };

                  _.get(data1, v.key).splice(0, 1, secretData);

                  self.state.exData.secrets.push(form);

                  self.setState({
                    [data1]: data1
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                },
                error: function(a) {
                  h.Vent.emit("request-error:confirm-box", a);

                  h.Vent.emit("notification", {
                    message: "Error while saving..."
                  });

                  if (callback && typeof callback === "function") {
                    return callback();
                  }
                }
              });
            }
          });
        }

        let data = self.state.data;
        let imagePullPolicy = "Always";
        let secretData = {
          "name": value
        };

        // If no secret is chosen we remove any prior entries and reset the imagePullPolicy
        if (!value) {
          imagePullPolicy = "IfNotPresent";
          _.get(data, v.key).splice(0, 1);
        } else {
          _.get(data, v.key).splice(0, 1, secretData);
        }

        let imageDataKey = v.imagePullPolicy;
        _.set(data, imageDataKey, imagePullPolicy);

        self.setState({
          [data]: data
        });
      }

      function handleSelect(e) {
        let value = e.target.value;
        let data = self.state.data;
        let key = v.key;

        _.set(data, key, value);

        self.setState({
          [data]: data
        });
      }

      function handleServiceSelect(e) {
        let value = e.target.value;

        if (value === "csCreateNewService") {
          let appName = self.state.data.metadata.hasOwnProperty("name") ? self.state.data.metadata.name : false;

          if (!appName) {
            h.Vent.emit("notification", {
              message: "You must specify an application name first"
            });

            return false;
          }

          let formData = {
            metadata: {
              name: `deployment-${appName}`
            },
            spec: {
              selector: {
                app: appName
              }
            }
          };

          ServiceForm.newService("dialog", formData, function(callbacks) {
            let exData = self.state.exData;

            if (callbacks[0] && typeof callbacks[0] === "object") {
              _.set(exData, "services[0]", callbacks[0]);
              let selected = self.state.selected;
              _.set(selected, "service", formData.metadata.name);

              self.setState({
                [exData]: exData,
                selected: selected
              }, function() {
                if (callbacks[1] && typeof callbacks[1] === "function") {
                  return callbacks[1]();
                }
              });
            }
          });

          return false;
        }

        let selected = self.state.selected;
        let data = self.state.data;
        let key = {
          metadata: {
            name: value
          }
        };

        let service = _.find(self.state.exData.services, key);
        let selector = _.get(service, "spec.selector.app", "");
        _.set(data, "spec.template.metadata.labels.app", selector);
        _.set(selected, "service", value);

        self.setState({
          data: data,
          selected: selected
        });
      }

      function handleSlider(e) {
        let data = self.state.data;
        let value = Number(e.target.value);

        if (v.hasOwnProperty("sub")) {
          _.set(data, v.sub, value);
        }

        _.set(data, v.key, value);

        self.setState({
          data: data
        });
      }

      function handleSliderInput(e) {
        let data = self.state.data;
        let value = e.target.value === "" ? "" : Number(e.target.value);
        if (v.hasOwnProperty("sub")) {
          _.set(data, v.sub, value);
        }

        _.set(data, v.key, value);

        self.setState({
          data: data
        });
      }

      switch (v.type) {
        case "advanced":
          let toggled = _.get(self.state.advanced.show, v.key);

          control = (
            <FormControlLabel
              control={
                <Switch
                  key={v.key}
                  checked={toggled}
                  onChange={handleAdvanced}
                />
              }
              label={v.title}
            />
          );
          break;

        case "auto-text":
          let atErrorMsg = "";
          let atHasError = false;
          let atValue = _.get(self.state.data, v.key, "");
          let matches = self.state.autoComplete[v.source].matches;
          let showMatches = matches.length > 0
            ? " open"
            : " closed";

          let menuItems = matches.map((match, mei) =>
            <div
              className="create-form-input-matches"
              key={mei}
              data-value={match}
              title={match}
              onClick={handleAuto}
            >
              {match}
            </div>
          );

          if (v.hasOwnProperty("error") && v.error === true) {
            atHasError = true;
            atErrorMsg = v.errorMsg;
            showMatches = " closed";
          }

          control = [
            <TextField
              key={0}
              placeholder={v.title}
              value={atValue}
              onChange={handleAuto}
              className="create-form-input"
              label={v.title}
              error={atHasError}
              helperText={atErrorMsg}
            />,
            <div
              key={1}
              className={`create-form-input-hints${showMatches}`}
            >
              {menuItems}
            </div>
          ];
          break;

        case "cronAdvanced":
          let cronErrorMsg = "";
          if (v.hasOwnProperty("error") && v.error === true) {
            cronErrorMsg = v.errorMsg;
          }

          let schedule = self.state.data.spec.schedule;
          let schedParts = schedule.split(" ");

          let minute = schedParts[0];
          let hour = schedParts[1];
          let day = schedParts[2];
          let month = schedParts[3];
          let week = schedParts[4];

          control = (
            <div className="cron-advanced">
              <div>
                <TextField
                  error={v.error}
                  label="Minute"
                  placeholder="*"
                  className="create-form-input"
                  id="cron-minute"
                  value={minute}
                  onChange={e => handleCron(e)}
                />
                <TextField
                  error={v.error}
                  label="Hour"
                  placeholder="*"
                  className="create-form-input"
                  id="cron-hour"
                  value={hour}
                  onChange={e => handleCron(e)}
                />
                <TextField
                  error={v.error}
                  label="Day"
                  placeholder="*"
                  className="create-form-input"
                  id="cron-day"
                  value={day}
                  onChange={e => handleCron(e)}
                />
                <TextField
                  error={v.error}
                  label="Month"
                  placeholder="*"
                  className="create-form-input"
                  id="cron-month"
                  value={month}
                  onChange={e => handleCron(e)}
                />
                <TextField
                  error={v.error}
                  label="Week"
                  placeholder="*"
                  className="create-form-input"
                  id="cron-week"
                  value={week}
                  onChange={e => handleCron(e)}
                />
              </div>
              <div className="cron-error-message">
                {cronErrorMsg}
              </div>
            </div>
          );

          break;

        case "configMap":
          let cmaps = self.state.exData.hasOwnProperty("configmaps") ?
            self.state.exData.configmaps : [];

          let cmapLocation = _.get(self.state.data, v.key, "");
          let selectedCmap = cmapLocation;

          let cmapMenuItems = cmaps.length > 0 ?
            cmaps.map(function(cmap, ci) {
              return (
                <MenuItem
                  disableRipple={true}
                  key={ci}
                  value={cmap.metadata.name}
                >
                  {cmap.metadata.name}
                </MenuItem>
              );
            }) : "";

          control = (
            <FormControl className="dialog-select">
              <InputLabel htmlFor="create-form-config-map-select">{v.title}</InputLabel>
              <Select
                input={<Input id="create-form-config-map-select" />}
                value={selectedCmap}
                onChange={handleConfigMapSelect}
              >
                <MenuItem
                  disableRipple={true}
                  value=""
                >
                  Select a config map...
                </MenuItem>
                {cmapMenuItems}
                <MenuItem
                  className="menu-divider-top"
                  disableRipple={true}
                  value="csCreateNewConfigMap"
                >
                  Create new...
                </MenuItem>
              </Select>
            </FormControl>
          );

          break;

        case "cronSimple":
          let schedule1 = self.state.data.spec.schedule;

          let simpleSchedule = [
            {
              name: "Custom...",
              schedule: ""
            },
            {
              name: "@hourly",
              schedule: "0 * * * *"
            },
            {
              name: "@daily",
              schedule: "0 0 * * *"
            },
            {
              name: "@weekly",
              schedule: "0 0 * * 0"
            },
            {
              name: "@monthly",
              schedule: "0 0 1 * *"
            },
            {
              name: "@yearly",
              schedule: "0 0 1 1 *"
            }
          ];

          let simpleSelected = simpleSchedule[0].schedule;
          let useCustom = "";
          let simpleMenuItems = simpleSchedule.map(function(sched, sc) {

            if (sched.schedule === schedule1) {
              simpleSelected = sched.schedule;

              if (sched.name === "Custom...") {
                useCustom = (
                  <div className="cron-schedule-arrow bounce">
                    <i className="glyphicons glyphicons-chevron-down" />
                  </div>
                );
              }
            }

            return (
              <MenuItem
                disableRipple={true}
                key={sc + 1}
                value={sched.schedule}
              >
                {sched.name}
              </MenuItem>
            );
          });

          control = (
            <div className="cron-simple">
              <div>
                <FormControl className="dialog-select">
                  <InputLabel htmlFor="create-form-cron-simple-select">Select a schedule...</InputLabel>
                  <Select
                    input={<Input id="create-form-cron-simple-select" />}
                    value={simpleSelected}
                    onChange={handleCron}>
                    {simpleMenuItems}
                  </Select>
                </FormControl>
              </div>
              {useCustom}
            </div>
          );

          break;

        case "checkbox":
          let checked = _.get(self.state.data, v.key);

          control = (
            <FormControlLabel
              control={
                <Checkbox
                  value={v.key}
                  checked={checked}
                  onChange={handleCheck}
                />
              }
              label={v.title}
            />
          );

          break;

        case "host-selector":

          let hostSelectorPos = _.get(self.state.data, v.key);
          let hostSelector = _.size(hostSelectorPos) > 0 ?
            <HostSelectorMaker data={hostSelectorPos} />
            :
            <div className="create-form-text">{v.title}</div>;

          control = (
            <div
              className="create-form-labels"
              onClick={handleHostSelector}>
              <div className="create-form-labels-left">
                {hostSelector}
              </div>
              <div className="create-form-labels-right">
                <i className="glyphicons glyphicons-plus" />
              </div>
            </div>
          );
          break;

        case "labels":
          let labelType = v.hasOwnProperty("display") ? v.display : "labels";
          let labelPos = _.get(self.state.data, v.key);
          let labels = _.size(labelPos) > 0 ?
            <LabelMaker scope="create" data={labelPos} type={labelType} displayAll={true} />
            :
            <div className="create-form-text">{v.title}</div>;

          control = (
            <div
              className="create-form-labels"
              onClick={handleLabels}>
              <div className="create-form-labels-left">
                {labels}
              </div>
              <div className="create-form-labels-right">
                <i className="glyphicons glyphicons-plus" />
              </div>
            </div>
          );
          break;

        case "persistentVolume":
          let volumes = self.state.exData.hasOwnProperty("persistentvolumes") ?
            self.state.exData.persistentvolumes : [];

          let volumeLocation = _.get(self.state.data, v.key, 0);
          let selectedVolume = volumeLocation;

          let pvMenuItems = volumes.length > 0 ?
            volumes.map(function(volume, vi) {
              return (
                <MenuItem
                  disableRipple={true}
                  key={vi + 1}
                  value={`pvc-${volume.metadata.uid}`}
                >
                  {volume.metadata.name}
                </MenuItem>
              );
            })
            :
            "";

          control = (
            <FormControl className="dialog-select">
              <InputLabel htmlFor="create-form-volume-select">Persistent Volume (optional)</InputLabel>
              <Select
                input={<Input id="create-form-volumes-select" />}
                value={selectedVolume}
                onChange={handlePersistentVolumeSelect}
              >
                <MenuItem
                  disableRipple={true}
                  key={"0"}
                  value={"0"}
                >
                  "Select a volume..."
                </MenuItem>
                {pvMenuItems}
              </Select>
            </FormControl>
          );

          break;

        case "persistentVolumeClaim":
          let pvcs = self.state.exData.hasOwnProperty("persistentvolumeclaims") ?
            self.state.exData.persistentvolumeclaims : [];

          let pvcLocation = _.get(self.state.data, v.key, 0);
          let selectedPvc = pvcLocation;

          let pvcMenuItems = pvcs.length > 0 ?
            pvcs.map(function(pvc, pi) {
              return (
                <MenuItem
                  disableRipple={true}
                  key={pi + 1}
                  value={pvc.metadata.name}
                >
                  {pvc.metadata.name}
                </MenuItem>
              );
            }) : "";

          control = (
            <FormControl className="dialog-select">
              <InputLabel htmlFor="create-form-volume-claim-select">Persistent Volume Claim (optional)</InputLabel>
              <Select
                input={<Input id="create-form-volume-claim-select" />}
                value={selectedPvc}
                onChange={handlePersistentVolumeClaimSelect}
              >
                <MenuItem
                  disableRipple={true}
                  value={0}
                >
                  Select a claim...
                </MenuItem>
                {pvcMenuItems}
                <MenuItem
                  className="menu-divider-top"
                  disableRipple={true}
                  value="csCreateNewScVolume"
                >
                  Create new from a storage class...
                </MenuItem>
                <MenuItem
                  disableRipple={true}
                  value="csCreateNewPvVolume"
                >
                  Create new from a persistent volume...
                </MenuItem>
              </Select>
            </FormControl>
          );

          break;

        case "selectors":
          let selectorPos = _.get(self.state.data, v.key);
          let selectors = _.size(selectorPos) > 0 ?
            <SelectorMaker scope="create" data={selectorPos} displayAll={true} />
            :
            <div className="create-form-text">{v.title}</div>;

          control = (
            <div
              className="create-form-labels"
              onClick={handleLabels}>
              <div className="create-form-labels-left">
                {selectors}
              </div>
              <div className="create-form-labels-right">
                <i className="glyphicons glyphicons-plus" />
              </div>
            </div>
          );
          break;

        case "secrets":
          let secrets = self.state.exData.hasOwnProperty("secrets") ? self.state.exData.secrets : [];
          let secretLocation = _.get(self.state.data, v.key)[0] || {};
          let selected = secretLocation.hasOwnProperty("name") ? secretLocation.name : 0;

          let secretMenuItems = secrets.length > 0 ?
            secrets.map(function(s, si) {
              return (
                <MenuItem
                  disableRipple={true}
                  key={si + 1}
                  value={s.metadata.name}
                >
                  {s.metadata.name}
                </MenuItem>
              );
            }) : "";

          control = (
            <FormControl className="dialog-select">
              <InputLabel htmlFor="create-form-secrets-select">Secrets (optional)</InputLabel>
              <Select
                input={<Input id="create-form-secrets-select" />}
                value={selected}
                onChange={handleSecretSelect}
              >
                <MenuItem
                  disableRipple={true}
                  value={0}
                >
                  Select a secret...
                </MenuItem>
                {secretMenuItems}
                <MenuItem
                  className="menu-divider-top"
                  disableRipple={true}
                  value="csCreateNewSecret"
                >
                  Create new secret...
                </MenuItem>
              </Select>
            </FormControl>
          );

          break;

        case "select":
          let selectedValue = _.get(self.state.data, v.key, "");
          let selectMenuItems = v.values.length > 0 ?
            v.values.map(function(va, vi) {
              return (
                <MenuItem
                  disableRipple={true}
                  key={vi + 1}
                  value={va}
                >
                  {va}
                </MenuItem>
              );
            }) : "";

          control = (
            <FormControl className="dialog-select">
              <InputLabel htmlFor={`generic-${v.key}`}>{v.title}</InputLabel>
              <Select
                input={<Input id={`generic-${v.key}`} />}
                value={selectedValue}
                onChange={handleSelect}
              >
                {selectMenuItems}
              </Select>
            </FormControl>
          );

          break;

        case "select-multiple":
          let selectedValues = _.get(self.state.data, v.key, []);

          let smValues = [];
          let selectMenuItemsMulti;

          if (v.source === "hard-coded") {
            smValues = v.data;

            selectMenuItemsMulti = smValues.length > 0 ?
              smValues.map(function(a, i) {
                return (
                  <MenuItem
                    disableRipple={true}
                    key={i + 1}
                    value={a}
                  >
                    {a}
                  </MenuItem>
                );
              }) : "";
          } else if ( v.hasOwnProperty("path")) {
            let source = _.get(self.state.exData, v.source, []);

            source.forEach( x => {
              let innerArr = _.get(x, v.path, []);
              innerArr.forEach( y => {
                if( !_.includes(smValues, y.name)) {
                  smValues.push(y.name);
                }
              });
            });

            selectMenuItemsMulti = smValues.length > 0 ?
              smValues.map(function(a, i) {
                return (
                  <MenuItem
                    disableRipple={true}
                    key={i + 1}
                    value={a}
                  >
                    {a}
                  </MenuItem>
                );
              }) : "";

          } else {
            smValues = _.get(self.state.exData, v.source, []);

            selectMenuItemsMulti = smValues.length > 0 ?
              smValues.map(function(va, vi) {
                return (
                  <MenuItem
                    disableRipple={true}
                    key={vi + 1}
                    value={va.metadata.name}
                  >
                    {va.metadata.name}
                  </MenuItem>
                );
              }) : "";
          }

          // Prevent menu from jumping upon selection
          const MenuProps = {
            variant: "menu",
            getContentAnchorEl: null
          };

          control = (
            <FormControl className="dialog-select">
              <InputLabel shrink htmlFor={`generic-${v.key}`}>{v.title}</InputLabel>
              <Select
                displayEmpty
                input={<Input id={`generic-${v.key}`} />}
                value={selectedValues}
                onChange={handleSelect}
                multiple={true}
                MenuProps={MenuProps}
                renderValue={() => {
                  if (selectedValues.length === 0) {
                    return <span style={{ color: "#757575" }}>{v.placeholder}</span>;
                  }

                  return selectedValues.join(", ");
                }}
              >
                {selectMenuItemsMulti}
              </Select>
            </FormControl>
          );

          break;

        case "services":
          let services = self.state.exData.hasOwnProperty("services") ? self.state.exData.services : [];
          let selectedService = _.get(self.state.selected, "service", "csSelectService");

          let serviceMenuItems = services.length > 0 ?
            services.map(function(srv, srvi) {
              return (
                <MenuItem
                  disableRipple={true}
                  key={srvi + 1}
                  value={srv.metadata.name}
                >
                  {srv.metadata.name}
                </MenuItem>
              );
            }) : "";

          control = (
            <FormControl className="dialog-select">
              <InputLabel id="service-select-label">Service (optional)</InputLabel>
              <Select
                id="service-select"
                labelId="service-select-label"
                value={selectedService}
                onChange={handleServiceSelect}
              >
                <MenuItem
                  disableRipple={true}
                  key={0}
                  value="csSelectService"
                >
                  Select a service...
                </MenuItem>
                {serviceMenuItems}
                <MenuItem
                  key={-1}
                  className="menu-divider-top"
                  disableRipple={true}
                  value="csCreateNewService"
                >
                  Create new service...
                </MenuItem>
              </Select>
            </FormControl>
          );

          break;

        case "slider":
          let sliderDisabled = false;
          let sliderErrorMsg = false;
          let maxValue = v.range.max;
          let minValue = v.range.min;
          let defaultValue = v.range.default;

          if (v.range.hasOwnProperty("calculated")) {

            switch (v.range.source) {
              case "limitranges":
                let limitRanges = _.get(self.state, "exData.limitranges[0].spec.limits", null);

                if (limitRanges !== null) {

                  for (let l = 0; l < limitRanges.length; l++) {

                    let lr = limitRanges[l];

                    if (lr.type === v.range.type) {
                      let resource = v.range.resource;
                      defaultValue = self.convertValue(_.get(lr.default, resource, v.range.default));
                      maxValue = self.convertValue(_.get(lr.max, resource, v.range.max));
                      minValue = self.convertValue(_.get(lr.min, resource, v.range.min));
                    }
                  }
                }

                break;

              case "resourcequotas":
                let resourceQuotas = _.get(self.state, "exData.resourcequotas[0].status", null);

                if (resourceQuotas === null) {
                  break;
                }

                let hard = Number(_.get(resourceQuotas.hard, v.range.resource, v.range.max));
                let used = Number(_.get(resourceQuotas.used, v.range.resource, 0));
                let remaining = Number(hard - used);

                if (remaining <= 0) {
                  sliderErrorMsg = v.errorMsg;
                  sliderDisabled = true;
                }

                maxValue = hard;
                break;

              default:
                break;
            }
          }

          let sliderValue = _.get(self.state.data, v.key, defaultValue);

          let displayValue = 0;
          let displayMaxValue = "-";

          if (!sliderErrorMsg) {
            displayValue = v.range.hasOwnProperty("modifier") ? h.view.helpers.humanFileSize(sliderValue) : sliderValue;
            displayMaxValue = v.range.hasOwnProperty("modifier") ? h.view.helpers.humanFileSize(maxValue) : maxValue;
          }

          control = (
            <div className="create-form-slider">
              <div className="title">
                {v.title}:
                <span className="slider-input-display">
                  <span className="display-value">{displayValue}</span>
                  <Input
                    className="slider-input"
                    value={sliderValue}
                    margin="dense"
                    onChange={handleSliderInput}
                    inputProps={{
                      step: v.range.step,
                      min: minValue,
                      max: maxValue,
                      type: "number",
                      "aria-labelledby": "input-slider",
                    }}
                  />
                </span>
                <span style={{float: "right"}}>{displayMaxValue}</span>
              </div>
              <div className="slider">
                <input
                  type="range"
                  min={minValue}
                  max={maxValue}
                  step={v.range.step}
                  value={sliderValue}
                  onChange={handleSlider}
                  disabled={sliderDisabled}
                  style={{width: "inherit"}}
                />
              </div>
              <div className="create-form-slider-error">
                {sliderErrorMsg}
              </div>
            </div>
          );
          break;

        case "text":
          let tHasError = false;
          let tErrorMsg = "";
          let tDefaultValue = "";

          if (v.hasOwnProperty("error") && v.error === true) {
            tHasError = true;
            tErrorMsg = v.errorMsg;
          }

          if (v.hasOwnProperty("default")) {
            tDefaultValue = v.default;
          }

          control = (
            <TextField
              label={v.title}
              error={tHasError}
              helperText={tErrorMsg}
              placeholder={v.title}
              className="create-form-input"
              onChange={handleText}
              defaultValue={tDefaultValue}
              autoFocus={i === 0}
            />
          );
          break;

        case "textarea": {
          let taHasError = false;
          let taErrorMsg = "";
          let taDefaultValue = "";

          if (v.hasOwnProperty("error") && v.error === true) {
            taHasError = true;
            taErrorMsg = v.errorMsg;
          }

          if (v.hasOwnProperty("default")) {
            taDefaultValue = v.default;
          }

          control = (
            <TextField
              multiline={true}
              label={v.title}
              error={taHasError}
              helperText={taErrorMsg}
              placeholder={v.title}
              className="create-form-input"
              onChange={handleText}
              defaultValue={taDefaultValue}
              autoFocus={i === 0}
            />
          );
          break;
        }
        case "transfer":
          // used for stackapps
          let tlData = self.state.tlData;
          control = <LoaderMaker id="nodata" config="no-data-large" />;

          if (Object.keys(tlData.metadata).length > 0) {
            control = (
              <TransferList
                args={{
                  data: tlData.data,
                  metadata: tlData.metadata,
                  stackValueAction: (d, formData, reconcile) => {
                    let data = self.state.data;
                    let current = data[v.key];
                    let index = _.findIndex(current, { metadata: { uid: d }});

                    if (index !== -1) {
                      let manifest = current[index];
                      const name = manifest.metadata.name;
                      const kind = manifest.kind;

                      let callback = (cb) => {
                        let annotations = _.get(manifest, "metadata.annotations", {});
                        annotations = {...annotations, ...cb[0]};
                        _.set(manifest, "metadata.annotations", annotations);
                        current[index] = manifest;
                        _.set(data, v.key, current);

                        self.setState({
                          data
                        });

                        // send the form back to the transfer list
                        reconcile(d, cb[0]);
                        return cb[1]();
                      };

                      StackValueForm.newAnnotation(name, kind, formData, callback);
                    }
                  },
                  action: (d) => {
                    let data = self.state.data;
                    let exData = self.state.exData[v.key];
                    let resources = d.map((uid) => {
                      let manifest = _.find(exData, { metadata: { uid: uid }});
                      if (typeof manifest !== "undefined") {
                        return manifest;
                      }
                    });

                    _.set(data, v.key, resources);

                    self.setState({
                      data
                    });
                  }
                }}
              />
            );
          }

          break;

        case "variables":
          let envVarsPos = _.get(self.state.data, v.key);
          let envVars = _.size(envVarsPos) > 0 ?
            <EnvVarMaker data={envVarsPos} />
            :
            <div className="create-form-text">Environment Variables</div>;

          control = (
            <div
              className="create-form-labels"
              onClick={handleEnvVariables}>
              <div className="create-form-labels-left">
                {envVars}
              </div>
              <div className="create-form-labels-right">
                <i className="glyphicons glyphicons-plus" />
              </div>
            </div>
          );
          break;

        default:
          control = "";
          break;
      }

      let referenceLink = v.hasOwnProperty("reference") ?
        <a
          className="create-form-link"
          href={v.reference}
          target="_new"
          tabIndex="-1">
          Learn more
          <i className="glyphicons glyphicons-square-new-window" />
        </a> : null;

      let secondaryText = v.hasOwnProperty("secondaryText") ?
        <div style={{marginBottom: "20px"}}>
          {v.secondaryText}
        </div> : null;

      let formEntry = (
        <div
          key={`control-${i}`}
          className="create-form-entry">
          <div id={`form-control-${i}`} className="create-form-control">
            {control}
          </div>
          <div className="create-form-description">
            <div className="create-form-description-text">
              {v.description} {referenceLink}
            </div>
          </div>
        </div>
      );

      if (v.hasOwnProperty("stacked")) {
        formEntry = (
          <div
            key={`control-${i}`}
          >
            <div style={{
              marginTop: "50px",
              marginBottom: "20px",
              fontWeight: "bold",
              borderBottom: "1px solid #e0e0e0"
            }}>
              {v.description} {referenceLink}
            </div>
            {secondaryText}
            <div id={`form-control-${i}`} className="create-form-control">
              {control}
            </div>
          </div>
        );
      }

      return formEntry;
    });

    return c;
  }

  render() {
    let self = this;

    if (self.state.open === false) {
      return null;
    }

    let resourceKind = _.get(self.state, "data.kind", "").replace(/\s+/g, "");
    let docResourceLink = _.get(resourceMetadata, `${resourceKind}.doc`, false);
    let docLink = <a
        className="form-dialog-title-doclink"
        href={docResourceLink}
        target="_new"
        data-balloon="View Documentation"
        data-balloon-pos="up"
      >
        <span>Help</span>
        <i className="glyphicons glyphicons-circle-question form-dialog-title-doclink" />
      </a>;

    let title = (
      <span>
        <i className={`${self.state.icon} dialog-title-icon`} />
        {self.state.title}{docLink}
      </span>
    );

    let body = self.buildControls();

    let buttons = [
      {
        type: "exit",
        action: () => self.handleClose()
      },
      {
        type: "create",
        action: () => self.submitForm(),
        disabled: self.state.errors
      }
    ];

    return (
      <DialogMaker
        id="manifest-dialog-simple"
        open={self.state.open}
        onRequestClose={() => self.handleClose()}
        title={title}
        body={body}
        buttons={buttons}
        dialogClass="medium"
        bodyClass="dialog-body-large"
      />
    );
  }
}

export default ManifestDialogSimple;
