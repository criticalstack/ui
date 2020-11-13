"use strict";

import React from "react";

module.exports = {
  formSchema: {
    "description": "",
    "type": "object",
    "definitions": {
      "clientID": {
        "title": "Client ID",
        "type": "string"
      },
      "clientSecret": {
        "title": "Client Secret",
        "type": "string"
      },
      "redirectURI": {
        "title": "Redirect URI",
        "type": "string",
        "default": `${window.location.origin}/dex/callback`
      },
      "teamNameField": {
        "title": "Team Name Field",
        "default": "slug",
        "enum": [
          "slug",
          "name",
          "both"
        ]
      },
      "loadAllGroups": {
        "title": "Load All Groups",
        "type": "boolean"
      },
      "useLoginAsID": {
        "title": "Use Login as ID",
        "type": "boolean"
      },
      "orgs": {
        "title": "Organization(s)",
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "title": "Name",
              "type": "string"
            },
            "teams": {
              "title": "Teams",
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        }
      },
      "issuer": {
        "title": "Issuer",
        "type": "string"
      },
      "basicAuthUnsupported": {
        "title": "Basic Auth Unsupported?",
        "type": "boolean"
      },
      "hostedDomains": {
        "title": "Hosted Domains",
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "scopes": {
        "title": "Extra Scopes",
        "type": "array",
        "default": ["profile", "email"],
        "items": {
          "type": "string"
        }
      },
      "insecureSkipEmailVerified": {
        "title": "Skip Email Verification",
        "type": "boolean"
      },
      "insecureEnableGroups": {
        "title": "Enable Groups",
        "default": true,
        "type": "boolean"
      },
      "groupsKey": {
        "title": "Groups Key",
        "default": "groups",
        "type": "string"
      },
      "getUserInfo": {
        "title": "Get User Info",
        "default": true,
        "type": "boolean"
      },
      "userIDKey": {
        "title": "User ID Key",
        "default": "sub",
        "type": "string"
      },
      "userNameKey": {
        "title": "User Name Key",
        "default": "name",
        "type": "string"
      },
      "promptType": {
        "title": "Prompt Type",
        "default": "consent",
        "enum": [
          "consent",
          "login",
          "none"
        ]
      },
      "host": {
        "title": "Host",
        "type": "string"
      },
      "insecureNoSSL": {
        "title": "Disable SSL",
        "default": false,
        "type": "boolean"
      },
      "insecureSkipVerify": {
        "title": "Disable TLS Verification",
        "default": false,
        "type": "boolean"
      },
      "startTLS": {
        "title": "Use TLS",
        "default": true,
        "type": "boolean"
      },
      "rootCA": {
        "title": "Root CA File",
        "type": "string"
      },
      "rootCAData": {
        "title": "Root CA Data",
        "type": "string"
      },
      "bindDN": {
        "title": "Bind DN",
        "type": "string"
      },
      "bindPW": {
        "title": "Bind Password",
        "type": "string"
      },
      "usernamePrompt": {
        "title": "Username Prompt",
        "type": "string"
      },
      "claimMapping": {
        "title": "Claim Mapping",
        "description": "Non-standard Claim Mapping:",
        "type": "object",
        "properties": {
          "preferred_username": {
            "type": "string",
            "default": "preferred_username"
          },
          "email": {
            "type": "string",
            "default": "email"
          },
          "groups": {
            "type": "string",
            "default": "groups"
          }
        }
      }
      // # User search maps a username and password entered by a user to a LDAP entry.
      // userSearch:
      // # BaseDN to start the search from. It will translate to the query
      // # "(&(objectClass=person)(uid=<username>))".
      // baseDN: cn=users,dc=example,dc=com
      // # Optional filter to apply when searching the directory.
      // filter: "(objectClass=person)"

      // # username attribute used for comparing user entries. This will be translated
      // # and combined with the other filter as "(<attr>=<username>)".
      // username: uid
      // # The following three fields are direct mappings of attributes on the user entry.
      // # String representation of the user.
      // idAttr: uid
      // # Required. Attribute to map to Email.
      // emailAttr: mail
      // # Maps to display name of users. No default value.
      // nameAttr: name

      // # Group search queries for groups given a user entry.
      // groupSearch:
      // # BaseDN to start the search from. It will translate to the query
      // # "(&(objectClass=group)(member=<user uid>))".
      // baseDN: cn=groups,dc=freeipa,dc=example,dc=com
      // # Optional filter to apply when searching the directory.
      // filter: "(objectClass=group)"

      // # Following list contains field pairs that are used to match a user to a group. It adds an additional
      // # requirement to the filter that an attribute in the group must match the user's
      // # attribute value.
      // userMatchers:
      // - userAttr: uid
      // groupAttr: member

      // # Represents group name.
      // nameAttr: name
    },
    "dependencies": {
      "type": {
        "oneOf": [
          {
            "properties": {
              "type": { "enum": ["none"] }
            }
          },
          // GitHub specific fields
          {
            "properties": {
              "type": { "enum": ["github"] },
              "config": {
                "type": "object",
                "required": ["clientID", "clientSecret"],
                "properties": {
                  "clientID": { "$ref": "#/definitions/clientID" },
                  "clientSecret": { "$ref": "#/definitions/clientSecret" },
                  "orgs": { "$ref": "#/definitions/orgs" },
                  "redirectURI": { "$ref": "#/definitions/redirectURI" },
                  "teamNameField": { "$ref": "#/definitions/teamNameField" },
                  "loadAllGroups": { "$ref": "#/definitions/loadAllGroups" },
                  "useLoginAsID": { "$ref": "#/definitions/useLoginAsID" }
                }
              }
            }
          },
          // OIDC specific fields
          {
            "properties": {
              "type": { "enum": ["oidc"] },
              "config": {
                "type": "object",
                "required": ["issuer", "clientID", "clientSecret"],
                "properties": {
                  "issuer": { "$ref": "#/definitions/issuer" },
                  "clientID": { "$ref": "#/definitions/clientID" },
                  "clientSecret": { "$ref": "#/definitions/clientSecret" },
                  "redirectURI": { "$ref": "#/definitions/redirectURI" },
                  "basicAuthUnsupported": { "$ref": "#/definitions/basicAuthUnsupported" },
                  "hostedDomains": { "$ref": "#/definitions/hostedDomains" },
                  "scopes": { "$ref": "#/definitions/scopes" },
                  "userIDKey": { "$ref": "#/definitions/userIDKey" },
                  "userNameKey": { "$ref": "#/definitions/userNameKey" },
                  "insecureSkipEmailVerified": { "$ref": "#/definitions/insecureSkipEmailVerified" },
                  "insecureEnableGroups": { "$ref": "#/definitions/insecureEnableGroups" },
                  "groupsKey": { "$ref": "#/definitions/groupsKey" },
                  "getUserInfo": { "$ref": "#/definitions/getUserInfo" },
                  "promptType": { "$ref": "#/definitions/promptType" },
                  "claimMapping": { "$ref": "#/definitions/claimMapping" }
                }
              }
            }
          },
          // LDAP specific fields
          {
            "properties": {
              "type": { "enum": ["ldap"] },
              "config": {
                "type": "object",
                "required": ["host", "bindDN", "bindPW"],
                "properties": {
                  "host": { "$ref": "#/definitions/host" },
                  "bindDN": { "$ref": "#/definitions/bindDN" },
                  "bindPW": { "$ref": "#/definitions/bindPW" },
                  "rootCA": { "$ref": "#/definitions/rootCA" },
                  "rootCAData": { "$ref": "#/definitions/rootCAData" },
                  "usernamePrompt": { "$ref": "#/definitions/usernamePrompt" },
                  "startTLS": { "$ref": "#/definitions/startTLS" },
                  "insecureSkipVerify": { "$ref": "#/definitions/insecureSkipVerify" },
                  "insecureNoSSL": { "$ref": "#/definitions/insecureNoSSL" }
                }
              }
            }
          }
        ]
      }
    },
    "required": [
      "id",
      "name",
      "type"
    ],
    "properties": {
      "id": {
        "type": "string",
        "title": "ID"
      },
      "name": {
        "type": "string",
        "title": "Name"
      },
      "type": {
        "type": "string",
        "title": "Type",
        "enum": [
          "github",
          "oidc",
          "ldap"
        ],
        "enumNames": [
          "GitHub",
          "OIDC",
          "LDAP"
        ]
      }
    }
  },
  uiSchema: {
    "id": {
      "ui:placeholder": "my-connector",
      "ui:autofocus": true,
    },
    "name": {
      "ui:placeholder": "My Connector"
    },
    "type": {
      "ui:placeholder": "Select a type.."
    },
    "config": {
      "issuer": {
        "ui:widget": "uri"
      },
      "redirectURI": {
        "ui:widget": "uri"
      },
      "scopes": {
        "classNames": "array-fields",
        "ui:options": {
          "orderable": false,
        }
      },
      "hostedDomains": {
        "classNames": "array-fields",
        "ui:options": {
          "orderable": false,
        }
      },
      "orgs": {
        "classNames": "array-fields nested",
        "ui:options": {
          "orderable": false,
        },
        "items": {
          "teams": {
            "ui:options": {
              "orderable": false,
            },
          }
        }
      },
      "rootCA": {
        "ui:help": "Leave blank to use system CA certs."
      },
      "rootCAData": {
        "classNames": "textarea-label",
        "ui:widget": "textarea",
        "ui:help": "Base64 encoded PEM data."
      },
      "bindPW": {
        "ui:widget": "password"
      }
    }
  },
  formValidation: function(formData, errors) {
    return errors;
  }
};
