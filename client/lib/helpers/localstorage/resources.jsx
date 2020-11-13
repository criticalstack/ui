"use strict";

import LocalStorageHelper from "./helper";

class Resources extends LocalStorageHelper {
  constructor(key, value, sessionStorage) {
    super(key, value, sessionStorage);

    this.value = value || {
      activeKinds: [],
      layout: "",
      filter: ""
    };
  }
}

export default Resources;
