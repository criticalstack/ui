"use strict";

import LocalStorageHelper from "./helper";

class History extends LocalStorageHelper {
  constructor(key, value, sessionStorage) {
    super(key, value, sessionStorage);

    this.value = value || {
      history: []
    };
  }
}

export default History;
