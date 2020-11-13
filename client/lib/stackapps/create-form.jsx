const createKeySchema = {
  form: {
    "description": "Complete one of the options below to create a key.",
    "type": "object",
    "properties": {
      "generateKey": {
        "title": "Option 1: Generate Key",
        "properties": {
          "name": {
            "title": "Key name",
            "type": "string"
          }
        }
      },
      "uploadKey": {
        "title": "Option 2: Upload Key",
        "properties": {
          "name": {
            "type": "string",
            "title": "Key name"
          },
          "data": {
            "type": "string",
            "title": "Upload PEM key",
            "format": "data-url"
          }
        }
      }
    }
  },
  uiSchema: {
    "generateKey": {
      "name": {
        classNames: "field-group legend",
        "ui:placeholder": "Key name"
      }
    },
    "uploadKey": {
      "name": {
        "ui:placeholder": "Key name"
      },
      "data": {
        "ui:options": {
          "accept": [".pem"]
        }
      }
    }
  }
};

export default createKeySchema;
