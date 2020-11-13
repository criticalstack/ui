"use strict";

import React from "react";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";

class EditMetricSettings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      includeMetrics: false
    };
  }

  componentDidMount() {
    this.checkStorageState();
  }

  checkStorageState() {
    if (window.localStorage.hasOwnProperty("csos-metrics")) {
      let currentState = CSOS.localStorage.metrics.data();

      let truthTest = 0;
      Object.keys(currentState).map(function(key) {
        if (currentState[key]) {
          truthTest++;
        }
      });

      this.setState({
        includeMetrics: truthTest > 0 ? true : false
      });
    }
  }

  toggleMetrics() {
    let newState = !this.state.includeMetrics;

    if (window.localStorage.hasOwnProperty("csos-metrics")) {
      let currentState = CSOS.localStorage.metrics.data();

      Object.keys(currentState).map(function(key) {
        currentState[key] = newState;
      });

      let updatedObject = currentState;

      CSOS.localStorage.metrics.update(updatedObject);
    }

    this.setState({
      includeMetrics: newState
    });
  }

  render() {
    return (
      <Card>
        <CardHeader
          title="You can manage system metrics settings here"
          subheader="What setting would you like to change?"
        />

        <CardContent>
          <div className="settings-control-header">
            Enable or Disable UI Metrics
          </div>
          <FormControlLabel
            control={
              <Switch
                checked={this.state.includeMetrics}
                onChange={() => this.toggleMetrics()}
              />
            }
            label="This setting enables or disables metrics globally throughout the UI"
          />
        </CardContent>
      </Card>
    );
  }
}

export default EditMetricSettings;
