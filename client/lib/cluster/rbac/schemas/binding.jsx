"use strict";

module.exports = {
  formSchema: {
    title: "Binding",
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description: "A role binding grants the permissions defined in a role to a user or set of users. Provide a descriptive name to this binding, such as \"pod-reader\"."
      }
    }
  },
  uiSchema: {
    autoFillName: {
      classNames: "input-checkbox"
    }
  }
};
