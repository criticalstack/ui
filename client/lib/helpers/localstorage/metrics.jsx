"use strict";

import LocalStorageHelper from "./helper";

class Metrics extends LocalStorageHelper {

  constructor(key, value, sessionStorage) {
    super(key, value, sessionStorage);

    this.value = value || {
      podtable: true,
      containerview: true,
      nodes: true
    };

  }

}

export default Metrics;
