"use strict";

import React from "react";
import csData from "../../../marketplace/cs-data.jsx";

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
      "metadata": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "title": "Name",
            "readOnly": true
          }
        },
        "required": ["name"]
      },
      "spec": {
        "type": "object",
        "properties": {
          "proper_name": {
            "type": "string",
            "title": "Proper Name"
          },
          "app_name": {
            "type": "string",
            "title": "App Name",
            "readOnly": true
          },
          "description": {
            "type": "string",
            "title": "Description"
          },
          "license": {
            "type": "string",
            "title": "License"
          },
          "author": {
            "type": "string",
            "title": "Author"
          },
          "website": {
            "type": "string",
            "title": "Website"
          },
          "source_name": {
            "type": "string",
            "title": "Source Name",
            "readOnly": true

          },
          "version": {
            "type": "string",
            "title": "Version",
            "readOnly": true
          },
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
          "icon": {
            "type": "string",
            "title": "Icon"
          },
          "url": {
            "type": "string",
            "title": "URL",
            "readOnly": true
          }
        },
        "required": [
          "proper_name",
          "app_name",
          "description",
          "license",
          "author",
          "website",
          "source_name",
          "version",
          "categories",
          "url"
        ],
      }
    },
    "dependencies": {}
  },
  uiSchema: {
    "spec": {
      "description": {
        "ui:widget": "textarea"
      },
      "categories": {
        "ui:widget": "checkboxes",
        "classNames": "grid-3-col"
      },
      "icon": {
        "ui:widget": (props) => {
          return (
            <div className="img-preview-input">
              <img src={props.value} />
              <input type="text"
                value={props.value}
                required={props.required}
                onChange={(event) => props.onChange(event.target.value)} />
            </div>
          );
        }
      }
    }
  }
};
