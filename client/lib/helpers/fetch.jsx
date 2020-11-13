"use strict";

import _ from "lodash";

let global = {};

global.nsCheck = function(path) {
  let ignore = [
    "namespaces?force=true",
    "clusterroles",
    "clusterrolebindings",
    "podsecuritypolicies",
    "users",
    "sources.marketplace.criticalstack.com"
  ];

  if (ignore.indexOf(path) !== -1) {
    return false;
  }

  return true;
};

global.ns = function(uri, params) {
  var self = this;
  var search = "";
  var url = "";

  if (typeof params === "function") {
    params = {};
  }

  var watch = false;

  if (params && params.hasOwnProperty("watch") && params.watch) {
    watch = true;
  }

  if (params && params.hasOwnProperty("search")) {
    if (typeof params.search === "function") {
      // search = params.search();
    } else {
      search = params.search;
    }
  }

  if (typeof search === "object") {
    window.location.hash = "";
    search = "";
  }

  if (window.localStorage["csos-namespace"]) {

    if (_.includes(uri, "?")) {
      url = uri + "&namespace=" + window.localStorage["csos-namespace"];
    } else {
      url = uri + "?namespace=" + window.localStorage["csos-namespace"];
    }

    if (_.includes(url, "?")) {
      url += search.replace("?", "&");
    } else {
      url += search;
    }

    url = watch ? "/watch" + url : url;

    self.log.info("Namespace Route:", url, params);
    return url;
  }

  var ns = window.CSOS.DefaultNamespace;
  window.localStorage["csos-namespace"] = ns;

  if (_.includes(uri, "?")) {
    url = uri + "&namespace=" + ns;
  } else {
    url = uri + "?namespace=" + ns;
  }

  if (_.includes(url, "?")) {
    url = url + search.replace("?", "&");
  } else {
    url = url + search;
  }

  url = watch ? "/watch" + url : url;

  self.log.info("Namespace Route:", url, params);
  return url;
};

global.url = function(api, resUrl) {
  let url = this.PROTOCOL + "//" + this.HOST;

  if (api) {
    url += "/api/v" + this.API_VERSION;
  }

  if (resUrl) {
    url += "/resources";
  }

  return url;
};

global.buildQuery = function(query) {
  if (!query) {
    return "";
  }

  const len = Object.keys(query).length;

  if (len <= 0) {
    return "";
  }

  let queryString = "?";

  Object.keys(query).map((key, i) => {
    queryString += `${key}=${query[key]}${i < len - 1 ? "&" : ""}`;
  });

  return queryString;
};

global.fetch = function(params) {
  const self = this;
  // const config = h.view.helpers.getConfig();
  const method = _.get(params, "method", "get");
  const auth = _.get(params, "auth", true);
  const api = _.get(params, "api", true);
  const resUrl = _.get(params, "resUrl", true);
  const baseUrl = self.url(api, resUrl);
  const endpoint = params.endpoint;
  // const needle = {
    // name: endpoint.replace("/", "")
  // };
  // const configEntry = _.find(_.get(config, "kubernetes.resources", {}), needle);
  // console.log(endpoint, _.get(configEntry, "namespaced", "miss"));
  let query = self.buildQuery(_.get(params, "query", false));
  const body = _.get(params, "body", false);

  if (_.includes(endpoint, "?")) {
    query = query.replace("?", "&");
  }

  const url = `${baseUrl}${endpoint}${query}`;

  let getCookie = function(name) {
    let cookies = decodeURIComponent(document.cookie).split(";");
    for (let i = 0; i < cookies.length; i++) {
      let c = cookies[i];
      while (c.charAt(0) === " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name + "=") === 0) {
        return c.substring(name.length + 1, c.length);
      }
    }
    return null;
  };

  let proto = url.substr(0, url.indexOf("://"));

  const defaultHeader = {
    "Accept": "application/json",
    "Content-type": "application/json"
  };

  const authHeader = {
    "X-CS-CSRF-Token": getCookie(proto === "https" ? "__Host-cs-csrf" : "cs-csrf"),
    "X-Forwarded-Proto": proto
  };

  const headers = auth
    ? Object.assign({}, defaultHeader, authHeader)
    : defaultHeader;

  let options = {
    method: method.toUpperCase(),
    headers: headers
  };

  if (body) {
    options.body = body;
  }

  const actions = {
    validate: async function(response) {
      if (!response.ok) {
        response.responseJSON = await response.json();
        throw response;
      }
      return response;
    },
    convert: (response) => {
      return response.json();
    },
    success: (result) => {
      if (typeof params.success === "function") {
        return params.success(result);
      }
    },
    error: (error) => {
      if (typeof params.error === "function") {
        return params.error(error);
      }
      self.log.info("Fetch error: ", error);
    }
  };

  fetch(url, options)
    .then(actions.validate)
    .then(actions.convert)
    .then(actions.success)
    .catch(actions.error);
};

export default global;
