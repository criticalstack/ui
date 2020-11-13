"use strict";

import LocalStorageHelper from "./helper";

class Tables extends LocalStorageHelper {

  constructor(key, value, sessionStorage) {
    super(key, value, sessionStorage);

    this.value = value || {
      rows: 50
    };

  }

}

export default Tables;
