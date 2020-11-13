"use strict";

import h from "../lib/helpers";
import _ from "lodash";

class MetricsFetcher {

  constructor(path, name, options) {
    this.path = path;
    this.params = options.params || {};
    this.delay = options.delay || 30;
    this.id = `metrics-${path}-${name}`;

    this.ignoreTimestamp = options.ignoreTimestamp || false;

    this.success = _.isFunction(options.success) ? options.success : function() {};
    this.error = _.isFunction(options.error) ? options.error : function() {};

    this.latestTimestamp = null;

    return this;
  }

  bind(callback) {
    var self = this;

    h.Vent.addListener(this.id, function(data, err) {
      if (err) {
        return self.error(err);
      }
      return self.success(data);
    });

    self.fetch(callback);
    this.tmpTimeout = setInterval(self.fetch.bind(self, null), self.delay * 1000);
  }

  unbind(callback) {
    var self = this;

    if (self.tmpRequest) {
      self.tmpRequest.abort();
    }
    clearInterval(self.tmpTimeout);
    h.Vent.removeAllListeners(self.id);

    if (_.isFunction(callback)) {
      return callback();
    }
  }

  fetch(callback) {
    var self = this;

    if (self.tmpRequest) {
      self.tmpRequest.abort();
    }

    var params = {};

    if (self.latestTimestamp && !self.ignoreTimestamp) {
      params.start = self.latestTimestamp;
    }

    self.tmpRequest = h.fetch({
      dataType: "json",
      endpoint: self.path,
      resUrl: false,
      success: function(data) {
        self.tmpRequest = null;

        if (data.context.error) {
        }

        if (data.context.result.latestTimestamp) {
          self.latestTimestamp = data.context.result.latestTimestamp;
        }

        h.Vent.emit(self.id, data);

        if (_.isFunction(callback)) {
          return callback();
        }

      }, error: function(a, b) {
        self.tmpRequest = null;
        h.Vent.emit(self.id, {}, b);

        if (_.isFunction(callback)) {
          return callback();
        }
      }
    });
  }

}

export default MetricsFetcher;
