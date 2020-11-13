"use strict";

module.exports = {
  formSchema: {
    title: "Role",
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        title: "Name",
        description: "Provide a descriptive name to this role, such as \"developer\"."
      }
    }
  },
  uiSchema: {
    name: {
      "ui:autofocus": true,
    }
  }
};
