"use strict";

import React from "react";
import {
  Router,
  Route,
  Redirect,
  Switch
} from "react-router-dom";
import _ from "lodash";
import { createBrowserHistory } from "history";
const history = createBrowserHistory();

// Material UI theme
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import CSOSTheme from "../shared/themes/csos";
const theme = createMuiTheme(CSOSTheme);

// Misc
import Login from "./layout/login";
import Layout from "./layout/layout";
import NotFound from "./layout/not-found";

// Cluster
import CLNamespaces from "./cluster/namespaces/namespaces";
import CLPodSecurityPolicies from "./cluster/pod-security-policies/pod-security-policies";
import CLComponentStatuses from "./cluster/component-statuses/component-statuses";
import CLRbac from "./cluster/rbac/rbac";
import CLCrds from "./cluster/custom-resource-definitions/custom-resource-definitions";

// Nodes
import DCNodes from "./datacenter/nodes/nodes";

// Workloads
import DCDeployments from "./datacenter/deployments/deployments";
import DCReplicaSets from "./datacenter/replica-sets/replica-sets";
import DCDaemonSets from "./datacenter/daemon-sets/daemon-sets";
import DCStatefulSets from "./datacenter/stateful-sets/stateful-sets";
import DCCronJobs from "./datacenter/cron-jobs/cron-jobs";
import DCJobs from "./datacenter/jobs/jobs";
import DCReleases from "./datacenter/releases/releases";
import DCPods from "./datacenter/pods/pods";
import DCPodsContainerView from "./datacenter/containers/container-view";

// Services and Discovery
import DCServices from "./datacenter/services/services";
import DCIngress from "./datacenter/ingress/ingress";
import DCNetworkPolicies from "./datacenter/network-policies/network-policies";

// Storage
import DCPersistentVolumes from "./datacenter/persistent-volumes/persistent-volumes";
import DCPersistentVolumeClaims from "./datacenter/persistent-volume-claims/persistent-volumes-claims";
import DCStorageClasses from "./datacenter/storage-classes/storage-classes";

// Config
import DCConfigMaps from "./datacenter/config-maps/config-maps";
import DCPodPresets from "./datacenter/pod-presets/pod-presets";
import DCSecrets from "./datacenter/secrets/secrets";

// More
import DCEndpoints from "./datacenter/endpoints/endpoints";
import DCResourceQuotas from "./datacenter/resource-quotas/resource-quotas";
import DCLimitRanges from "./datacenter/limit-ranges/limit-ranges";
import DCHorizontalPodAutoscalers from "./datacenter/horizontal-pod-autoscalers/horizontal-pod-autoscalers";
import DCServiceAccounts from "./datacenter/service-accounts/service-accounts";
import DCEvents from "./datacenter/events/events";

// Unified view
import Resources from "./datacenter/resources/resources";

// Settings
import Settings from "./settings/settings";

// Marketplace
import Marketplace from "./marketplace/marketplace";

// StackApps
import StackApps from "./stackapps/stackapps";

// Swoll
import SwollTraces from "./swoll/traces/traces";

// Registration
import Register from "./layout/register";

let csConfig = JSON.parse(localStorage.getItem("cs-config")) || {};
let enableMarketplace = _.get(csConfig, "marketplace.enabled", false);

const defaultLanding = enableMarketplace ?
  <Route exact path="/" render={() => (
    <Redirect to="/marketplace/feature/home" />
  )} /> :
  <Route exact path="/" render={() => (
    <Redirect to="/datacenter/nodes" />
  )} />;

const routes = (
  <Router history={history}>
    <MuiThemeProvider theme={theme}>
      <Switch>

        {/* REGISTRATION */}
        <Route exact path="/register/token/:token" component={Register} />

        <Layout>
          <Switch>
            {/* Default landing */}
            {defaultLanding}

            {/* DATACENTER */}
            <Route exact path="/datacenter" render={() => (
              <Redirect to="/datacenter/nodes" />
            )} />

            {/* Nodes */}
            <Route path="/datacenter/nodes" component={DCNodes} />

            {/* Workloads */}
            <Route path="/datacenter/deployments" component={DCDeployments} />
            <Route path="/datacenter/replica-sets" component={DCReplicaSets} />
            <Route path="/datacenter/daemon-sets" component={DCDaemonSets} />
            <Route path="/datacenter/stateful-sets" component={DCStatefulSets} />
            <Route path="/datacenter/cron-jobs" component={DCCronJobs} />
            <Route path="/datacenter/jobs" component={DCJobs} />
            <Route path="/datacenter/releases" component={DCReleases} />

            <Route exact path="/datacenter/pods/" component={DCPods} />
            <Route path="/datacenter/pods/:pod/:id/:tab" component={DCPodsContainerView} />

            {/* Services and Discovery */}
            <Route path="/datacenter/services" component={DCServices} />
            <Route path="/datacenter/ingress" component={DCIngress} />
            <Route path="/datacenter/network-policies" component={DCNetworkPolicies} />

            {/* Storage */}
            <Route path="/datacenter/persistent-volumes" component={DCPersistentVolumes} />
            <Route path="/datacenter/persistent-volume-claims" component={DCPersistentVolumeClaims} />
            <Route path="/datacenter/storage-classes" component={DCStorageClasses} />

            {/* Config */}
            <Route path="/datacenter/pod-presets" component={DCPodPresets} />
            <Route path="/datacenter/secrets" component={DCSecrets} />
            <Route path="/datacenter/config-maps" component={DCConfigMaps} />

            {/* More */}
            <Route path="/datacenter/endpoints" component={DCEndpoints} />
            <Route path="/datacenter/resource-quotas" component={DCResourceQuotas} />
            <Route path="/datacenter/limit-ranges" component={DCLimitRanges} />
            <Route path="/datacenter/horizontal-pod-autoscalers" component={DCHorizontalPodAutoscalers} />
            <Route path="/datacenter/service-accounts" component={DCServiceAccounts} />
            <Route path="/datacenter/events" component={DCEvents} />

            {/* Unified View */}
            <Route path="/datacenter/resources" component={Resources} />

            {/* Settings */}
            <Route exact path="/datacenter/settings" render={() => (
              <Redirect to="/datacenter/settings/user-profile" />
            )} />
            <Route path="/datacenter/settings/:page" component={Settings} />

            {/* MARKETPLACE */}
            <Route exact path="/marketplace" render={() => (
              <Redirect to="/marketplace/feature/home" />
            )} />

            <Route exact path="/marketplace/feature/:feature" component={Marketplace} />
            <Route exact path="/marketplace/feature/:feature/category/:category" component={Marketplace} />
            <Route exact path="/marketplace/feature/:feature/category/:category/source/:source" component={Marketplace} />
            <Route exact path="/marketplace/feature/:feature/source/:source" component={Marketplace} />
            <Route exact path="/marketplace/app/:app" component={Marketplace} />

            {/* CLUSTER */}
            <Route exact path="/cluster" render={() => (
              <Redirect to="/cluster/rbac/access" />
            )} />
            <Route path="/cluster/namespaces" component={CLNamespaces} />
            <Route path="/cluster/pod-security-policies" component={CLPodSecurityPolicies} />
            <Route path="/cluster/component-statuses" component={CLComponentStatuses} />
            <Route path="/cluster/rbac/:type" component={CLRbac} />
            <Route path="/cluster/custom-resource-definitions" component={CLCrds} />

            {/* STACKAPPS */}
            <Route exact path="/stackapps" component={StackApps} />
            <Route path="/stackapps/:type" component={StackApps} />

            {/* SWOLL */}
            <Route exact path="/swoll" component={SwollTraces}/>

            {/* Login */}
            <Route exact path="/login" component={Login} />

            {/* 404 */}
            <Route path="*" component={NotFound} />
          </Switch>
        </Layout>
      </Switch>
    </MuiThemeProvider>
  </Router>
);

export default routes;
