"use strict";

import React from "react";

import EditFormats from "./general/formats/edit-formats";
import EditMetrics from "./general/metrics/edit-metrics";
import EditProfile from "./general/edit-profile";
import SSOProvider from "./general/sso/sso-provider";
import EditUsers from "./general/edit-users";
import EditSources from "./marketplace/sources/edit-sources.jsx";

const listContent = {
  "general": {
    type: "list-heading",
    primary: "General"
  },
  "user-profile": {
    type: "list-entry",
    primary: "User Profile",
    secondary: "Edit your user profile",
    icon: "csicon csicon-settings-user",
    content: <EditProfile />
  },
  "manage-users": {
    type: "list-entry",
    primary: "Manage Users",
    secondary: "Add and remove users from the system",
    icon: "csicon csicon-settings-manage-users",
    view: "can_view_cluster_roles",
    edit: "can_edit_cluster_roles",
    content: <EditUsers />,
    resource: "users.criticalstack.com"
  },
  "sso-provider": {
    type: "list-entry",
    primary: "SSO Provider",
    secondary: "Edit your SSO Provider",
    icon: "glyphicons glyphicons-key",
    content: <SSOProvider />,
    resource: "configmaps"
  },
  "marketplace": {
    type: "list-heading",
    primary: "Marketplace",
    resources: ["sources.marketplace.criticalstack.com"]
  },
  "sources": {
    type: "list-entry",
    primary: "Sources",
    secondary: "Add and remove marketplace sources",
    icon: "glyphicons glyphicons-folder-cogwheel",
    content: <EditSources />,
    resource: "sources.marketplace.criticalstack.com"
  },
  "ui": {
    type: "list-heading",
    primary: "User Interface",
  },
  "display-formats": {
    type: "list-entry",
    primary: "Section Editor",
    secondary: "Edit section editor behavior",
    icon: "csicon csicon-settings-editor",
    content: <EditFormats />
  },
  "metrics-settings": {
    type: "list-entry",
    primary: "Metrics Settings",
    secondary: "Edits metrics options and settings",
    icon: "csicon csicon-settings-metrics",
    content: <EditMetrics />
  }
};

export default listContent;
