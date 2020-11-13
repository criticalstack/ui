"use strict";

import LocalStorageHelper from "./helper";

class MarketplaceLayout extends LocalStorageHelper {

  constructor(key, value, sessionStorage) {
    super(key, value, sessionStorage);

    this.value = value || {};
  }
}

export default MarketplaceLayout;
