"use strict";

import React from "react";
import { NavLink } from "react-router-dom";
import MenuMaker from "../../../shared/menu-maker";
import _ from "lodash";
import { withRouter } from "react-router-dom";

const expansionIcon = (
  <i
    className="glyphicons glyphicons-chevron-down"
    style={{marginLeft: "10px"}}
  />
);

class SubMenu extends React.Component {
  makeLink(link) {
    let linkAction = () => {
      this.props.history.push(link);
      return false;
    };

    return linkAction;
  }

  setListVerb(entries) {
    let links = entries.links;

    Object.entries(links).forEach( ([key, value]) => {
      if (value.hasOwnProperty("menu")) {
        let subEntries = links[key].menu.entries;

        Object.keys(subEntries).forEach( entry => {
          links[key].menu.entries[entry].verb = "list";
        });
      }
    });

    return entries;
  }

  clusterEntries() {
    let entries = {
      "path": "cluster",
      "links": {
        "access": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Access Control
                {expansionIcon}
              </span>,
              "icon": "glyphicons glyphicons-shield-check menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "access",
                "icon": "glyphicons glyphicons-user-check",
                "name": "Access",
                "link": this.makeLink("/cluster/rbac/access"),
                "resource": "users.criticalstack.com"
              },
              1: {
                "ident": "roles",
                "icon": "glyphicons glyphicons-file-lock",
                "name": "Roles",
                "link": this.makeLink("/cluster/rbac/roles"),
                "resource": "roles.rbac.authorization.k8s.io"
              },
              2: {
                "ident": "rolebindings",
                "icon": "glyphicons glyphicons-paired",
                "name": "RoleBindings",
                "link": this.makeLink("/cluster/rbac/rolebindings"),
                "resource": "rolebindings.rbac.authorization.k8s.io"
              },
              3: {
                "ident": "clusterroles",
                "icon": "glyphicons glyphicons-file-lock",
                "name": "ClusterRoles",
                "link": this.makeLink("/cluster/rbac/clusterroles"),
                "resource": "clusterroles.rbac.authorization.k8s.io"
              },
              4: {
                "ident": "clusterrolebindings",
                "icon": "glyphicons glyphicons-paired",
                "name": "ClusterRoleBindings",
                "link": this.makeLink("/cluster/rbac/clusterrolebindings"),
                "resource": "clusterrolebindings.rbac.authorization.k8s.io"
              }
            }
          }
        },
        "namespaces": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Namespaces
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-namespace menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "namespaces",
                "icon": "csicon csicon-namespace",
                "name": "Namespaces",
                "link": this.makeLink("/cluster/namespaces"),
                "resource": "namespaces"
              },
            }
          }
        },
        "security": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Security
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-mp-information-security menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "pod-security-policies",
                "icon": "csicon csicon-pod-security-policies",
                "name": "Pod Security Policies",
                "link": this.makeLink("/cluster/pod-security-policies"),
                "resource": "podsecuritypolicies.policy"
              }
            }
          }
        },
        "health": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Health
                {expansionIcon}
              </span>,
              "icon": "glyphicons glyphicons-pulse menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "component-statuses",
                "icon": "csicon csicon-component-statuses",
                "name": "Component Statuses",
                "link": this.makeLink("/cluster/component-statuses"),
                "resource": "componentstatuses"
              }
            }
          }
        },
        "more": {
          menu: {
            "entries": {
              0: {
                "ident": "custom-resource-definitions",
                "icon": "glyphicons glyphicons-palette-package",
                "name": "Custom Resource Definitions",
                "link": this.makeLink("/cluster/custom-resource-definitions"),
                "resource": "customresourcedefinitions.apiextensions.k8s.io"
              }
            },
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                More
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-more menu-icon-sub-header"
            }
          }
        }
      }
    };

    let entriesWithVerb = this.setListVerb(entries);
    return entriesWithVerb;
  }

  datacenterEntries() {
    let entries = {
      "path": "datacenter",
      "links": {
        "nodes": {
          name: "Nodes",
          icon: "glyphicons glyphicons-vector-path menu-icon-sub-header",
          classNames: "menu-icon-sub-header-nopad"
        },
        "resources": {
          name: "Resources",
          icon: "glyphicons glyphicons-palette-package menu-icon-sub-header",
          classNames: ""
        },
        "workloads": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Workloads
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-workloads menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "deployments",
                "icon": "csicon csicon-deployments",
                "name": "Deployments",
                "link": this.makeLink("/datacenter/deployments"),
                "resource": "deployments.apps"
              },
              1: {
                "ident": "replica-sets",
                "icon": "csicon csicon-replica-sets",
                "name": "Replica Sets",
                "link": this.makeLink("/datacenter/replica-sets"),
                "resource": "replicasets.apps"
              },
              2: {
                "ident": "daemon-sets",
                "icon": "csicon csicon-daemon-sets",
                "name": "Daemon Sets",
                "link": this.makeLink("/datacenter/daemon-sets"),
                "resource": "daemonsets.apps"
              },
              3: {
                "ident": "stateful-sets",
                "icon": "csicon csicon-stateful-sets",
                "name": "Stateful Sets",
                "link": this.makeLink("/datacenter/stateful-sets"),
                "resource": "statefulsets.apps"
              },
              4: {
                "ident": "cron-jobs",
                "icon": "csicon csicon-cron-jobs",
                "name": "Cron Jobs",
                "link": this.makeLink("/datacenter/cron-jobs"),
                "resource": "cronjobs.batch"
              },
              5: {
                "ident": "jobs",
                "icon": "csicon csicon-jobs",
                "name": "Jobs",
                "link": this.makeLink("/datacenter/jobs"),
                "resource": "jobs.batch"
              },
              6: {
                "ident": "pods",
                "icon": "csicon csicon-pods",
                "name": "Pods",
                "link": this.makeLink("/datacenter/pods"),
                "resource": "pods"
              },
              7: {
                "ident": "releases",
                "icon": "glyphicons glyphicons-simple-trolley",
                "name": "App Releases",
                "link": this.makeLink("/datacenter/releases"),
                "resource": "releases.marketplace.criticalstack.com"
              }
            }
          }
        },
        "services": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Services and Discovery
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-services-discovery menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "ingress",
                "icon": "csicon csicon-ingress",
                "name": "Ingress",
                "link": this.makeLink("/datacenter/ingress"),
                "resource": "ingresses.extensions"
              },
              1: {
                "ident": "services",
                "icon": "csicon csicon-services",
                "name": "Services",
                "link": this.makeLink("/datacenter/services"),
                "resource": "services"
              },
              2: {
                "ident": "endpoints",
                "icon": "csicon csicon-endpoints",
                "name": "Endpoints",
                "link": this.makeLink("/datacenter/endpoints"),
                "resource": "endpoints"
              }
            }
          }
        },
        "storage": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Storage
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-storage menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "persistent-volume-claims",
                "icon": "csicon csicon-persistent-volume-claims",
                "name": "Persistent Volume Claims",
                "link": this.makeLink("/datacenter/persistent-volume-claims"),
                "resource": "persistentvolumeclaims"
              },
              1: {
                "ident": "persistent-volumes",
                "icon": "csicon csicon-persistent-volumes",
                "name": "Persistent Volumes",
                "link": this.makeLink("/datacenter/persistent-volumes"),
                "resource": "persistentvolumes"
              },
              2: {
                "ident": "storage-classes",
                "icon": "csicon csicon-storage-classes",
                "name": "Storage Classes",
                "link": this.makeLink("/datacenter/storage-classes"),
                "resource": "storageclasses.storage.k8s.io"
              }
            }
          }
        },
        "config": {
          menu: {
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                Config
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-config menu-icon-sub-header"
            },
            "entries": {
              0: {
                "ident": "pod-presets",
                "icon": "csicon csicon-pod-presets",
                "name": "Pod Presets",
                "link": this.makeLink("/datacenter/pod-presets"),
                "resource": "podpresets.settings.k8s.io"
              },
              1: {
                "ident": "network-policies",
                "icon": "csicon csicon-mp-networking",
                "name": "Network Policies",
                "link": this.makeLink("/datacenter/network-policies"),
                "resource": "networkpolicies.networking.k8s.io"
              },
              2: {
                "ident": "secrets",
                "icon": "csicon csicon-secrets",
                "name": "Secrets",
                "link": this.makeLink("/datacenter/secrets"),
                "resource": "secrets"
              },
              3: {
                "ident": "service-accounts",
                "icon": "csicon csicon-service-accounts",
                "name": "Service Accounts",
                "link": this.makeLink("/datacenter/service-accounts"),
                "resource": "serviceaccounts"
              },
              4: {
                "ident": "config-maps",
                "icon": "csicon csicon-config-maps",
                "name": "Config Maps",
                "link": this.makeLink("/datacenter/config-maps"),
                "resource": "configmaps"
              },
              5: {
                "ident": "horizontal-pod-autoscalers",
                "icon": "csicon csicon-autoscale",
                "name": "Horizontal Pod Autoscalers",
                "link": this.makeLink("/datacenter/horizontal-pod-autoscalers"),
                "resource": "horizontalpodautoscalers.autoscaling"
              },
            }
          }
        },
        "more": {
          menu: {
            "entries": {
              0: {
                "ident": "resource-quotas",
                "icon": "csicon csicon-resource-quotas",
                "name": "Resource Quotas",
                "link": this.makeLink("/datacenter/resource-quotas"),
                "resource": "resourcequotas"
              },
              1: {
                "ident": "limit-ranges",
                "icon": "csicon csicon-limit-ranges",
                "name": "Limit Ranges",
                "link": this.makeLink("/datacenter/limit-ranges"),
                "resource": "limitranges"
              },
              2: {
                "ident": "events",
                "icon": "csicon csicon-events",
                "name": "Events",
                "link": this.makeLink("/datacenter/events"),
                "resource": "events"
              }
            },
            "args": {
              "style": {
                textAlign: "left",
                fontSize: ".9em"
              },
              "sub-menu": true,
              "label": <span className="sub-menu-chevron">
                More
                {expansionIcon}
              </span>,
              "icon": "csicon csicon-more menu-icon-sub-header"
            }
          }
        }
      }
    };

    let entriesWithVerb = this.setListVerb(entries);

    return entriesWithVerb;
  }

  stackAppEntries() {
    return "";
  }

  renderHeadings(headings, key) {
    var activePath = this.props.location.pathname;

    if (headings.links[key].hasOwnProperty("menu")) {
      let menu = headings.links[key].menu;

      return (
        <React.Fragment key={key}>
          <MenuMaker data={menu} path={activePath} />
        </React.Fragment>
      );

    } else {

      var name = headings.links[key].name;
      var icon = headings.links[key].icon;
      var path = headings.path;

      return (
        <NavLink
          key={key}
          to={"/" + path + "/" + key}
          activeClassName="active"
          className={`header-sub-menu-item ${headings.links[key].classNames}`}>
          <i className={"header-sub-menu-icon " + icon}></i>
          <span className="header-sub-menu-label">{name}</span>
        </NavLink>
      );
    }
  }

  render() {
    let features = {
      cluster: () => this.clusterEntries(),
      datacenter: () => this.datacenterEntries(),
      stackapps: () => this.stackAppEntries()
    };

    let fullPath = this.props.history.location.pathname;
    let feature = fullPath.split("/")[1];
    let headings = {};
    if (features.hasOwnProperty(feature)) {
      headings = features[feature]();
    }
    let keys = _.keys(headings.links);
    let menus = keys.map((i) => this.renderHeadings(headings, i));

    return (
      <div className="header-sub-menu-datacenter">
        {menus}
      </div>
    );
  }
}

export default withRouter(SubMenu);
