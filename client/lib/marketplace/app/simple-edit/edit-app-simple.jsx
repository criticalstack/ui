"use strict";

import React from "react";
import _ from "lodash";
import h from "../../../helpers";
import StepperDialog from "../../../layout/stepper-dialog";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Form from "@rjsf/core";
import { formSchema, uiSchema, formValidation } from "./schema";
import TabEditor from "../../../layout/tab-editor";
import FormBuilder from "../../../layout/form-builder";

class EditAppSimple extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      data: props.data,
      dataEdit: props.dataEdit,
      version: props.version,
      versionIdx: _.findIndex(props.dataEdit.versions, function(o) {
        return o.version === props.version;
      }),
      formData: {},
      hasErrors: false,
      documents: {},
      schema: "",
      excludeSchema: false
    };

    this.saveDocuments = this.saveDocuments.bind(this);
    this.saveSchema = this.saveSchema.bind(this);
  }

  componentDidMount() {
    let versionObj = this.state.dataEdit.versions[this.state.versionIdx];
    let documents = this.setDefault(versionObj, "documents", this.state.data.chart.files);

    let hasChartSchema = _.get(this.state.data.chart, "schema", false);
    let schema = "";
    if (hasChartSchema) {
      schema = this.setDefault(versionObj, "schema", this.state.data.chart.schema);
    }

    let formData = {};
    formData = versionObj;

    this.setState({
      documents,
      schema,
      formData
    });
  }

  setDefault(versionObj, type, chartData) {
    let defaultData = _.get(versionObj, type);

    if (typeof defaultData === "undefined") {
      if (type === "documents") {
        defaultData = {};
        chartData.forEach(file => {
          let name = file.name;
          if (name.match(/\.md$/i)) {
            defaultData[name] = file.data;
          }
        });
      } else if (type === "schema") {
        defaultData = chartData;
      }
    }

    return defaultData;
  }

  handleSelect(e) {
    let self = this;
    let version = e.target.value;
    let idx = _.findIndex(this.state.dataEdit.versions, function(o) {
      return o.version === e.target.value;
    });
    let dataEdit = _.cloneDeep(this.props.dataEdit);

    h.fetch({
      endpoint: `/marketplace/apps/${this.props.name}`,
      resUrl: false,
      query: {
        version
      },
      success: function(data) {
        h.log.info("Result:", data);

        let result = data.context.result;

        let versionObj = dataEdit.versions[idx];

        let documents = self.setDefault(versionObj, "documents", result.chart.files);

        let hasChartSchema = _.get(result.chart, "schema", false);
        let schema = "";
        if (hasChartSchema) {
          schema = self.setDefault(versionObj, "schema", result.chart.schema);
        }

        let formData = {};
        formData = versionObj;

        self.setState({
          data: result || {},
          version: version,
          versionIdx: idx,
          dataEdit,
          documents,
          schema,
          formData
        });
      }
    });
  }

  handleChange(data) {
    this.setState({
      formData: data.formData,
      hasErrors: data.errors.length > 0
    });
  }

  saveDocuments(documents) {
    this.setState({documents});
  }

  handleDocuments(callback) {
    h.Vent.emit("save:documents");

    if (callback && typeof callback === "function") {
      return callback();
    }
  }

  saveSchema(schema, excludeSchema, callback) {
    this.setState({schema, excludeSchema}, this.submitApp(schema, excludeSchema, callback));
  }

  handleSubmit(callback) {
    h.Vent.emit("save:schema", callback);
  }

  submitApp(schema, excludeSchema, callback) {
    let self = this;

    let dataEdit = _.cloneDeep(this.state.dataEdit);
    let idx = this.state.versionIdx;
    let versionObj = dataEdit.versions[this.state.idx];
    versionObj = _.defaultsDeep(this.state.formData, versionObj);
    delete versionObj.name;
    versionObj.documents = this.state.documents;
    if (excludeSchema) {
      if (versionObj.hasOwnProperty("schema")) {
        delete versionObj.schema;
      }
    } else {
      versionObj.schema = schema;
    }
    dataEdit.versions.splice(idx, 1, versionObj);

    h.fetch({
      method: "post",
      endpoint: `/applications/${self.props.name}`,
      body: JSON.stringify(dataEdit),
      success: function(u) {
        let result = u.context.result;
        h.Vent.emit("update:app");

        h.Vent.emit("notification", {
          message: `${result.appName} successfully updated`
        });

        if (callback && typeof callback === "function") {
          return callback();
        }
      },
      error: function(error) {
        console.log("error");
        h.Vent.emit("request-error:confirm-box", error);
      }
    });

  }

  render() {

    let select = <div className="dialog-body-small">
      <FormControl
        style={{minWidth: 120, margin: "0 auto"}}
      >
        <InputLabel>Version</InputLabel>
        <Select
          value={this.state.version}
          onChange={(e) => this.handleSelect(e)}
        >
          {
            this.state.data.versions.map( version => (
              <MenuItem
                disableRipple={true}
                value={version}
                key={version}
              >
                {version}
              </MenuItem>
            ))
          }
        </Select>
      </FormControl>
    </div>;

    let x = formSchema.properties;
    x.name.default = this.state.dataEdit.appName;

    let form = <div className="dialog-body-small">
      <Form
        schema={formSchema}
        uiSchema={uiSchema}
        validate={formValidation}
        liveValidate
        formData={this.state.formData}
        onChange={(data) => this.handleChange(data)}
      >
      </Form>
    </div>;

    let steps = [
      {
        label: "Select Version",
        bodyType: "select",
        body: select
      },
      {
        label: "Edit Details",
        bodyType: "form",
        nextDisabled: this.state.hasErrors,
        body: form
      },
      {
        label: "Edit Documents",
        bodyType: "editor",
        body: <TabEditor
          documents={this.state.documents}
          saveDocuments={this.saveDocuments}
        />,
        action: this.handleDocuments
      },
      {
        label: "Edit Configuration Form",
        bodyType: "editor",
        body: <FormBuilder
          schema={this.state.schema}
          saveSchema={this.saveSchema}
        />,
        action: this.handleSubmit
      }
    ];

    return (
      <StepperDialog
        open={this.props.open}
        closeDialog={this.props.closeDialog}
        title={`Edit ${this.props.name} - ${this.state.version}`}
        steps={steps}
      />
    );
  }
}

export default EditAppSimple;
