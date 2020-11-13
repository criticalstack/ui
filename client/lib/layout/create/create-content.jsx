import React from "react";
import { withRouter } from "react-router";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import h from "../../helpers";
import SectionEditor from "../../../shared/section-editor";
import uploadSchema from "./upload-schema";
import SimpleForm from "../simple-form";
import Wizards from "./wizards";

class CreateContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      index: 0
    };
  }

  componentDidMount() {
    h.Vent.addListener("create-content:tab-click", (index) => {
      this.setState({
        index
      });
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("create-content:tab-click");
  }

  handleTabClick(index) {
    this.setState({
      index
    });
  }

  render() {
    const index = window.location.pathname.split("/").pop().replace("-", "");
    return (
      <div
        className="cs-tabs-parent"
        style={{
          border: 0,
          padding: "20px",
          height: "100%",
          marginBottom: "60px"
        }}
      >
        <Tabs
          className="cs-tabs"
          style={{
            height: "100%"
          }}
          selectedIndex={this.state.index}
          onSelect={(tab) => this.handleTabClick(tab)}
        >
          <TabList>
            <Tab>
              <span className="tab-label">
                <i className="glyphicons glyphicons-magic-wand tab-icon" />
                <span>Wizards</span>
              </span>
            </Tab>
            <Tab>
              <span className="tab-label">
                <i className="csicon csicon-settings-editor tab-icon" />
                <span>Editor</span>
              </span>
            </Tab>
            <Tab>
              <span className="tab-label">
                <i className="glyphicons glyphicons-square-empty-upload tab-icon" />
                <span>Upload</span>
              </span>
            </Tab>
          </TabList>

          <TabPanel>
             <Wizards />
          </TabPanel>

          <TabPanel>
            <SectionEditor
              index={index}
              data={[]}
              mode="create"
              noReturn={true}
            />
          </TabPanel>

          <TabPanel>
            <SimpleForm
              schema={uploadSchema.form}
              uiSchema={uploadSchema.ui}
              onAction={(form, callback) => {
                if (Object.keys(form).length === 0) {
                  h.Vent.emit("notification", {
                    message: "Error: you must select at least one file"
                  });
                  return;
                }

                h.fetch({
                  method: "post",
                  endpoint: h.ns("/upload"),
                  resUrl: false,
                  body: JSON.stringify(form),
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
              }}
            />
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default withRouter(CreateContent);
