"use strict";

import React from "react";
import ContentLoader from "../../layout/content-loader";
import RBACAuthorization from "./rbac-authorization";
import h from "../../helpers";

class RBAC extends React.Component {
  componentDidMount() {
    h.Vent.addListener("rbac:update:content", (params) => {
      this.props.history.push(`/cluster/rbac/${params.type}`);
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.location.pathname !== prevProps.location.pathname) {
      h.Vent.emit("content-loader:fetch:state");
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("rbac:update:content");
  }

  render() {
    let types = {
      access: {
        name: "Access",
        endpoint: "rbac/users",
        resUrl: false,
        websocket: false,
        namespaced: false,
        noButtons: true,
        icon: "glyphicons glyphicons-user-check",
        resource: "users.criticalstack.com"
      },
      roles: {
        name: "Roles",
        endpoint: "roles",
        resUrl: true,
        websocket: "roles",
        namespaced: true,
        icon: "glyphicons glyphicons-file-lock",
        resource: "roles.rbac.authorization.k8s.io"
      },
      rolebindings: {
        name: "RoleBindings",
        endpoint: "rolebindings",
        resUrl: true,
        websocket: "rolebindings",
        namespaced: true,
        icon: "glyphicons glyphicons-paired",
        resource: "rolebindings.rbac.authorization.k8s.io"
      },
      clusterroles: {
        name: "ClusterRoles",
        endpoint: "clusterroles",
        resUrl: true,
        websocket: "clusterroles",
        namespaced: false,
        icon: "glyphicons glyphicons-file-lock",
        resource: "clusterroles.rbac.authorization.k8s.io"
      },
      clusterrolebindings: {
        name: "ClusterRoleBindings",
        endpoint: "clusterrolebindings",
        resUrl: true,
        websocket: "clusterrolebindings",
        namespaced: false,
        icon: "glyphicons glyphicons-paired",
        resource: "clusterrolebindings.rbac.authorization.k8s.io"
      }
    };

    let model = types[this.props.match.params.type];

    const config = {
      title: model.name,
      endpoint: model.endpoint,
      resUrl: model.resUrl,
      websocket: model.websocket,
      namespaced: model.namespaced,
      api: "rbac.authorization.k8s.io/v1",
      events: "Namespace",
      ignoreWebsocket: false,
      icon: model.icon,
      noResultBypass: true,
      noResultTitle: `No ${model.name}`,
      noResultBody: `No ${model.name} were found`,
      location: this.props.location,
      noButtons: model.hasOwnProperty("noButtons") ? model.noButtons : false,
      editor: true,
      content: <RBACAuthorization />,
      resource: model.resource
    };

    return (
      <ContentLoader
        config={config}
      />
    );
  }
}

export default RBAC;
