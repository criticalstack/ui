"use strict";

import _ from "lodash";
import h from "../../helpers";

class LocalStorageHelper {

  get namespace() {
    return "csos";
  }

  constructor(key, value, sessionStorage) {
    this.storageType = "localStorage";
    this.key = key;

    if (!this.key) {
      throw "Error: localStorage class needs a key";
    }

    if (sessionStorage) {
      this.sessionStorage = true;
    }

    this.value = value || {};
  }

  get sessionStorage() {
    return false;
  }

  set sessionStorage(value) {
    if (value) {
      this.storageType = "sessionStorage";
    } else {
      this.storageType = "localStorage";
    }
  }

  init(value) {
    if (window[this.storageType][this.key]) {
      this.value = this.raw();
    } else if (value) {
      this.update(value);
      this.save();
    } else {
      this.update({});
      this.save();
    }
  }

  raw() {
    return window[this.storageType][this.key];
  }

  encode() {
    return JSON.stringify(this.value);
  }

  decode() {
    if (typeof this.value === "string") {
      try {
        return JSON.parse(this.value);
      } catch (e) {
        h.Vent.emit("notification", {
          message: `Local Storage was corrupted: ${e}`
        });
      }
    }

    return this.value;
  }

  save() {
    window[this.storageType][this.key] = this.encode();
  }

  update(data) {
    var update = {};
    _.merge(update, this.decode(), data);
    this.value = update;
    this.save();
  }

  replace(data) {
    this.value = data;
    this.save();
  }

  data() {
    return this.decode();
  }
}

export default LocalStorageHelper;
