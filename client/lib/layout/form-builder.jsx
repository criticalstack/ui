"use strict";

import React from "react";
import h from "../helpers";
import Form from "@rjsf/core";
import AceEditor from "react-ace";
import { withStyles } from "@material-ui/core/styles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import ErrorBoundary from "../../shared/error-boundary";
import template from "../../shared/manifests/template-schema";

const WhiteCheckbox = withStyles({
  root: {
    color: "#FFF",
    "&$checked": {
      color: "#FFF",
    },
  },
  checked: {},
})((props) => <Checkbox color="default" {...props} />);

class FormBuilder extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      fontSize: CSOS.localStorage.formats.data().editorFontSize || 16,
      schemaPreview: JSON.stringify(template, null, "\t"),
      excludeSchema: false
    };
  }

  componentDidMount() {
    let self = this;
    h.Vent.addListener("save:schema", function(callback) {
      let schema = window.btoa(self.state.schemaPreview);
      let exclude = self.state.excludeSchema;
      self.props.saveSchema(schema, exclude, callback);
    });

    if (this.props.schema !== "") {
      this.setState({
        schemaPreview: window.atob(this.props.schema)
      });
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("save:schema");
  }

  handleCheckbox = (e) => this.setState({excludeSchema: e.target.checked});

  onSchemaChange(v) {
    try {
      JSON.parse(v);
      this.setState({
        schemaPreview: v
      });
    } catch {}
  }

  render() {

    let schemaObj = JSON.parse(this.state.schemaPreview);
    let validate;
    let errorMsg = "";

    try {
      validate = new Function("return " + schemaObj.formValidation)();
    } catch (error) {
      errorMsg = error.name;
    }

    return (
      <div className="form-builder">
        <div className="schema-editor">
          <div className="exclude-schema">
            <FormControlLabel
              control={<WhiteCheckbox
                onChange={this.handleCheckbox}
                name="excludeSchema"
                disableRipple={true}
                disableFocusRipple={true}
              />}
              label="Exclude Schema"
            />
            <span
              className="info-icon"
              data-balloon="Removes this schema, however, default form will display if a chart schema already exists."
              data-balloon-pos="down"
              data-balloon-length="large">
              <i className="glyphicons glyphicons-circle-info"></i>
            </span>
          </div>
          <div className="ace-editor">
            <AceEditor
              height="100%"
              width="100%"
              mode="json"
              theme="twilight"
              showGutter={true}
              highlightActiveLine={true}
              tabSize={2}
              enableBasicAutocompletion={true}
              enableLiveAutocompletion={true}
              enableSnippets={false}
              wrapEnabled={true}
              fontSize={this.state.fontSize}
              value={this.state.schemaPreview}
              onChange={(v) => this.onSchemaChange(v)}
              name="form-builder"
              editorProps={{ $blockScrolling: true }}
            />
          </div>
        </div>

        <div className="schema-preview">
          <h1>Form Preview</h1>
          {
            errorMsg !== "" && (
              <div style={{color: "#b13e31", marginBottom: "15px"}}>Schema formValidation {errorMsg}</div>
            )
          }
          <div className="mp-app-form-body">
            <ErrorBoundary key={new Date().getTime()}>
              <Form
                schema={schemaObj}
                uiSchema={schemaObj.uiSchema}
                validate={validate}
                showErrorList={false}
              >
                <div className="mp-app-form-footer">
                  <button
                    className="dialog-button btn-create"
                    type="submit"
                  >
                    Check Validation
                  </button>
                </div>
              </Form>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    );
  }
}

export default FormBuilder;
