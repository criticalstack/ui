"use strict";

import React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import EditNamespaces from "./edit-namespaces";
import { withRouter } from "react-router";

class NamespaceContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      index: 0
    };
  }

  handleTabClick(index) {
    this.setState({
      index: index
    });
  }

  render() {
    let activeTab = this.state.index;

    return (
      <div className="cs-tabs-parent">
        <Tabs
          className="cs-tabs"
          onSelect={(index) => this.handleTabClick(index)}
          selectedIndex={activeTab}
        >
          <TabList>
            <Tab>
              <span className="tab-label">
                <i className="glyphicons glyphicons-settings tab-icon" />
                <span>Manage</span>
              </span>
            </Tab>
          </TabList>

          <TabPanel>
            <EditNamespaces route="namespaces" namespaces={this.props.data} />
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default withRouter(NamespaceContent);
