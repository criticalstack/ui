"use strict";

import React from "react";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import h from "../helpers";

class FileNameEditor extends React.Component {

  constructor(props) {
    super(props);

    let self = this;

    self.state = {
      fileName: props.name || ""
    };

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(e) {
    this.setState({
      fileName: e.target.value
    });
  }

  handleSubmit(e) {
    e.preventDefault();

    let self = this;

    if (this.props.isNewFile) {
      this.props.addNewFile(self.state.fileName);
    } else {
      this.props.updateFileName(self.state.fileName, this.props.name);
    }

    h.Vent.emit("layout:confirm:close");
  }

  render() {
    let self = this;

    let buttons = (
      [
        <Button
          key={1}
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className="dialog-button btn-close"
          onClick={function() {
            h.Vent.emit("layout:confirm:close");
          }}>
          <i
            className="glyphicons glyphicons-menu-close dialog-button-icon btn-close"
          />
          Cancel
        </Button>,
        <Button
          type="submit"
          key={2}
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className="dialog-button btn-save"
        >
          <i
            className="glyphicons glyphicons-check dialog-button-icon btn-save"
          />
          Save
        </Button>
      ]
    );

    return (
      <form onSubmit={e => self.handleSubmit(e)}>
        <TextField
          required
          autoFocus
          placeholder="UPGRADE.md"
          value={this.state.fileName}
          onChange={e => self.handleChange(e)}
        />
        <div style={{
          textAlign: "right",
          paddingTop: "20px",
          marginBottom: "-14px",
          marginRight: "-14px"
        }}>
          {buttons}
        </div>
      </form>
    );
  }
}

export default FileNameEditor;
