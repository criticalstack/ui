"use strict";

import React from "react";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": [
      "description",
      "home",
      "icon"
    ],
    "properties": {
      "name": {
        "type": "string",
        "title": "Name",
        "readOnly": true
      },
      "description": {
        "type": "string",
        "title": "Description"
      },
      "home": {
        "type": "string",
        "title": "Home"
      },
      "icon": {
        "type": "string",
        "title": "Icon"
      },
      "keywords": {
        "type": "array",
        "title": "Keywords",
        "items": {
          "type": "string"
        }
      }
    }
  },
  uiSchema: {
    "description": {
      "ui:widget": "textarea"
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
    },
    "keywords": {
      "classNames": "array-fields",
      "ui:options": {
        "orderable": false,
      }
    }
  },
  formValidation: function(formData, errors) {
    if (formData.icon === "") {
      errors.icon.addError("is a required property");
    }
    return errors;
  }
};
