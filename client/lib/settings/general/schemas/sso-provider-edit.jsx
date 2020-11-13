"use strict";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "required": [
      "providerURL",
      "dexProxyEndpoint"
    ],
    "properties": {
      "providerURL": {
        "type": "string",
        "title": "Provider URL",
        "default": `${window.location.origin}/dex`
      },
      "dexProxyEndpoint": {
        "type": "string",
        "title": "Dex Proxy Endpoint URL",
      },
      "callbackURL": {
        "type": "string",
        "title": "Callback URL",
        "default": `${window.location.origin}/sso/callback`
      }
    }
  },
  uiSchema: {
    "providerURL": {
      "ui:placeholder": "eg. https://127.0.0.1:5556/dex",
      "ui:autofocus": true,
      "ui:widget": "uri"
    },
    "dexProxyEndpoint": {
      "ui:placeholder": "eg. http://dex:5556",
      "ui:widget": "uri"
    },
    "callbackURL": {
      "ui:widget": "hidden"
    }
  }
};
