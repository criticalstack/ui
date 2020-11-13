"use strict";

import React from "react";
import DialogMaker from "../../shared/dialog-maker";
import AceEditor, { diff as DiffEditor } from "react-ace";
import h from "../helpers";
import _ from "lodash";
import YAML from "js-yaml";

class FormDialogAdvanced extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      params: {},
      title: "",
      fontSize: 16,
      format: "yaml",
      data: "",
    };
  }

  componentDidMount() {
    let self = this;
    h.Vent.addListener("layout:form-dialog-advanced:open", function(params) {
      let hasFormatParam = params.hasOwnProperty("format");
      let diff = _.get(params, "diffModeEnabled", false);
      let data;
      let fontSize = CSOS.localStorage.formats.data().editorFontSize || 16;
      let format;

      if (hasFormatParam) {
        format = params.format;
      } else {
        format = CSOS.localStorage.formats.data().editorFormat || "yaml";
      }

      if (diff) {
        data = [self.convertToType(params.data[0], params.format), self.convertToType(params.data[1], params.format)];
      } else {
        data = self.convertToType(params.data, format);
      }

      self.setState({
        params,
        fontSize,
        format,
        open: true,
        data: data,
      });
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("layout:form-dialog-advanced:open");
  }

  convertToType(data, format) {
    if (format === "yaml") {
      return YAML.dump(data);
    } else {
      return JSON.stringify(data, null, "\t");
    }
  }

  onEditorChange(v) {
    try {
      JSON.parse(v);
      this.setState({
        data: v
      });
    } catch {}
  }

  handleClose() {
    this.setState({
      open: false,
      params: {},
      data: ""
    });
  }

  handleSubmit() {
    let self = this;
    let onAction = _.get(this.state.params, "onAction");
    if (onAction && typeof onAction === "function") {
      onAction(JSON.parse(this.state.data), function() {
        self.handleClose();
      });
    }
  }

  diffOnLoad = editor => {
    window.addEventListener("resize", () => {
    editor.resize();
   });
  };

  render() {
    let self = this;
    let params = this.state.params;
    let titleIcon = _.get(params, "icon", "");
    let titleLabel = _.get(params, "title", "");
    let dialogClass = _.get(params, "dialogClass", "");
    let bodyClass = _.get(params, "bodyClass", "");
    let diffModeEnabled = _.get(params, "diffModeEnabled", false);
    let readOnly = _.get(params, "readOnly", false);

    let title = (
      <span>
        <i className={`${titleIcon} form-dialog-title-icon`} />
        {titleLabel}
      </span>
    );

    let buttons = [
      {
        type: "close",
        action: () => this.handleClose()
      },
      ...(readOnly ? [] : [{
        type: "save",
        action: () => this.handleSubmit()
      }])
    ];

    let body = (
      diffModeEnabled ?
        <DiffEditor
        height="100%"
        width="100%"
        mode="yaml"
        theme="twilight"
        showGutter={true}
        highlightActiveLine={true}
        tabSize={2}
        enableBasicAutocompletion={true}
        enableLiveAutocompletion={true}
        enableSnippets={false}
        wrapEnabled={true}
        fontSize={this.state.fontSize}
        value={this.state.data}
        readOnly={readOnly}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
        onLoad={this.diffOnLoad}
        /> :
        <AceEditor
          height="100%"
          width="100%"
          mode={this.state.format}
          theme="twilight"
          showGutter={true}
          highlightActiveLine={true}
          tabSize={2}
          enableBasicAutocompletion={true}
          enableLiveAutocompletion={true}
          enableSnippets={false}
          wrapEnabled={true}
          fontSize={this.state.fontSize}
          value={this.state.data}
          onChange={(v) => this.onEditorChange(v)}
          name="UNIQUE_ID_OF_DIV"
          editorProps={{ $blockScrolling: true }}
        />
    );

    return (
      <DialogMaker
        open={this.state.open}
        onRequestClose={(e) => self.handleClose(e)}
        title={title}
        body={body}
        buttons={buttons}
        dialogClass={dialogClass}
        bodyClass={bodyClass}
      />
    );
  }

}

export default FormDialogAdvanced;
