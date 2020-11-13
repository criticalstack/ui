"use strict";

import React from "react";
import Form from "@rjsf/core";

class SimpleForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      formData: {},
      validate: function(data, e) {
        if (e.__errors.length > 0) {
          return false;
        }
        return true;
      },
      disabled: false
    };
  }

  handleSubmit(data) {
    this.setState({
      formData: data.formData
    });

    if (this.props.onAction && typeof this.props.onAction === "function") {
      this.props.onAction(this.state.formData, () => {
        this.setState({
          formData: {},
          disabled: true
        });
      });
    }
  }

  handleOnChange(data) {
    this.setState({
      formData: data.formData,
      disabled: false
    });
  }

  render() {
    return (
      <Form
        schema={this.props.schema}
        uiSchema={this.props.uiSchema}
        validate={this.state.validate}
        formData={this.state.formData}
        onChange={(data) => this.handleOnChange(data)}
        onSubmit={(data) => this.handleSubmit(data)}
        showErrorList={false}
      >
        <div className="dialog-actions-inline">
          <button
            type="submit"
            className="dialog-button btn-ok"
            disabled={this.state.disabled ? true : false}>
            <i
              className="glyphicons glyphicons-square-empty-upload dialog-button-icon btn-ok"
            />
            Upload
          </button>
        </div>
      </Form>
    );
  }
}

export default SimpleForm;
