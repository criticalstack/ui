"use strict";

import React from "react";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Input from "@material-ui/core/Input";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { withStyles } from "@material-ui/core/styles";


const styles = {
  input: {
    color: "#545454"
  }
};

class EditFormats extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      editorFormat: CSOS.localStorage.formats.data().editorFormat || "yaml",
      editorMode: CSOS.localStorage.formats.data().editorMode || "vim",
      editorFontSize: CSOS.localStorage.formats.data().editorFontSize || 16,
    };
  }

  toggleEditorOption(e) {
    let feature = e.currentTarget.name;
    let value = e.target.value;

    if (window.localStorage.hasOwnProperty("csos-formats")) {
      CSOS.localStorage.formats.update({
        [feature]: value
      });
    }

    this.setState({
      [feature]: value
    });
  }

  handleSlider(e) {
    let feature = e.currentTarget.name;
    let value = Number(e.target.value);

    if (window.localStorage.hasOwnProperty("csos-formats")) {
      CSOS.localStorage.formats.update({
        [feature]: value
      });
    }

    this.setState({
      [feature]: value
    });
  }

  handleSliderInput(e) {
    let feature = e.currentTarget.name;
    let value = e.target.value === "" ? "" : Number(e.target.value);

    if (window.localStorage.hasOwnProperty("csos-formats")) {
      CSOS.localStorage.formats.update({
        [feature]: value
      });
    }

    this.setState({
      [feature]: value
    });
  }

  render() {
    let sliderValue = this.state.editorFontSize;
    let min = 10;
    let max = 30;
    let step = 1;

    return (
      <Card>
        <CardHeader
          title="You can manage the Section Editors behavior here"
          subheader="What setting would you like to change?"
        />

        <CardContent>
          <div style={{"marginTop": "20px"}} className="settings-control-header">
            Font size:
            <span className="slider-input-display">
              <span className="display-value" style={{color: "#545454"}}>{sliderValue}</span>
              <Input
                name="editorFontSize"
                className="slider-input"
                value={sliderValue}
                margin="dense"
                onChange={(e) => this.handleSliderInput(e)}
                inputProps={{
                  className: this.props.classes.input,
                  step: step,
                  min: min,
                  max: max,
                  type: "number",
                  "aria-labelledby": "input-slider",
                }}
              />
            </span>
          </div>

          <div className="create-form-slider">
            <div
              style={{
                paddingBottom: "20px"
              }}
              className="slider"
            >
              <input
                name="editorFontSize"
                style={{
                  width: "100px"
                }}
                type="range"
                min={min}
                max={max}
                step={step}
                value={sliderValue}
                onChange={(e) => this.handleSlider(e)}
              />
            </div>
          </div>

         <div className="settings-control-header">
           Editor format
         </div>

         <RadioGroup
           onChange={(e) => this.toggleEditorOption(e)}
           name="editorFormat"
           value={this.state.editorFormat}
         >
           <FormControlLabel
             control={
               <Radio />
             }
             value="json"
             label="JSON"
             color="testing"
           />
           <FormControlLabel
             control={
               <Radio />
             }
             value="yaml"
             label="YAML"
           />
          </RadioGroup>

          <div style={{"marginTop": "20px"}} className="settings-control-header">
            Editor mode
          </div>

          <RadioGroup
            onChange={(e) => this.toggleEditorOption(e)}
            name="editorMode"
            value={this.state.editorMode}
          >
            <FormControlLabel
              control={
                <Radio />
              }
              value="emacs"
              label="Emacs"

            />
            <FormControlLabel
              control={
                <Radio />
              }
              value="vim"
              label="Vim"
            />
          </RadioGroup>

        </CardContent>
      </Card>
    );
  }
}

export default withStyles(styles)(EditFormats);
