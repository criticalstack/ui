"use strict";

import React from "react";
import h from "../helpers";
import SectionEditor from "../../shared/section-editor";

class FullscreenEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      config: {},
      data: [],
      index: 0,
      editMode: false
    };
  }

  componentDidMount() {
    let self = this;
    h.Vent.addListener("fullscreen-editor", function(params) {
      self.setState({
        config: params.config || {},
        data: params.data || [],
        index: params.index || 0,
        editMode: params.editMode
      });

      if (!params.editMode) {
        h.Vent.emit("update:app");
      }
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("fullscreen-editor");
  }

  render() {
    return (
      this.state.editMode !== false && (
        <div className="fullscreen-editor">
          <SectionEditor
            resource={this.state.config.endpoint}
            data={this.state.data}
            icon={this.state.icon}
            index={this.state.index}
            nameIdentifier={this.state.config.nameIdentifier}
            location={this.state.config.location}
            title={this.state.config.title}
            mode={this.state.editMode}
            resourceAccess={this.state.config.resource}
          />
        </div>
      )
    );
  }

}

export default FullscreenEditor;
