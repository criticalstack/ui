"use strict";

import React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import CardLayout from "../../shared/card-layout/card-layout";
import Card from "./card";
import KeyCard from "./key-card";
import { withRouter } from "react-router";
import h from "../helpers";
import createKeySchema from "./create-form";

const tabMap = {
  "stackapps": 0,
  "keys": 1
};

class StackAppContent extends React.Component {
  shouldComponentUpdate(nextProps) {
    if (this.props.route === nextProps.route) {
      return true;
    }

    return false;
  }

  handleTypeChange(index) {
    h.Vent.emit("stackapps:update:content", {
      type: Object.keys(tabMap)[index],
    });
  }

  render() {
    const props = this.props;
    const activeTab = tabMap[props.match.params.type] || 0;

    return (
      <div className="cs-tabs-parent">
        <Tabs
          className="cs-tabs"
          selectedIndex={activeTab}
          onSelect={tabIndex => this.handleTypeChange(tabIndex)}
        >
          <TabList>
            <Tab>
              <span className="tab-label">
                <i className="glyphicons glyphicons-layers tab-icon" />
                <span>Stack Apps</span>
              </span>
            </Tab>
            <Tab>
              <span className="tab-label">
                <i className="glyphicons glyphicons-key tab-icon" />
                <span>Keys</span>
              </span>
            </Tab>
          </TabList>

          <TabPanel>
            <CardLayout
              card={<Card />}
              gutter={false}
              layout={false}
              icon="glyphicons glyphicons-layers"
              data={props.data}
              metadata={props.metadata}
              history={props.history}
              route={props.route}
              disableKindFilter={true}
            />
          </TabPanel>

          <TabPanel>
            <CardLayout
            card={<KeyCard />}
            create={() => {
              h.Vent.emit("layout:form-dialog:open", {
                open: true,
                schema: createKeySchema.form,
                uiSchema: createKeySchema.uiSchema,
                title: "Create Key",
                icon: "glyphicons glyphicons-plus",
                dialogClass: "xsmall",
                onAction: function(form, callback) {
                  let body, endpoint;
                  if (Object.keys(form.uploadKey).length === 0) {
                    body = form.generateKey;
                    endpoint = "/stackapps/keys/create";
                  } else {
                    body = form.uploadKey;
                    endpoint = "/stackapps/keys/upload";
                  }

                  h.fetch({
                    method: "post",
                    endpoint,
                    resUrl: false,
                    body: JSON.stringify(body),
                    success: function() {
                      h.Vent.emit("notification", {
                        message: "Save Complete"
                      });

                      if (callback && typeof callback === "function") {
                        return callback();
                      }
                    },
                    error: function(a) {
                      h.Vent.emit("request-error:confirm-box", a);

                      h.Vent.emit("notification", {
                        message: "Error while saving..."
                      });
                    }
                  });
                }
              });
            }}
            gutter={false}
            layout={false}
            icon="glyphicons glyphicons-key"
            data={props.data}
            metadata={props.metadata}
            history={props.history}
            route={props.route}
            disableKindFilter={true}
          />
            </TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default withRouter(StackAppContent);
