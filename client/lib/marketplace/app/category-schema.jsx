"use strict";

import React from "react";
import csData from "../cs-data.jsx";

let categoryNames = csData.map( c => {
  return c.name;
});

let categoryValues = csData.map( c => {
  return c.appId;
});

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "properties": {
      "categories": {
        "type": "array",
        "title": "Categories",
        "items": {
          "type": "string",
          "enumNames": categoryNames,
          "enum": categoryValues,
        },
        "minItems": 1,
        "uniqueItems": true
      },
    },
  },
  uiSchema: {
    "categories": {
      "ui:widget": "checkboxes",
      "classNames": "grid-3-col"
    },
  }
};
