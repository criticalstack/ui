"use strict";

import React from "react";
import Session from "../session";
import moment from "moment";
import _ from "lodash";
import h from "../../helpers";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import YAML from "js-yaml";
import uploadSchema from "./schemas/upload";

let CommonHelpers = {

  chunkify(a, n, balanced) {
    if (n < 2) {
      return [a];
    }

    let len = a.length;
    let out = [];
    let i = 0;
    let size;

    if (len % n === 0) {
      size = Math.floor(len / n);

      while (i < len) {
        out.push(a.slice(i, i += size));
      }
    } else if (balanced) {
      while (i < len) {
        size = Math.ceil((len - i) / n--);

        out.push(a.slice(i, i += size));
      }
    } else {
      n--;
      size = Math.floor(len / n);

      if (len % size === 0) {
        size--;
      }

      while (i < size * n) {
        out.push(a.slice(i, i += size));
      }

      out.push(a.slice(size * n));
    }

    return out;
  },

  routeForKind(kind) {
    switch (kind) {
      case "Pod":
        return "pods";
      case "ReplicationController":
        return "replication-controllers";
      case "Service":
        return "services";
      default:
        CSOS.log.error("Unknown Kind: ", kind);
    }
  },

  avatar() {
    if (Session.user) {
      if (Session.user.hasOwnProperty("customAvatar") && Session.user.customAvatar.length > 0) {
        return <img width="36px" src={Session.user.customAvatar} />;
      } else if (Session.user.hasOwnProperty("avatar")) {
        return <img width="36px" src={"//1.gravatar.com/avatar/" + Session.user.avatar} />;
      }
    }

    return "";
  },

  addCsAnnotations(manifest) {
    if (Session.user) {
      let email = Session.user.email.replace(/[\.\@]/g, "-");
      _.set(manifest, "metadata.labels.created-by", email);
      _.set(manifest, "metadata.annotations.created-by", email);

      return manifest;
    }

    return manifest;
  },

  pad(n, width, z) {
    z = z || "0";
    n = n + "";

    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  },

  fromNow(time) {
    return moment(time).fromNow(true);
  },

  uptime(timestamp) {
    let self = this;

    let now = new Date();
    let past = new Date(timestamp) || 0;

    if (past === 0) {
      return "-";
    }

    let day = "";
    let hour = "00";
    let minute = "00";
    let second = "00";

    let daySec = 86400;
    let hourSec = 3600;
    let minSec = 60;

    let duration = Math.round((now - past) / 1000.0);

    // days
    if (duration >= daySec) {
      let utDay = Math.floor(duration / daySec);

      duration = duration % daySec;
      day = self.pad(utDay, 0);
    }

    // hours
    if (duration >= hourSec) {
      let utHour = Math.floor(duration / hourSec);

      duration = duration % hourSec;
      hour = self.pad(utHour, 0);
    }

    // minutes
    if (duration >= minSec) {
      let utMin = Math.floor(duration / minSec);

      duration = duration % minSec;
      minute = self.pad(utMin, 0);
    }

    // seconds
    if (duration > 0) {
      second = self.pad(duration, 0);
    }

    if (day > 0) {
      return `${day} days`;
    }

    if (hour > 0) {
      return `${hour} hours`;
    }

    if (minute > 0) {
      return `${minute} minutes`;
    }

    if (second > 0) {
      return `${second} seconds`;
    }

  },

  humanFileSize(bytes, si) {
    let thresh = si ? 1000 : 1024;
    if (!bytes) {
      return 0;
    }

    let lastChar = bytes.toString().substr(bytes.length - 1);
    let noCalc = ["E", "P", "T", "G", "M", "K", "m", "i"];

    if (_.includes(noCalc, lastChar)) {
      return bytes;
    }

    if (lastChar === "k") {
      bytes = Number(bytes.replace(/\D/g, "") * 1000);
    }

    if (Math.abs(bytes) < thresh) {
      return bytes + " B";
    }

    let units;

    if (si) {
      units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    } else {
      units = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    }

    let u = -1;

    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);

    return `${bytes.toFixed(2)} ${units[u]}`;
  },

  localTimestamp(timestamp) {
    let UtcTimestamp = new Date(timestamp);

    let options = {
      hour12: false
    };

    // return timestamp;
    return UtcTimestamp.toLocaleString("en-US", options);
  },

  truncate(str, len = 20, cap = "...") {
    if (!str || str.length === 0) {
      return str;
    }

    if (str.length > len) {
      return (((str).substring(0, len - 3)) + cap);
    }

    return str;
  },

  stopProp(e) {
    e.stopPropagation();
  },

  resourceDeleteSingle(type, name, location, raw) {
    let labels = _.get(raw, "metadata.labels", false);
    let appId = false;

    if (labels) {
      appId = labels.hasOwnProperty("critical.stack/appid")
        ? labels["critical.stack/appid"]
        : false;
    }

    if (appId) {
      h.Vent.emit("layout:confirm:open", {
        open: true,
        title: `Confirm Request: Modify ${raw.metadata.name}?`,
        message: "This deployment was installed through the marketplace. Would you like to go there now to modify it?",
        primaryAction: "ok",
        onAction: function() {
          h.Vent.emit("link", `/marketplace/app/${appId}`);
          h.Vent.emit("layout:confirm:close");
        }
      });

      return false;
    }

    let niceName = raw.metadata.name;

    if (type === "nodes") {
      h.Vent.emit("layout:confirm:open", {
        open: true,
        title: `Confirm Request: Delete Node ${niceName}?`,
        message: `Are you sure you want to delete ${niceName}?`,
        onAction: function() {
          h.Vent.emit("notification", {
            message: `Deleting Node ${niceName}`
          });

          h.Vent.emit("layout:confirm:close");

          h.fetch({
            method: "delete",
            endpoint: h.ns(`/nodes/${niceName}`, location),
            error: function(error) {
              h.Vent.emit("request-error:confirm-box", error);
            }
          });
        }
      });
      return false;
    } else if (type === "userrequests.criticalstack.com") {
      // TODO(ktravis): need a better way to specify this type of override
      niceName = raw.spec.template.email;
    }

    h.Vent.emit("layout:confirm:open", {
      open: true,
      title: `Confirm Request: Delete ${name} ${niceName}?`,
      message: <div>
        <div>
          Are you sure you want to delete {name} {niceName}?
        </div>
        {
          raw.hasOwnProperty("deleteMsg") && (
            <div style={{marginTop: "15px"}}>
              {raw.deleteMsg}
            </div>
          )
        }
      </div>,
      onAction: function() {
        h.Vent.emit("layout:confirm:close");

        let store = {
          all: false,
          items: [
            raw.metadata.name
          ]
        };

        let url = h.nsCheck(type)
          ? h.ns(`/delete/${type}`)
          : `/delete/${type}`;

        h.fetch({
          method: "post",
          endpoint: url,
          body: JSON.stringify(store),
          error: function(error) {
            h.Vent.emit("request-error:confirm-box", error);
          }
        });
      }
    });
  },

  resourceDeleteMultiple(route, type) {
    h.Vent.emit(`root:table:select:action:${type}`, {
      action: function() {},
      done: function(store) {
        let url = h.nsCheck(route)
          ? h.ns(`/delete/${route}`)
          : `/delete/${route}`;

        h.fetch({
          method: "post",
          endpoint: url,
          body: JSON.stringify(store),
          error: function(error) {
            h.Vent.emit("request-error:confirm-box", error);
          }
        });
      }
    });
  },

  resourceUpload() {
    let route = h.ns("/upload");
    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: uploadSchema.form,
      uiSchema: uploadSchema.ui,
      title: "Manifest upload",
      icon: "glyphicons glyphicons-open",
      dialogClass: "xsmall",
      onAction: function(form, callback) {
        h.fetch({
          method: "post",
          endpoint: route,
          resUrl: false,
          body: JSON.stringify(form),
          success: function() {
            h.Vent.emit("notification", {
              message: "Save Complete"
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
          }
        });
      }
    });
  },

  resourceUpload1() {
    // WIP - keep for now.
    function CustomFileWidget(props) {
      return (
        <div
          style={{
            border: "2px dashed #c9c9c9",
            borderRadius: "10px",
            height: "100px",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "30px"
          }}
        >
          <div style={{position: "absolute"}}>Select files..</div>
          <input
            value={props.value}
            onChange={() => props.onChange([props.value])}
            type="file"
            multiple={true}
            id="root_files"
            style={{width: "100%", height: "100px", opacity: "1"}}
          />
        </div>
      );
    }

    const widgets = {
      FileWidget: CustomFileWidget
    };

    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: uploadSchema.form,
      uiSchema: uploadSchema.ui,
      widgets: widgets,
      title: "Upload manifest",
      icon: "glyphicons glyphicons-open",
      dialogClass: "xsmall",
      onAction: function(form) {
        h.fetch({
          method: "post",
          endpoint: "/upload",
          body: form,
          success: function() {
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
    });
  },

  resourceDownload(d) {
    let format = CSOS.localStorage.formats.data().downloadFormat || "yaml";

    let content = (
      <RadioGroup
        onChange={(e) => {
          format = e.currentTarget.value;
          if (window.localStorage.hasOwnProperty("csos-formats")) {
            CSOS.localStorage.formats.update({
              downloadFormat: format
            });
          }
        }}
        name="downloadFormat"
        defaultValue={CSOS.localStorage.formats.data().downloadFormat || "yaml"}
      >
        <FormControlLabel
          control={
            <Radio />
          }
          value="json"
          label="JSON"
        />
        <FormControlLabel
          control={
            <Radio />
          }
          value="yaml"
          label="YAML"
        />
      </RadioGroup>
    );

    h.Vent.emit("layout:confirm:open", {
      open: true,
      title: "Select a download format",
      message: content,
      primaryAction: "ok",
      onAction: function() {
        let formatted;
        let timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
        let filename = `${d.metadata.name}-v${d.metadata.resourceVersion}-${timestamp}.${format}`;

        try {
          if (format === "yaml") {
            formatted = YAML.safeDump(d);
          } else {
            formatted = JSON.stringify(d, null, 2);
          }
        } catch (e) {
          h.Vent.emit("notification", {
            message: `error: ${e}`
          });
          return false;
        }

        let e = document.createElement("a");
        e.setAttribute("href", `data:text/plain;charset=utf-8,${formatted}`);
        e.setAttribute("download", filename);

        e.style.display = "none";
        document.body.appendChild(e);
        e.click();
        document.body.removeChild(e);
        h.Vent.emit("layout:confirm:close");
      }
    });
  },

  exportStackApp(d) {
    const name = d.metadata.name;
    const url = `/stackapps/export/${name}`;
    h.fetch({
      endpoint: url,
      method: "post",
      success: function(data) {
        let formatted;
        let filename = `stackapp-${name}.yaml`;
        let manifest = _.get(data, "context.manifests", false);

        if (!manifest) {
          h.Vent.emit("notification", {
            message: "error: download failed"
          });
          return false;
        }

        try {
          formatted = window.atob(manifest);
        } catch (e) {
          h.Vent.emit("notification", {
            message: `format error: ${e}`
          });
          return false;
        }

        let e = document.createElement("a");
        e.setAttribute("href", `data:text/plain;charset=utf-8,${formatted}`);
        e.setAttribute("download", filename);

        e.style.display = "none";
        document.body.appendChild(e);
        e.click();
        document.body.removeChild(e);
      }
    });
  },

  setConfig(callback) {
    h.fetch({
      resUrl: false,
      endpoint: "/config",
      success: function(data) {
        h.log.info("Server Configuration", data);
        window.localStorage["cs-config"] = JSON.stringify(data.context.result);
        h.Vent.emit("main-menu:update");
      },
      error: function(a) {
        console.log("error: ", a);
        return callback();
      }
    });
  },

  getConfig() {
    const config = JSON.parse(localStorage.getItem("cs-config")) || {};
    return config;
  }
};

export default CommonHelpers;
