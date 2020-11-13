"use strict";

import React from "react";
import { withRouter } from "react-router";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import CircularProgress from "@material-ui/core/CircularProgress";
import _ from "lodash";
import h from "../../helpers";
import MenuMaker from "../../../shared/menu-maker";
import LabelMaker from "../../../shared/label-maker";
import ReactMarkdown from "react-markdown";
import AppIcon from "./app-icon";
import Tooltip from "react-tooltip";
import Form from "@rjsf/core";
import AceEditor from "react-ace";
import LoaderMaker from "../../../shared/loader-maker";
import Installations from "./installations/installations";
import EditAppSimple from "./simple-edit/edit-app-simple";
import {
  formSchema as formSchemaCat,
  uiSchema as uiSchemaCat
} from "./category-schema";
import DryRunTable from "./dryrun-table";
import TableTitle from "./installations/table-title";
import { RBACContext } from "../../../shared/context/rbac";

class AppDetail extends React.Component {
  constructor(props) {
    super(props);

    let app = _.get(props, "match.params.app", false);

    this.state = {
      selected: "0",
      appID: app,
      appMarkdown: {},
      data: {},
      open: false,
      versionToInstall: "",
      appHasConfig: false,
      isConfigured: false,
      configFormSchema: false,
      configUiSchema: false,
      configFormValidation: false,
      configData: {},
      loading: true,
      installLoading: false,
      editMode: false,
      simpleEdit: false,
      dataEdit: {},
      enableDryRun: JSON.parse(localStorage.getItem("enableDryRun"))
    };
    window.scroll(0, 0);
    this.closeSimpleEdit = this.closeSimpleEdit.bind(this);
  }

  closeSimpleEdit() {
    this.setState({
      simpleEdit: false
    });
  }

  useQuery() {
    return new URLSearchParams(this.props.location.search);
  }

  fetchDataEdit(type, callback) {
    let self = this;
    h.fetch({
      endpoint: `/applications/${self.state.appID}`,
      success: function(data) {
        h.log.info("Result:", data);

        let result = data.context.result;

        self.setState({
          dataEdit: result,
          ...(type === "simple" ? {simpleEdit: true} : {}),
        }, callback);
      }
    });
  }

  editCategories() {
    let self = this;
    let dataEdit = _.cloneDeep(self.state.dataEdit);
    let labels = dataEdit.metadata.labels;
    let categories = [];
    let str = "marketplace.criticalstack.com/application.category.";

    Object.keys(labels).forEach(key => {
      let category = "";
      if (key.includes(str)) {
        category = key.replace(str, "");
        categories.push(category);
      }
    });

    formSchemaCat.properties.categories.default = categories;

    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchemaCat,
      uiSchema: uiSchemaCat,
      title: "Edit Categories",
      icon: "glyphicons glyphicons-list",
      dialogClass: "stepSmall",
      onAction: function(form, callback) {

        Object.keys(labels).forEach(key => {
          if (key.includes(str)) {
            delete labels[key];
          }
        });

        form.categories.forEach(category => {
          let label = str + category;
          labels[label] = "";
        });

        dataEdit.metadata.labels = labels;

        h.fetch({
          method: "post",
          contentType: "application/x-www-form-urlencoded",
          endpoint: `/applications/${self.state.appID}`,
          body: JSON.stringify(dataEdit),
          success: function(u) {
            h.Vent.emit("notification", {
              message: `Categories of ${u.context.result.appName} successfully updated`
            });

            h.Vent.emit("layout:form-dialog:close");

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          },
          error: function() {
            h.Vent.emit("notification", {
              message: "Failed to update"
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          }
        });
      }
    });
  }

  fetchApp() {
    var self = this;
    let url = `/marketplace/apps/${this.props.match.params.app}`;
    let query = this.useQuery();
    let version = query.get("version") || false;
    let queryString = "";
    if (version) {
      queryString = `?version=${version}`;
      url = `/marketplace/apps/${this.props.match.params.app}${queryString}`;
    }

    h.fetch({
      endpoint: url,
      resUrl: false,
      success: function(data) {
        h.log.info("Result:", data);

        let result = data.context.result;

        self.setState({
          loading: false,
          data: result || {},
          versionToInstall: version ? version : result.app.version,
          configData: result.chart.values
        });

        let seed = result.chart.metadata.name;
        let bannerColors = _.get(result.app, "BannerColors", []);
        let xColors = bannerColors;
        let yColors = bannerColors;

        h.Vent.emit("marketplace:banner", {
          seed: seed,
          xColors: xColors,
          yColors: yColors
        });

        self.buildContent();
      },
      error: function(a) {
        self.props.history.push("/marketplace/feature/home");
        h.Vent.emit("request-error:confirm-box", a);
      }
    });
  }

  componentDidMount() {
    let self = this;
    this.fetchApp();

    h.Vent.addListener("edit:mode", function(id, mode) {
      if (id === false) {
        mode = false;
      }
      self.setState({
        editMode: mode,
      });
    });

    h.Vent.addListener("update:app", function() {
      self.fetchApp();
    });

    if (localStorage.getItem("enableDryRun") === null) {
      localStorage.setItem("enableDryRun", true);
      this.setState({
        enableDryRun: true
      });
    }
  }

  componentDidUpdate(prevProps) {
    let query = this.useQuery();
    let version = query.get("version");
    let prevQuery = new URLSearchParams(prevProps.location.search);
    let prevVersion = prevQuery.get("version");
    if (version !== prevVersion) {
      this.fetchApp();
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("edit:mode");
    h.Vent.removeAllListeners("update:app");
  }

  getBooleanKeys(obj) {
    let keys = [];
    for (const key in obj) {
      if (obj[key] === "boolean") {
        keys.push(key);
      } else if (typeof obj[key] === "object") {
        let subkeys = this.getBooleanKeys(obj[key]);
        keys = keys.concat(subkeys.map(function(subkey) {
          return key + "." + subkey;
        }));
      }
    }
    return keys;
  }

  buildContent() {
    let self = this;
    let chart = this.state.data.chart || {};
    let app = this.state.data.app || {};
    let markdown = {};

    if (app.documents && !_.isEmpty(app.documents)) {
      Object.entries(app.documents).forEach(([key, value]) => {
        let data = atob(value);
        let entry = {
          title: key,
          content: data
        };

        markdown[key] = entry;
      });

    } else if (!_.isEmpty(chart)) {
      for (let d = 0; d < chart.files.length; d++) {
        let title = chart.files[d].name;
        if (!title.match(/\.md$/i)) {
          continue;
        }
        let data = atob(chart.files[d].data);
        let entry = {
          title: title,
          content: data
        };

        markdown[d] = entry;
      }
    }

    let keys = Object.keys(markdown);

    let appHasConfig = false;
    let formSchema = false;
    let uiSchema = false;
    let formValidation = false;

    let schema = "";
    if (app.schema) {
      schema = app.schema;
    } else if (chart.schema) {
      schema = chart.schema;
    }

    if (schema !== "") {
      appHasConfig = true;
      let configForm;
      try {
        configForm = JSON.parse(atob(schema));

        // Add default value to boolean fields
        let booleanKeys = self.getBooleanKeys(configForm);
        let paths = [];
        booleanKeys.forEach(key => {
          let path = key.replace("type", "default");
          paths.push(path);
        });

        paths.forEach(path => {
          _.set(configForm, path, false);
        });

      } catch (e) {
        console.log(e);
        configForm = {};
      }

      formSchema = configForm;
      uiSchema = configForm.hasOwnProperty("uiSchema") ? configForm.uiSchema : false;

      function defaultValidation() {
        return false;
      };

      formValidation = configForm.hasOwnProperty("formValidation")
        ? configForm.formValidation
        : defaultValidation;

      try {
        formValidation = new Function("return " + formValidation)();
      } catch (e) {
        formValidation = defaultValidation;
      }
    }

    let query = this.useQuery();
    let tab = query.get("tab") || keys[0];
    let selected;

    if ((tab === "configuration" && !appHasConfig) ||
      (((tab !== "configuration") && (tab !== "installations")) && !markdown.hasOwnProperty(tab))) {
      selected = keys[0];
      query.set("tab", keys[0]);
      this.props.history.push({
        search: query.toString()
      });
    } else {
      selected = tab;
    }

    self.setState({
      appMarkdown: markdown,
      loading: false,
      selected: selected,
      appHasConfig,
      configFormSchema: formSchema,
      configUiSchema: uiSchema,
      configFormValidation: formValidation
    });
  }

  toggleEnableDryRun() {
    let enableDryRun = this.state.enableDryRun;
    localStorage.setItem("enableDryRun", !enableDryRun);
    this.setState({
      enableDryRun: !enableDryRun
    });
  }

  deploy(app) {
    let self = this;

    h.fetch({
      endpoint: h.ns("/marketplace/deploy"),
      resUrl: false,
      method: "post",
      contentType: "application/json",
      processData: false,
      body: JSON.stringify({data: app}),
      success: function(data) {
        h.Vent.emit("layout:confirm:open", {
          open: true,
          dialogClass: "stepSmall",
          title: `Successfully installed ${app.chart.metadata.name} version ${self.state.versionToInstall}`,
          message:
          <div className="markdown-body">
            <pre>
              <code>
                {data.context.result.info.notes}
              </code>
            </pre>
          </div>
        });
      },
      error: function(error) {
        h.Vent.emit("request-error:confirm-box", error);
      }
    });
  }

  installApp(app) {
    let self = this;
    app.chart.values = _.defaultsDeep(self.state.configData, app.chart.values);

    if (self.state.enableDryRun) {

      self.setState({
        installLoading: true
      });

      h.fetch({
        endpoint: h.ns("/resourcequotas"),
        success: function(x) {
          h.log.info("Resource Quotas:", x);
          let quotas = x.context.result || [];
          let quota = {};
          let used = {};

          quotas.forEach(q => {
            Object.entries(q.status.hard).forEach(([key, value]) => {
              let v1 = Number(value);
              if (!isNaN(v1)) {
                if (!quota.hasOwnProperty(key)) {
                  quota[key] = v1;
                } else {
                  let v2 = quota[key];

                  if (v2 > v1) {
                    quota[key] = v1;
                  }
                }
              }
            });

            Object.entries(q.status.used).forEach(([key, value]) => {
              let v1 = Number(value);
              if (!isNaN(v1)) {
                used[key] = v1;
              }
            });
          });

          h.fetch({
            endpoint: h.ns("/marketplace/deploy?dryRun=true"),
            resUrl: false,
            method: "post",
            processData: false,
            body: JSON.stringify({data: app}),
            success: function(data) {

              self.setState({
                installLoading: false
              });

              let resRaw = data.context.resources;

              let resources = _.chain(resRaw)
                .groupBy("kind")
                .map((value, key) => ({ kind: key, resources: value }))
                .value();

              h.Vent.emit("layout:confirm:open", {
                open: true,
                dialogClass: "medium",
                title: `Preview Resources: ${app.chart.metadata.name} version ${self.state.versionToInstall}`,
                message:
                <div className="dialog-body content">
                  <TableTitle
                    title="Resources"
                    icon="glyphicons glyphicons-palette-package"
                    count={resRaw.length}
                  />
                  <DryRunTable quota={quota} used={used} data={resources}/>
                </div>,
                primaryAction: "install",
                onAction: function() {
                  self.deploy(app);
                  h.Vent.emit("layout:confirm:close");
                }
              });
            },
            error: function(error) {
              h.Vent.emit("request-error:confirm-box", error);

              self.setState({
                installLoading: false
              });
            }
          });
        }
      });
    } else {
      h.Vent.emit("layout:confirm:open", {
        open: true,
        title: `Confirm Request: Install ${app.chart.metadata.name}?`,
        message: `Are you sure you want to install ${app.chart.metadata.name} version ${self.state.versionToInstall}?`,
        primaryAction: "ok",
        onAction: function() {
          self.deploy(app);
          h.Vent.emit("layout:confirm:close");
        }
      });
    }
  }

  configureApp() {
    this.handleTabClick("configuration");
  }

  configOnChange(data) {
    this.setState({
      configData: data.formData,
      isConfigured: false
    });
  }

  configOnSubmit(data) {
    this.setState({
      configData: data.formData
    });

    if (data.errors.length === 0) {
      this.setState({
        isConfigured: true
      });
      window.scroll(0, 0);
    }
  }

  makeConfiguration(configArgs) {
    let name = configArgs.name;
    let version = configArgs.version;
    let buttonStyle = this.state.isConfigured ? " btn-disable" : " btn-create";
    let configData = this.state.configData;
    let disableForm = false;

    let button = (
      <div className="mp-app-form-footer">
        <button
          className={`dialog-button${buttonStyle}`}
          type="submit"
        >
          Save Configuration
        </button>
      </div>
    );

    if (typeof configData["values.yaml"] !== "undefined") {
      return (
        <div
          style={{
            marginTop: "30px",
            marginRight: "30vw"
          }}
          className="section-editor-body">
          <AceEditor
            ref={node => {
              this.ace = node;
            }}
            height="80%"
            width="100%"
            mode="yaml"
            showGutter={true}
            highlightActiveLine={true}
            tabSize={2}
            enableBasicAutocompletion={true}
            enableLiveAutocompletion={true}
            enableSnippets={false}
            wrapEnabled={false}
            fontSize={16}
            theme="twilight"
            onChange={(data) => this.configOnChange({formData: {"values.yaml": data}})}
            name="section-content-editor"
            value={configData["values.yaml"]}
            setOptions={{
              behavioursEnabled: true,
              enableBasicAutocompletion: true,
              tabSize: 2,
              useSoftTabs: true,
              showInvisibles: false
            }}
            editorProps={{
              $useWorker: false,
              $blockScrolling: "Infinity"
            }}
          />
          <div className="mp-app-form-footer">
            <button
              onClick={() => this.configOnSubmit({formData: this.state.configData, errors: []})}
              className={`dialog-button${buttonStyle}`}
              type="submit"
            >
              Save Configuration
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="markdown-body">
        <h1>
          Configuration for {name} version {version}
        </h1>

        <div className="mp-app-form-body">
          <Form
            disabled={disableForm}
            schema={this.state.configFormSchema}
            uiSchema={this.state.configUiSchema}
            formData={configData}
            validate={this.state.configFormValidation}
            onChange={(data) => this.configOnChange(data)}
            onSubmit={(data) => this.configOnSubmit(data)}
            showErrorList={false}
          >
            {button}
          </Form>
        </div>
      </div>
    );
  };

  removeApp(app, deploymentId) {
    let self = this;
    let chart = app.chart;

    if (!deploymentId) {
      h.Vent.emit("layout:confirm:open", {
        title: "Error",
        message: "No deployment ID found."
      });

      return false;
    }

    let url = h.ns(`/marketplace/deployments/${deploymentId}`);

    h.Vent.emit("layout:confirm:open", {
      open: true,
      title: `Confirm Request: Delete ${chart.metadata.name}?`,
      message: `Are you sure you want to delete ${chart.metadata.name} version ${self.state.versionToInstall}? This action cannot be reversed.`,
      onAction: function() {
        h.Vent.emit("layout:confirm:close");

        h.fetch({
          endpoint: url,
          method: "delete",
          success: function() {
            h.Vent.emit("notification", {
              message: `Deleting ${chart.metadata.name} version ${self.state.versionToInstall}`
            });

            let current = self.state.data;
            let deployments = current.Deployments;

            _.remove(deployments, function(deployment) {
              return deployment.name === deploymentId;
            });

            self.setState({
              data: current
            });

            self.props.history.replace(
              {
                state: {
                  data: current
                }
              }
            );

            self.handleTabClick("0");

          }, error: function(error) {
            h.Vent.emit("request-error:confirm-box", error);
          }
        });
      }
    });
  }

  handleTabClick(key) {
    if (this.state.selected !== key) {
      let query = this.useQuery();
      query.set("tab", key);
      this.props.history.push({
        search: query.toString()
      });
      this.setState({
        selected: key
      });
    }
  }

  makeTabs(appMarkdown) {
    let tabCount = 0;
    let tabs = Object.keys(appMarkdown).map((key, index) => {
      tabCount++;
      let tabTitle = appMarkdown[key].title;
      return (
        <div
          key={index}
          className={`header-main-menu-item ${key === this.state.selected ? "active" : ""}`}
          title={tabTitle.length > 12 ? tabTitle : ""}
          onClick={() => this.handleTabClick(key)}
        >
          {appMarkdown[key].title}
          <div className="header-main-menu-status" />
        </div>
      );
    });

    tabs.push(
      <div
        key={tabCount + 1}
        className={`header-main-menu-item ${this.state.selected === "installations" ? "active" : ""}`}
        onClick={() => this.handleTabClick("installations")}
      >
        Installations
        <div className="header-main-menu-status" />
      </div>
    );

    if (this.state.appHasConfig) {
      tabs.push(
        <div
          key={tabCount}
          className={`header-main-menu-item ${this.state.selected === "configuration" ? "active" : ""}`}
          onClick={() => this.handleTabClick("configuration")}
        >
          Configuration
          <div className="header-main-menu-status" />
        </div>
      );
    }

    return tabs;
  }

  handleOpen() {
    let self = this;

    self.setState({
      open: true
    });
  }

  handleClose() {
    this.setState({
      open: false
    });
  }

  handleChange(e) {
    let version = e.target.value;
    let query = this.useQuery();
    query.set("version", version);
    this.props.history.push({
      search: query.toString()
    });
  }

  makeMenu(releases) {
    let menuItems = releases.map(function(release) {
      return (
        <MenuItem
          disableRipple={true}
          key={release}
          value={release}
          className="mp-dropdown-mi"
        >
          {release}
        </MenuItem>
      );
    });

    return (
      <div className="mp-dropdown">
        <FormControl className="mp-dropdown-form">
          <Select
            value={this.state.versionToInstall}
            onOpen={() => this.handleOpen()}
            onClose={() => this.handleClose()}
            onChange={(e) => this.handleChange(e)}
            className="mp-dropdown-select"
            open={this.state.open}
          >
            {menuItems}
          </Select>
        </FormControl>
      </div>
    );
  }

  render() {
    if (this.state.loading === true) {
      return (
        <LoaderMaker
          id="app-detail-nodata"
          config="no-data-large"
          overlay={true}
        />
      );
      return;
    }

    let self = this;
    let selected = this.state.selected;
    let app = this.state.data || {};
    let deployments = _.get(app, "Deployments", []);
    let releases = app.versions.length > 0 ? app.versions : [];
    let activeVersion = this.state.versionToInstall;
    let isInstalled = false;
    let installedVersions = [];
    let deploymentId = "";
    let isConfigured = this.state.isConfigured;
    let appHasConfig = this.state.appHasConfig;

    deployments.map(function(deployment) {
      let v = deployment.chart.metadata.version;
      installedVersions.push(v);

      if (activeVersion === v) {
        deploymentId = deployment.name;
      }
    });

    let configArgs = {
      name: app.chart.metadata.name,
      id: app.chart.metadata.name,
      version: activeVersion,
      deploymentId: deploymentId
    };

    if (_.indexOf(installedVersions, activeVersion) !== -1) {
      isInstalled = true;
      isConfigured = true;
    }

    let currentVersion = _.get(app.app, "version", "");
    let hasUpdates = false;

    if (isInstalled) {
      hasUpdates = activeVersion !== currentVersion
        ? true
        : false;
    }

    let appCategories = _.get(app, "Categories", []);
    let appTags = _.get(app.app, "keywords", []);
    let appMarkdown = this.state.appMarkdown;
    let appIcon = <AppIcon format="card" icon={app.app.icon} category={appCategories[0]} />;
    let appAuthor = (app.app.maintainers || []).length > 0 ? app.app.maintainers.map(m => `${m.name}${m.email ? ` (${m.email})` : ""}`).join(", ") : app.chart.metadata.name;
    let licenses = app.hasOwnProperty("Licenses")
      ? app.Licenses.join(", ")
      : "Unknown";

    let isCompatible = true;

    let compatibilityIcon = isCompatible
      ? "glyphicons glyphicons-circle-empty-check active"
      : "glyphicons glyphicons-circle-empty-remove offline";

    let compatibilityState = isCompatible
      ? "is"
      : "is not";

    let appContent;

    if (selected === "configuration") {
      appContent = this.makeConfiguration(configArgs);
    } else if (selected === "installations") {
      appContent = <Installations />;
    } else {
      appContent = appMarkdown.hasOwnProperty(selected)
        ? appMarkdown[selected].content.replace(/^.\s*[^\S]/gm, "")
        : "No Content Found";
    }

    let installAction = isConfigured || !appHasConfig
      ? () => this.installApp(app)
      : () => h.Vent.emit("notification", {
        message: "You must configure this App first"
      });

    let installClass = !isConfigured && this.state.appHasConfig ? " disabled" : " animated tada";
    let isLoading = this.state.installLoading;

    let actionButton = <div
      onClick={installAction}
      className={`mp-app-button install${installClass} ${isLoading ? "loading" : ""}`}
    >
      {isLoading && (<CircularProgress size={24} />)}
      {this.state.enableDryRun ? "Preview & Install App" : "Install App"}
    </div>;

    let configureButton = !isInstalled && this.state.appHasConfig
      ? <div
          onClick={() => this.configureApp(app, deploymentId)}
          className="mp-app-button configure"
        >
          Configure App
        </div>
      : "";

    let appData = this.state.data;

    let menuData = {
      entries: {
        0: {
          icon: "glyphicons glyphicons-list",
          name: "Categories",
          link: function() {
            self.fetchDataEdit("categories", self.editCategories);
          }
        },
        1: {
          icon: "glyphicons glyphicons-magic-wand",
          name: "Simple",
          link: function() {
            self.fetchDataEdit("simple");
          }
        },
        2: {
          icon: "csicon csicon-settings-editor",
          name: "Advanced",
          link: function() {
            h.fetch({
              endpoint: `/applications/${appData.metadata.name}`,
              success: function(data) {
                h.log.info("Result:", data);

                let result = data.context.result;

                self.setState({
                  application: result || {},
                });

                let dataArr = [];
                dataArr.push(result);

                h.Vent.emit("fullscreen-editor", {
                  config: {
                    title: appData.chart.metadata.name + " " + appData.app.version,
                    endpoint: "applications",
                    location: "",
                    resource: "applications.marketplace.criticalstack.com",
                    nameIdentifier: true
                  },
                  data: dataArr,
                  index: 0,
                  editMode: "edit"
                });
              }
            });
          }
        }
      },
      args: {
        icon: "glyphicons glyphicons-pencil",
      }
    };

    return (
      <div className="mp-app-parent">
        <div className="mp-app-tabs-overlay" />
        <div className="mp-app-tabs">
          {this.makeTabs(appMarkdown)}
        </div>

        <div className="mp-app-card">
          {isInstalled ?
          <div className="ribbon installed">
            <span>Installed</span>
          </div> : ""
          }
          {hasUpdates ?
            <div>
              <i
                data-tip
                data-for="tooltip-u"
                className="glyphicons glyphicons-cloud-alert mp-app-card-has-update"
              />
              <Tooltip
                id="tooltip-u"
                effect="float"
                position="top"
              >
                A newer version is available
              </Tooltip>
            </div> : ""
          }
          <div className="mp-card-box one">
            <div className="carousel-app-icon-parent">
              <img
                className="carousel-app-icon-hc"
                src="/assets/images/marketplace/icons/app-icon-parent.svg"
              />
              {appIcon}
            </div>
            {
              _.get(this.context.access, ["applications.marketplace.criticalstack.com", "update"], true) && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px"
                  }}
                  data-balloon="Edit"
                  data-balloon-pos="up"
                >
                  <MenuMaker data={menuData} />
                </div>
              )
            }
            <div className="mp-app-card-title">
              {app.Name}
            </div>
            <div className="mp-app-card-description">
              {app.Description}
            </div>
            <div className="mp-app-card-body">
              By: {appAuthor}
            </div>

            <div className="mp-app-card-language">
              <div className="mp-app-card-subtitle">
                Application Tags
              </div>
              <div className="mp-app-card-labels">
                <LabelMaker
                  displayAll={true}
                  scope="tag"
                  data={appTags}
                  caller=".mp-app-labels"
                />
              </div>
            </div>
          </div>

          <div className="mp-card-box two">
            <div className="mp-app-card-entry">
              <div className="mp-app-card-subtitle">
                Available versions {`(${releases.length})`}
              </div>

              <div className="mp-app-card-body">
                <div className="mp-app-card-entry-text">
                  {this.makeMenu(releases)}
                </div>
              </div>
            </div>

            {installedVersions.length > 0 ?
                <div className="mp-app-card-entry">
                  <div className="mp-app-card-subtitle">
                    Installed Versions {`(${installedVersions.length})`}
                  </div>

                  <div className="mp-app-card-body">
                    <div className="mp-app-card-entry-text">
                      {installedVersions.join(" - ")}
                    </div>
                  </div>
                </div> : ""
            }

            <div className="mp-app-card-entry">
              <div className="mp-app-card-subtitle">
                Licenses
              </div>

              <div className="mp-app-card-body">
                <div className="mp-app-card-entry-text">
                  {licenses}
                </div>
              </div>
            </div>

            <div className="mp-app-install">
              {configureButton}
              <div style={{
                marginBottom: "10px",
                position: "relative",
                padding: "0 18px",
                display: "inline-block"
              }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={this.state.enableDryRun}
                      onChange={() => this.toggleEnableDryRun()}
                    />
                  }
                  label="Include dry run"
                />
                <span
                  className="info-icon"
                  data-balloon="Preview resources prior to deployment"
                  data-balloon-pos="up"
                  data-balloon-length="large">
                  <i className="glyphicons glyphicons-circle-info"></i>
                </span>
              </div>
              {actionButton}
            </div>

            <div className="mp-app-card-notes">
              <i className={`mp-app-card-status ${compatibilityIcon}`} />
              <div className="mp-app-card-note">
                This application {compatibilityState} compatible with this namespace.
              </div>
            </div>
          </div>
        </div>

        <div className="mp-app-body">
          {
            (selected !== "configuration" && selected !== "installations") ?
            <ReactMarkdown
              className="markdown-body"
              source={appContent}
            /> : appContent
          }
        </div>

        { this.state.simpleEdit && (
          <EditAppSimple
            open={this.state.simpleEdit}
            closeDialog={self.closeSimpleEdit}
            name={self.state.data.metadata.name}
            version={self.state.versionToInstall}
            data={self.state.data}
            dataEdit={self.state.dataEdit}
          />
        )}
      </div>
    );
  }
}

AppDetail.contextType = RBACContext;

export default withRouter(AppDetail);
