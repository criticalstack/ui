"use strict";

import React from "react";
import _ from "lodash";
import DialogMaker from "../../shared/dialog-maker";
import Stepper from "@material-ui/core/Stepper";
import StepLabel from "@material-ui/core/StepLabel";
import Step from "@material-ui/core/Step";

class StepperDialog extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      bodyType: "",
      activeStep: 0
    };
  }

  prevStep() {
    this.setState({
      activeStep: this.state.activeStep - 1
    });
  }

  nextStep() {
    this.setState({
      activeStep: this.state.activeStep + 1
    });
  }

  actionStep(type) {
    let self = this;
    let step = this.props.steps[this.state.activeStep];
    if (step.hasOwnProperty("action")) {
      step.action(function() {
        if (type === "next") {
          self.nextStep();
        } else {
          self.props.closeDialog();
        }
      });
    } else {
      this.nextStep();
    }
  }

  render() {
    var self = this;

    let steps = this.props.steps;
    let activeStep = this.state.activeStep;
    let stepObj = steps[activeStep];

    let titleWrap = <div>
      <span>{this.props.title}</span>
      <div className="title-stepper">
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map( step => {
            return (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </div>
    </div>;

    let bodyType = stepObj.bodyType;

    let dialogClass = "stepLarge";
    if (bodyType === "select" || bodyType === "form") {
      dialogClass = "stepSmall";
    } else if (bodyType === "table") {
      dialogClass = "medium";
    }

    let bodyClass = "dialog-form";
    if (bodyType === "editor") {
      bodyClass = "dialog-editor";
    } else if (bodyType === "table") {
      bodyClass = "dialog-table";
    }

    let buttons = [
      {
        type: "exit",
        action: () => this.props.closeDialog()
      },
      ... activeStep !== 0 ? [
        {
          type: "back",
          action: () => this.prevStep()
        }
      ] : [],
      ... activeStep !== steps.length - 1 ? [
        {
          type: "next",
          action: () => this.actionStep("next"),
          disabled: _.get(stepObj, "nextDisabled", false)
        }
      ] : [],
      ... activeStep === steps.length - 1 ? [
        {
          type: "submit",
          action: () => this.actionStep("submit")
        }
      ] : [],
    ];

    return (
      <DialogMaker
        open={self.props.open}
        onRequestClose={() => this.props.closeDialog()}
        title={titleWrap}
        body={steps[activeStep].body}
        buttons={buttons}
        dialogClass={dialogClass}
        bodyClass={bodyClass}
        disableEscapeKeyDown={true}
        disableBackdropClick={true}
      />
    );
  }
}

export default StepperDialog;
