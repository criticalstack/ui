"use strict";

module.exports = {
  formSchema: {
    namespace: {
      "description": "",
      "type": "object",
      "properties": {
        "metadata": {
          "type": "object",
          "required": [
            "name"
          ],
          "properties": {
            "name": {
              "title": "Namespace Name",
              "type": "string"
            }
          }
        }
      }
    }
  },
  uiSchema: {
    namespace: {
      "metadata": {
        "name": {
          "ui:placeholder": "Name"
        }
      }
    }
  }
};
