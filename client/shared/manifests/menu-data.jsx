"use strict";

import React from "react";
import LabelEditor from "../label-editor";
import scaleEditor from "../scale-editor";
import h from "../../lib/helpers";
import _ from "lodash";
import {
  formSchema as configMapForm,
  uiSchema as configMapUI
} from "../../lib/datacenter/config-maps/form-schema";
import {
  formSchema as secretForm,
  uiSchema as secretUI
} from "../../lib/datacenter/secrets/form-schema";
import {
  formSchema as pwForm,
  uiSchema as pwUI,
  formValidation as pwValidation
} from "../../lib/settings/general/schemas/password-force-reset";
import connectorCreate from "../../lib/settings/general/sso/create";
import YAML from "js-yaml";
import resourceMetadata from "./resource-metadata";

let menus = {};

function sharedEntry(name, d, type, label, formArgs) {
  let entries = {
    appdetail: {
      "icon": "glyphicons glyphicons-education",
      "name": "Learn More",
      "action": function() {
        let newState = {
          "data": d
        };

        h.Vent.emit("marketplace:app:link", d.metadata.name, newState);
      }
    },
    shell: {
      "icon": "glyphicons glyphicons-terminal-isolated",
      "name": "Shell",
      "action": function() {
        // h.Vent.emit("link", `/datacenter/pods/${d.metadata.name}/${d.spec.containers[0].name}/0`);
        h.Vent.emit("section:drawer:content", {
          pod: d.metadata.name,
          container: d.spec.containers[0].name
        });
      }
    },
    delete: {
      "icon": "glyphicons glyphicons-bin menu-icon-warn",
      "name": "Delete",
      "resource": d.resource,
      "verb": "delete",
      "divider": "menu-divider-top",
      "action": function() {
        h.view.helpers.resourceDeleteSingle(type, label, false, d);
      }
    },
    download: {
      "icon": "glyphicons glyphicons-save",
      "name": "Download",
      "action": function() {
        h.view.helpers.resourceDownload(d);
      }
    },
    edit: {
      "icon": "csicon csicon-settings-editor",
      "name": "Edit",
      "resource": d.resource,
      "verb": "update",
      "action": function() {
        h.Vent.emit("edit:mode", d.metadata.uid, "edit");
      }
    },
    events: {
      "icon": "csicon csicon-events",
      "name": "Events",
      "resource": "events",
      "verb": "list",
      "action": function() {
        h.Vent.emit("link", `/datacenter/events?fieldSelector=involvedObject.uid=${d.metadata.uid}`);
      }
    },
    labels: {
      "icon": "glyphicons glyphicons-tags",
      "name": "Labels",
      "resource": d.resource,
      "verb": "patch",
      "action": function() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: `Editing labels on ${d.metadata.name}`,
          message: <LabelEditor data={d} />,
          disableButtons: true,
          modal: true
        });
      }
    },
    modify: {
      "icon": "glyphicons glyphicons-square-edit",
      "name": "Simple Edit",
      "resource": d.resource,
      "verb": "update",
      "action": function() {
        let rawData = [];
        delete d.metadata.resourceVersion;
        let format = {
          configmaps: (v) => v,
          secrets: (v) => window.atob(v)
        };

        _.forEach(d.data, function(v, k) {
          rawData.push({
            key: k,
            value: format[type](v)
          });
        });

        h.Vent.emit("layout:form-dialog:open", {
          open: true,
          schema: formArgs.formSchema,
          uiSchema: formArgs.uiSchema,
          title: `Edit ${label}`,
          icon: "glyphicons glyphicons-square-edit",
          small: true,
          formData: {
            kind: d.kind,
            metadata: d.metadata,
            type: d.type,
            data: rawData
          },
          onAction: function(form, callback) {
            let flat = {};
            _.each(form.data, function(item) {
              if (type === "secrets") {
                flat[item.key] = window.btoa(item.value);
              } else {
                flat[item.key] = item.value;
              }
            });

            form.data = flat;

            h.fetch({
              method: "post",
              endpoint: h.ns(`/${type}/${d.metadata.name}`),
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

                if (callback && typeof callback === "function") {
                  return callback();
                }
              }
            });
          }
        });
      }
    },
    pods: {
      "icon": "csicon csicon-pods",
      "name": "Pods",
      "resource": "pods",
      "verb": "list",
      "action": function() {
        h.Vent.emit("link", "/datacenter/pods");
      }
    }
  };
  return entries[name];
}

menus["config-maps"] = (d, multi) => {
  d.resource = "configmaps";
  if (multi) {
    return [];
  }

  let formArgs = {
    formSchema: configMapForm.configMaps,
    uiSchema: configMapUI.configMaps
  };

  let dataDetail = d.hasOwnProperty("data") ?
    Object.keys(d.data).map(function(key) {
      var detail = (
        <div key={`${key}:${d.data[key]}`} className="dialog-prop">
        <div className="dialog-prop-key">
        {key}:
        </div>
        <div key={`data-${key}`} className="dialog-prop-value">
        {d.data[key]}
        </div>
        </div>
      );

      return detail;
    })

    : <div className="dialog-prop-value">-</div>;

  let menu = [
    {
      "icon": "csicon csicon-config-maps",
      "name": "Show Data",
      "action": function() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: <span>
          <i
          className="csicon csicon-config-maps"
          style={{
            marginTop: "2px",
              marginRight: "15px",
              color: "#0078e7"
          }}
          />
          Data
          </span>,
          message: <pre>
          {dataDetail}
          </pre>,
          bodyStyle: {
            backgroundColor: "#14171B",
            color: "#fff",
            borderRadius: "5px",
            padding: "20px",
            margin: "20px"
          }
        });
      }
    },
    sharedEntry("modify", d, "configmaps", "Config Map", formArgs),
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "configmaps", "Config Map")
  ];

  return menu;
};

menus.containers = (d, multi) => {
  if (multi) {
    return [];
  }

  let name = d.metadata.name;
  let pod = d.pod.metadata.name;

  let menu = [
    {
      "icon": "glyphicons glyphicons-terminal-isolated",
      "name": "Shell",
      "action": function() {
        h.Vent.emit("link", `/datacenter/pods/${pod}/${name}/0`);
      }
    },
    {
      "icon": "glyphicons glyphicons-code",
      "name": "Args and Commands",
      "action": function() {
        let cArgs = d.metadata.hasOwnProperty("args") ?
          Object.keys(d.metadata.args).map(function(key) {
            let detail = (
              <div key={`arg-${key}`} className="dialog-prop-value">
              {d.metadata.args[key]}
              </div>
            );

            return detail;
          })

          : <div className="dialog-prop-value">-</div>;

        let argDetail = (
          <div className="dialog-prop">
          <div className="dialog-prop-key">
          Args:
          </div>
          {cArgs}
          </div>
        );

        let cComms = d.metadata.hasOwnProperty("command") ?
          Object.keys(d.metadata.command).map(function(key) {
            let detail = (
              <div key={`command-${key}`} className="dialog-prop-value">
              {d.metadata.command[key]}
              </div>
            );

            return detail;
          })

          : <div className="dialog-prop-value">-</div>;

        let commDetail = (
          <div className="dialog-prop">
          <div className="dialog-prop-key">
          Commands:
          </div>
          {cComms}
          </div>
        );

        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: (
            <span>
            <i className="glyphicons glyphicons-code dialog-title-icon" />
            Container Args and Commands
            </span>
          ),
          message: (
            <div>
            {argDetail}
            {commDetail}
            </div>
          )
        });
      }
    }
  ];
  return menu;
};

menus["cron-jobs"] = (d, multi) => {
  d.resource = "cronjobs.batch";
  if (multi) {
    return [];
  }

  let suspend = d.spec.hasOwnProperty("suspend") ? d.spec.suspend : false;

  let menu = [
    {
      "name": "Running",
      "toggle": {
        state: !suspend
      },
      "action": function() {
        d.spec.suspend = !d.spec.suspend;
        h.fetch({
          method: "post",
          endpoint: h.ns(`/cronjobs/${d.metadata.name}`),
          body: JSON.stringify(d)
        });
      }
    },
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "cronjobs", "Cron Job")
  ];
  return menu;
};

menus["custom-resource-definitions"] = (d, multi) => {
  d.resource = "customresourcedefinitions.apiextensions.k8s.io";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "customresourcedefinitions", "Custom Resource Definition")
  ];
  return menu;
};

menus["daemon-sets"] = (d, multi) => {
  d.resource = "daemonsets.apps";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "daemonsets", "Daemon Set")
  ];
  return menu;
};

menus.deployments = (d, multi) => {
  d.resource = "deployments.apps";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    {
      "icon": "glyphicons glyphicons-resize-horizontal",
      "name": "Scale",
      "resource": d.resource,
      "verb": "patch",
      "action": function() {
        scaleEditor({
          url: h.ns(`/deployments/${d.metadata.name}`, false),
          title: "Scale Deployment",
          icon: "glyphicons glyphicons-git-commit",
          beforeSend: function(form) {
            return [{
              "op": "replace",
              "path": "/spec/replicas",
              "value": form.replicas
            }];
          },
          formData: {
            replicas: d.spec.replicas || 0
          }
        });
      }
    },
    sharedEntry("events", d),
    sharedEntry("pods", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "deployments", "Deployment")
  ];
  return menu;
};

menus.endpoints = (d, multi) => {
  d.resource = "endpoints";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "endpoints", "Endpoint")
  ];
  return menu;
};

menus["generic-menu"] = (d) => {
  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
  ];
  return menu;
};

menus["horizontal-pod-autoscalers"] = (d, multi) => {
  d.resource = "horizontalpodautoscalers.autoscaling";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "horizontalpodautoscalers", "Horizontal Pod Autoscaler")
  ];
  return menu;
};

menus.hover = (d) => {
  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("download", d),
  ];
  return menu;
};

menus.ingress = (d, multi) => {
  d.resource = "ingresses.extensions";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "ingresses", "Ingress")
  ];
  return menu;
};

menus.jobs = (d, multi) => {
  d.resource = "jobs.batch";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "jobs", "Job")
  ];
  return menu;
};

menus["mp-bookmarked"] = (d, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("appdetail", d),
  ];
  return menu;
};

menus["mp-popular"] = (d, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("appdetail", d),
  ];
  return menu;
};

menus["mp-purchased"] = (d, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("appdetail", d),
  ];
  return menu;
};

menus["mp-updates"] = (d, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("appdetail", d),
  ];
  return menu;
};

menus.namespace = (d, multi) => {
  d.resource = "namespaces";
  if (multi) {
    return [];
  }
  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    {
      "icon": "glyphicons glyphicons-bin menu-icon-warn",
      "name": "Delete",
      "resource": d.resource,
      "verb": "delete",
      "divider": "menu-divider-top",
      "action": function() {
        h.fetch({
          endpoint: `?namespace=${d.metadata.name}`,
          success: function(response) {
            let resources = response.context.result;
            if (resources.length > 0) {
              d.deleteMsg = <div>
                <div style={{marginBottom: "8px"}}>Continuing will also delete the following resources:</div>
                <div className="table-parent" style={{marginBottom: "0"}}>
                <div className="table-wrapper" style={{maxHeight: "40vh"}}>
                <table className="default-table">
                <thead>
                <tr>
                <th>Name</th>
                <th>Kind</th>
                </tr>
                </thead>
                <tbody>
                {
                  resources.map(resource =>
                    <tr>
                    <td>{resource.metadata.name}</td>
                    <td>{resource.kind}</td>
                    </tr>
                  )
                }
                </tbody>
                </table>
                </div>
                </div>
                </div>;
            }

            h.view.helpers.resourceDeleteSingle("namespaces?force=true", "Namespace", false, d);
          },
          error: function(a) {
            h.Vent.emit("request-error:confirm-box", a);
            h.Vent.emit("notification", {
              message: "Error while fetching resources..."
            });
          }
        });
      }
    }
  ];
  return menu;
};

menus["namespace-users"] = (d, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("delete", d, "namespaces", "User")
  ];
  return menu;
};

menus["network-policies"] = (d, multi) => {
  d.resource = "networkpolicies.networking.k8s.io";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "networkpolicies", "Network Policy")
  ];
  return menu;
};

menus.nodes = (d, multi) => {
  d.metadata.resource = "nodes";
  if (multi) {
    return [];
  }

  let menu = [];
  let isMaster = false;
  let hasLabels = d.metadata.hasOwnProperty("labels");
  if (hasLabels) {
    isMaster = d.metadata.labels.hasOwnProperty("node-role.kubernetes.io/master");
  }

  menu.push(sharedEntry("labels", d));
  menu.push(sharedEntry("events", d));

  if (!isMaster) {
    menu.push(sharedEntry("delete", d, "nodes", "Node"));
  }
  return menu;
};

menus["sub-nodes"] = (d, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("shell", d),
    sharedEntry("pods", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("delete", d, "pods", "Pod")
  ];
  return menu;
};

menus["persistent-volumes"] = (d, multi) => {
  d.resource = "persistentvolumes";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "persistentvolumes", "Persistent Volume")
  ];
  return menu;
};

menus["persistent-volume-claims"] = (d, multi) => {
  d.resource = "persistentvolumeclaims";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "persistentvolumeclaims", "Persistent Volume Claim")
  ];
  return menu;
};

menus.pods = (d, multi) => {
  d.resource = "pods";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("shell", d),
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "pods", "Pod")
  ];
  return menu;
};

menus["pod-presets"] = (d, multi) => {
  d.resource = "podpresets.settings.k8s.io";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "podpresets", "Pod Preset")
  ];
  return menu;
};

menus["pod-security-policies"] = (d, multi) => {
  d.resource = "podsecuritypolicies.policy";
  if (multi) {
    return [];
  };

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "podsecuritypolicies", "Pod Security Policy")
  ];
  return menu;
};

menus["rbac-access"] = (d, multi) => {
  let menu = [
    {
      "icon": "glyphicons glyphicons-paired",
      "name": "Add RoleBinding",
      "resource": "rolebindings.rbac.authorization.k8s.io",
      "verb": "create",
      "action": function() {
        h.Vent.emit("link", "/cluster/rbac/rolebindings", d);
        resourceMetadata.RoleBinding.wizard({}, "rolebindings");
      }
    },
    {
      "icon": "glyphicons glyphicons-paired",
      "name": "Add ClusterRoleBinding",
      "resource": "clusterrolebindings.rbac.authorization.k8s.io",
      "verb": "create",
      "action": function() {
        h.Vent.emit("link", "/cluster/rbac/clusterrolebindings", d);
        resourceMetadata.RoleBinding.wizard({}, "clusterrolebindings");
      }
    }
  ];

  if (multi) {
    menu = [
      "noDelete",
      {
        "icon": "glyphicons glyphicons-paired",
        "name": "Add RoleBinding",
        "action": function() {
          h.Vent.emit("root:table:select:action:rbac-access-table", {
            sendBack: true,
            key: "Name",
            done: function(store) {
              h.Vent.emit("link", "/cluster/rbac/rolebindings", store);
              resourceMetadata.RoleBinding.wizard({}, "rolebindings");
            }
          });
        }
      },
      {
        "icon": "glyphicons glyphicons-paired",
        "name": "Add ClusterRoleBinding",
        "action": function() {
          h.Vent.emit("root:table:select:action:rbac-access-table", {
            sendBack: true,
            key: "Name",
            done: function(store) {
              h.Vent.emit("link", "/cluster/rbac/clusterrolebindings", store);
              resourceMetadata.RoleBinding.wizard({}, "clusterrolebindings");
            }
          });
        }
      }
    ];

    return menu;
  }

  return menu;
};

menus["replica-sets"] = (d, multi) => {
  d.resource = "replicasets.apps";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "replicasets", "Replica Set")
  ];
  return menu;
};

menus.secrets = (d, multi) => {
  d.resource = "secrets";
  if (multi) {
    return [];
  }

  let formArgs = {
    formSchema: secretForm.kube,
    uiSchema: secretUI.kube
  };

  let downloadEntry = {
    "icon": "glyphicons glyphicons-cloud-download",
    "name": "Download Kubeconfig",
    "action": function() {
      h.fetch({
        endpoint: "/kubeconfig" + h.ns(`/secrets/${d.metadata.name}`),
        success: function(response) {
          let blob = new Blob([response.context.result], {type: "text/plain;charset=utf-8"});
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", "kubeconfig");
          document.body.appendChild(link);
          link.click();
          h.Vent.emit("notification", {
            message: "kubeconfig Downloaded"
          });
        },
        error: function(a) {
          h.Vent.emit("request-error:confirm-box", a);
          h.Vent.emit("notification", {
            message: "Error while downloading..."
          });
        }
      });
    }
  };

  let menu = [
    sharedEntry("modify", d, "secrets", "Secret", formArgs),
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "secrets", "Secret")
  ];

  if (d.type === "kubernetes.io/service-account-token") {
    menu.splice(4, 0, downloadEntry);
  }

  return menu;
};

menus["sub-secrets"] = (d, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    {
      "icon": "glyphicons glyphicons-lock-open",
      "name": "Show Secret",
      "action": function() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: <div
          style={{
            fontSize: "25px"
          }}>
          <i
          className="glyphicons glyphicons-lock"
          style={{
            marginTop: "4px",
              marginRight: "10px",
              color: "#cc0000"
          }}
          />
          Secret ({d[0]})
          </div>,
          message: <pre>{d[1]}</pre>,
          bodyStyle: {
            backgroundColor: "#14171B",
            color: "#fff",
            borderRadius: "5px",
            padding: "20px",
            margin: "20px"
          }
        });
      }
    }
  ];
  return menu;
};

menus.services = (d, multi) => {
  d.resource = "services";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "services", "Service")
  ];
  return menu;
};

menus["service-accounts"] = (d, multi) => {
  d.resource = "serviceaccounts";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "serviceaccounts", "Service Account")
  ];
  return menu;
};

menus["stateful-sets"] = (d, multi) => {
  d.resource = "statefulsets.apps";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "statefulsets", "Stateful Set")
  ];
  return menu;
};

menus["storage-classes"] = (d, multi) => {
  d.resource = "storageclasses.storage.k8s.io";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "storageclasses", "Storage Class")
  ];
  return menu;
};

menus["sub-dryrun"] = (data, multi) => {
  if (multi) {
    return [];
  }

  let menu = [
    {
      "icon": "glyphicons glyphicons-code",
      "name": "View YAML",
      "action": function() {
        h.Vent.emit("layout:form-dialog-advanced:open", {
          title: `${data.d.kind} - ${data.d.metadata.name}`,
          icon: data.icon,
          bodyClass: "dialog-body-editor",
          dialogClass: "editor",
          data: data.d,
          format: "yaml",
          readOnly: true
        });
      }
    }
  ];
  return menu;
};

menus.releases = (d, multi) => {
  d.resource = "releases.marketplace.criticalstack.com";
  if (multi) {
    return [];
  }
  let menu = [
    {
      "icon": "glyphicons glyphicons-code",
      "name": "View Object",
      "resource": d.resource,
      "verb": "list",
      "action": function() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          dialogClass: "medium",
          title: <span>
          <i
          className="glyphicons glyphicons-layers"
          style={{
            marginTop: "2px",
              marginRight: "15px",
              color: "#0078e7"
          }}
          />
          {d.metadata.name}
          </span>,
          message:
          <div className="md-content">
          <pre style={{color: "#6c6c6c"}}>
          {YAML.safeDump(d)}
          </pre>
          </div>,
        });
      }
    },
    ...(d.spec.chart.schema ? [{
      "icon": "glyphicons glyphicons-layers-cogwheel",
      "name": "Simple Configuration",
      "resource": d.resource,
      "verb": "update",
      "action": function() {
        let formSchema = false;
        let uiSchema = false;
        let formValidation = false;
        let configForm;
        try {
          configForm = JSON.parse(atob(d.spec.chart.schema));
        } catch (e) {
          console.log(e);
          configForm = {};
        }

        formSchema = configForm;
        uiSchema = configForm.hasOwnProperty("uiSchema") ? configForm.uiSchema : false;

        function defaultValidation() {
          return false;
        };

        formValidation = configForm.hasOwnProperty("formValidation")
          ? configForm.formValidation
          : defaultValidation;

        try {
          formValidation = new Function("return " + formValidation)();
        } catch (e) {
          formValidation = defaultValidation;
        }

        h.Vent.emit("layout:form-dialog:open", {
          open: true,
          schema: formSchema,
          uiSchema: uiSchema,
          validate: formValidation,
          title: "Edit Configuration",
          icon: "glyphicons glyphicons-layers-cogwheel",
          bodyClass: "dialog-body-small mp-app-form-body",
          dialogClass: "stepSmall",
          formData: d.spec.chart.values,
          onAction: function(form, callback) {
            d.spec.chart.values = _.defaultsDeep(form, d.spec.chart.values);
            h.fetch({
              method: "post",
              endpoint: h.ns(`/marketplace/update/${d.spec.name}`),
              resUrl: false,
              body: JSON.stringify({data: d}),
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

                if (callback && typeof callback === "function") {
                  return callback();
                }
              }
            });
          }
        });
      }
    }] : []),
    {
      "icon": "csicon csicon-settings-editor",
      "name": "Advanced Configuration",
      "resource": d.resource,
      "verb": "update",
      "action": function() {
        let versions = [];
        let string = d.metadata.name + ".v";
        d.metadata.ownerReferences.map(x => {
          versions.push(x.name.split(string)[1]);
        });
        let max = _.max(versions);
        let latestVersion = _.indexOf(versions, max);

        h.fetch({
          endpoint: h.ns(`/marketplace/releases/secret/${d.metadata.ownerReferences[latestVersion].name}`),
          resUrl: false,
          success: function(secretData) {
            h.log.info("Result:", secretData);

            let result = secretData.context.result;
            let secret = JSON.parse(window.atob(result));

            h.Vent.emit("layout:form-dialog-advanced:open", {
              title: "Edit Configuration",
              icon: "glyphicons glyphicons-layers-cogwheel",
              bodyClass: "dialog-body-editor",
              dialogClass: "editor",
              data: secret.chart.values,
              format: "json",
              onAction: function(data, callback) {
                d.spec.chart.values = data;
                h.fetch({
                  method: "post",
                  endpoint: h.ns(`/marketplace/update/${d.spec.name}`),
                  resUrl: false,
                  body: JSON.stringify({data: d}),
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

                    if (callback && typeof callback === "function") {
                      return callback();
                    }
                  }
                });
              }
            });
          },
          error: function(a) {
            h.Vent.emit("request-error:confirm-box", a);

            h.Vent.emit("notification", {
              message: "Error while retrieving configuration values"
            });
          }
        });

      }
    },
    sharedEntry("labels", d),
    {
      "icon": "glyphicons glyphicons-bin menu-icon-warn",
      "name": "Delete",
      "resource": d.resource,
      "verb": "delete",
      "divider": "menu-divider-top",
      "action": function() {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: `Confirm Request: Delete source ${d.metadata.name}?`,
          message: `Are you sure you want to delete app release ${d.metadata.name}? This action cannot be reversed.`,
          onAction: function() {
            h.Vent.emit("notification", {
              message: `Deleting release ${d.metadata.name}`
            });

            h.Vent.emit("layout:confirm:close");

            h.fetch({
              method: "delete",
              endpoint: h.ns(`/marketplace/releases/${d.spec.name}`),
              resUrl: false,
              success: function() {
                h.view.helpers.setConfig();
              },
              error: function(a) {
                h.Vent.emit("request-error:confirm-box", a);
                return true;
              }
            });
          }
        });
      }
    },
  ];
  return menu;
};

menus["resource-quotas"] = (d, multi) => {
  d.resource = "storageclasses.storage.k8s.io";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "resourcequotas", "Resource Quota")
  ];
  return menu;
};

menus["limit-ranges"] = (d, multi) => {
  d.resource = "limitranges";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "limitranges", "Limit Range")
  ];
  return menu;
};

menus.sources = (d, multi) => {
  d.resource = "sources.marketplace.criticalstack.com";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    sharedEntry("delete", d, "sources.marketplace.criticalstack.com", "Marketplace Source"),
  ];
  return menu;
};

menus.stackapps = (d, multi) => {
  d.resource = "stackapps";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("labels", d),
    sharedEntry("events", d),
    {
      "icon": "glyphicons glyphicons-export",
      "name": "Export",
      "action": function() {
        h.view.helpers.exportStackApp(d);
      }
    },
    sharedEntry("download", d),
    sharedEntry("delete", d, "stackapps", "StackApp")
  ];
  return menu;
};

menus["traces"] = (d, multi) => {
  d.resource = "traces.tools.swoll.criticalstack.com";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("edit", d),
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "traces.tools.swoll.criticalstack.com", "Trace")
  ];
  return menu;
};

menus.verificationkeys = (d, multi) => {
  d.resource = "verificationkeys";
  if (multi) {
    return [];
  }

  let menu = [
    sharedEntry("events", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "verificationkeys", "Verification Key")
  ];
  return menu;
};

menus.connectors = (d, multi) => {
  d.resource = "connectors.dex.coreos.com";
  if (multi) {
    return [];
  }
  let isDefault = _.has(d.metadata, ["labels", "criticalstack.com/dex.default"]);

  let menu = [
    {
      "icon": "glyphicons glyphicons-star menu-icon",
      "name": "Set as default",
      "resource": d.resource,
      "verb": "patch",
      ...(isDefault ? {"disabled": true} : {}),
      "action": () => {
        h.fetch({
          method: "post",
          resUrl: false,
          endpoint: `/sso/connectors/${d.metadata.name}/default`,
          success: function() {
            h.Vent.emit("notification", {
              message: "Default updated"
            });
            return true;
          },
          error: function(a) {
            console.log("error: ", a);

            h.Vent.emit("notification", {
              message: "Error while saving"
            });
            return true;
          }
        });
      }
    },
    {
      "icon": "csicon csicon-settings-editor",
      "name": "Edit",
      "resource": d.resource,
      "verb": "update",
      "action": () => {
        connectorCreate(d);
      }
    },
    sharedEntry("labels", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "connectors.dex.coreos.com", "Connector")
  ];
  return menu;
};

menus.userrequests = (d, multi) => {
  d.resource = "userrequests.criticalstack.com";
  if (multi) {
    return [];
  }
  let isLocalUser = d.spec.template.type === "local";

  let menu = [
    (
      d.spec.template.active ?
      {
        "icon": "glyphicons glyphicons-switch-off menu-icon",
        "resource": d.resource,
        "verb": "patch",
        "name": "Deactivate",
        "action": () => {
          d.active = !d.active;
          h.fetch({
            method: "patch",
            endpoint: `/userrequests.criticalstack.com/${d.metadata.name}`,
            body: JSON.stringify([{
              "op": "replace",
              "path": "/spec/template/active",
              "value": false
            }]),
            success: function(u) {
              let result = self.state.result;
              result[u.context.result.index] = u.context.result;

              self.setState({
                result: result
              });
            }
          });
        }
      } : {
        "icon": "glyphicons glyphicons-switch-on menu-icon",
        "name": "Activate",
        "resource": d.resource,
        "verb": "patch",
        "action": () => {
          d.active = !d.active;
          h.fetch({
            method: "patch",
            endpoint: `/userrequests.criticalstack.com/${d.metadata.name}`,
            body: JSON.stringify([{
              "op": "replace",
              "path": "/spec/template/active",
              "value": true
            }]),
            success: function(u) {
              let result = self.state.result;
              result[u.context.result.index] = u.context.result;

              self.setState({
                result: result
              });
            }
          });
        }
      }
    ),
    ...(isLocalUser && _.some(_.get(d.status, "conditions", []), c => c.type === "Ready" && c.status === "True") ? [{
      "icon": "glyphicons glyphicons-lock",
      "name": "Reset Password",
      "resource": d.resource,
      "verb": "update",
      "action": () => {
        h.Vent.emit("layout:form-dialog:open", {
          open: true,
          schema: pwForm,
          uiSchema: pwUI,
          validate: pwValidation,
          small: true,
          title: "Reset User Password",
          icon: "glyphicons glyphicons-lock",
          onAction: function(form, callback) {
            h.fetch({
              method: "post",
              resUrl: false,
              endpoint: `/users/${d.status.user}/reset`,
              body: JSON.stringify({
                password: form.password
              }),
              success: function() {
                h.Vent.emit("notification", {
                  message: `User ${d.spec.template.email} successfully updated.`
                });

                h.Vent.emit("layout:form-dialog:close");

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
    }] : []),
    sharedEntry("edit", d),
    sharedEntry("download", d),
    sharedEntry("delete", d, "userrequests.criticalstack.com", "User")
  ];
  return menu;
};

export default menus;
