"use strict";

import React from "react";
import _ from "lodash";
import h from "../helpers";
import AceEditor from "react-ace";
import ReactMarkdown from "react-markdown";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import FileNameEditor from "./edit-file-name";
import MenuMaker from "../../shared/menu-maker";

class TabEditor extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      fontSize: CSOS.localStorage.formats.data().editorFontSize || 16,
      documents: props.documents,
      tabIndex: 0,
      markdownPreview: false
    };

    this.addNewFile = this.addNewFile.bind(this);
    this.updateFileName = this.updateFileName.bind(this);
  }

  componentDidMount() {
    let self = this;
    h.Vent.addListener("save:documents", function() {
      self.props.saveDocuments(self.state.documents);
    });
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("save:documents");
  }

  editFileName(isNewFile, key) {
    h.Vent.emit("layout:confirm:open", {
      open: true,
      title: "File Name",
      message: <FileNameEditor
        addNewFile={this.addNewFile}
        updateFileName={this.updateFileName}
        isNewFile={isNewFile}
        name={key}
      />,
      disableButtons: true,
      modal: true
    });
  }

  addNewFile(name) {
    let newIndex = Object.entries(this.state.documents).length;
    let documents = _.cloneDeep(this.state.documents);
    documents[name] = "";

    this.setState({
      documents,
      tabIndex: newIndex
    });
  }

  updateFileName(newName, name) {
    let documents = _.cloneDeep(this.state.documents);
    documents[newName] = documents[name];
    delete documents[name];
    this.setState({ documents });
  }

  removeFile(key) {
    let documents = _.cloneDeep(this.state.documents);
    let idx = this.state.tabIndex;

    delete documents[key];

    this.setState({
      documents,
      tabIndex: idx > 0 ? (idx - 1) : 0
    });
  }

  toggleMdPreview() {
    this.setState({
      markdownPreview: !this.state.markdownPreview
    });
  }

  onEditorChange(v, key) {
    let self = this;
    let b64file = window.btoa(v);
    let documents = _.cloneDeep(self.state.documents);
    documents[key] = b64file;
    this.setState({ documents });
  }

  render() {
    return (
      <div className="tab-editor">
        <Tabs
          selectedIndex={this.state.tabIndex}
          onSelect={tabIndex => this.setState({ tabIndex })}
        >
          <TabList className="editor-tablist">
            {
              Object.keys(this.state.documents).map(key => {

                let isREADME = false;

                if (key === "README.md") {
                  isREADME = true;
                }

                return (
                  <Tab key={key}>
                    {key}
                    <div className="file-menu">
                      {
                        !isREADME && (
                          <MenuMaker data={{
                            "entries": {
                              1: {
                                "icon": "glyphicons glyphicons-square-edit",
                                "name": "Rename",
                                ... (isREADME ? {
                                  "disabled": isREADME,
                                } : {}),
                                "link": () => this.editFileName(false, key)
                              },
                              2: {
                                "icon": "glyphicons glyphicons-bin menu-icon-warn",
                                "name": "Delete",
                                ... (isREADME ? {
                                  "disabled": isREADME,
                                } : {}),
                                "link": () => this.removeFile(key)
                              }
                            },
                            "args": {
                              "style": {
                                textAlign: "left",
                                fontSize: ".9em"
                              },
                              "icon": "csicon csicon-gear menu-icon-container",
                              "direction": "bottom-left"
                            }
                          }}
                        />
                        )
                      }
                  </div>
                </Tab>
                );
              })
            }
            <div
              onClick={() => this.editFileName(true)}
              className="add-file">
              <i className="glyphicons glyphicons-plus"></i>
              Add File
            </div>
          </TabList>

          <div className="panel-container">
            {
              Object.entries(this.state.documents).map(([key, value]) => {
                let panelBody;

                if ( this.state.markdownPreview ) {
                  panelBody = <ReactMarkdown
                    className="markdown-body"
                    source={window.atob(value)}
                  />;
                } else {
                  panelBody = <AceEditor
                    height="100%"
                    width="100%"
                    mode="markdown"
                    theme="twilight"
                    showGutter={true}
                    highlightActiveLine={true}
                    tabSize={2}
                    enableBasicAutocompletion={true}
                    enableLiveAutocompletion={true}
                    enableSnippets={false}
                    wrapEnabled={true}
                    fontSize={this.state.fontSize}
                    value={window.atob(value)}
                    onChange={(v) => this.onEditorChange(v, key)}
                    name="tab-editor"
                    editorProps={{ $blockScrolling: true }}
                  />;
                }

                return (
                  <TabPanel key={key} className="tab-panel">
                    <div className="section-editor-controls">
                      <i
                        className={`glyphicons glyphicons-${this.state.markdownPreview ? "pencil" : "eye"}`}
                        title={ this.state.markdownPreview ? "Edit" : "Preview"}
                        style={{ fontSize: "25px", padding: "3px"}}
                        onClick={() => this.toggleMdPreview()}
                      />
                    </div>
                    {panelBody}
                  </TabPanel>
                );
              })
            }
          </div>
        </Tabs>
      </div>
    );
  }
}

export default TabEditor;
