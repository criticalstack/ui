const uploadSchema = {
  form: {
    "title": "Files",
    "type": "object",
    "properties": {
    "files": {
      "type": "array",
      "title": "Create resources by uploading valid Kubernetes manifests",
      "description": "You can upload a file containing a single resource, a file containing multiple resources, or even multiple files with multiple resources.",
      "items": {
        "type": "string",
        "format": "data-url"
      }
    },
    }
  },
  ui: {
    "files": {
      "ui:options": {
        "accept": [".json", ".yaml"]
      }
    }
  }
};

export default uploadSchema;

