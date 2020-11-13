"use strict";

import LocalStorageHelper from "./helper";

class Formats extends LocalStorageHelper {

  constructor(key, value, sessionStorage) {
    super(key, value, sessionStorage);

    this.value = value || {
      editorFormat: "yaml",
      editorMode: "emacs",
      editorFontSize: 16,
      nodeLayout: "card"
    };
  }
}

export default Formats;
