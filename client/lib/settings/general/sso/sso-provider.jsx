"use strict";

import React from "react";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import NoResult from "../../../../shared/no-result";
import LoaderMaker from "../../../../shared/loader-maker";
import Connectors from "./connectors";
import h from "../../../helpers";
import Form from "@rjsf/core";
import { formSchema, uiSchema, formValidation } from "../schemas/sso-provider-edit";
import Forbidden from "../../../../shared/forbidden";
import { RBACContext } from "../../../../shared/context/rbac";
import _ from "lodash";

class SSOProvider extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      resource: "configmaps",
      loading: true,
      isConfig: false,
      result: {}
    };
  }

  componentDidMount() {
    let self = this;
    self.fetchState();
  }

  fetchState() {
    let self = this;

    h.fetch({
      endpoint: "/sso/config",
      resUrl: false,
      error: function(r) {
        console.log(r);
        self.setState({
          isConfig: false,
          loading: false
        });
      },
      success: function(u) {
        h.log.info("Result:", u);
        let result = u.context.result;
        if (result.providerURL !== "") {
          self.setState({
            result: result,
            isConfig: true
          });
        }
        self.setState({
          loading: false
        });
      }
    });
  }

  addProvider() {
    let self = this;

    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchema,
      uiSchema: uiSchema,
      validate: formValidation,
      title: "Add an SSO provider",
      icon: "glyphicons glyphicons-key",
      onAction: function(form, callback) {
        h.fetch({
          method: "post",
          endpoint: "/sso/config",
          body: JSON.stringify(form),
          success: function(u) {
            let result = u.context.result;
            h.Vent.emit("notification", {
              message: "The SSO provider was successfully added"
            });

            self.setState({
              result: result,
              isConfig: true
            });

            h.Vent.emit("layout:form-dialog:close");

            if (callback && typeof callback === "function") {
              return callback();
            }
            return true;
          },
          error: function(a) {
            console.log("error: ", a);

            h.Vent.emit("notification", {
              message: "Failed to add provider"
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

  saveConfig(data) {
    let self = this;

    h.Vent.emit("layout:confirm:open", {
      open: true,
      title: "Confirm Request: Save configuration?",
      message: "Are you sure that you want to save your changes?",
      primaryAction: "ok",
      onAction: function() {
        h.Vent.emit("layout:confirm:close");
        h.fetch({
          endpoint: "/sso/config",
          method: "post",
          body: JSON.stringify(data.formData),
          success: function(u) {
            let result = u.context.result;
            self.setState({
              result: result
            });

            h.Vent.emit("notification", {
              message: "Configuration saved"
            });

          },
          error: function(error) {
            console.log("error");
            h.Vent.emit("request-error:confirm-box", error);
          }
        });
      }
    });
  }

  removeProvider() {
    let self = this;

    h.Vent.emit("layout:confirm:open", {
      open: true,
      title: "Remove SSO Provider?",
      message: "Are you sure you want to remove SSO?",
      primaryAction: "delete",
      onAction: function() {
        h.Vent.emit("layout:confirm:close");
        h.fetch({
          endpoint: "/sso/config",
          method: "delete",
          success: function() {
            self.setState({
              isConfig: false
            });

            h.Vent.emit("notification", {
              message: "SSO has been removed"
            });
          },
          error: function(error) {
            h.Vent.emit("request-error:confirm-box", error);
          }
        });
      }
    });
  }

  controls() {
    let ctrlButtons = !this.state.isConfig ?
      <Button
        disableFocusRipple={true}
        disableRipple={true}
        variant="contained"
        className="dialog-button btn-create"
        onClick={() => this.addProvider()}
      >
        <i
          className="glyphicons glyphicons-plus dialog-button-icon btn-create"
        />
        Add SSO Provider
      </Button> : ""
      ;
    return (
      <div className="settings-options">
        {ctrlButtons}
      </div>
    );
  }

  renderProviderOrNoData() {
    let self = this;
    let result = this.state.result;

    if (result.providerURL) {
      formSchema.properties.providerURL.default = result.providerURL;
    }
    if (result.dexProxyEndpoint) {
      formSchema.properties.dexProxyEndpoint.default = result.dexProxyEndpoint;
    }

    if (this.state.isConfig) {
      uiSchema.providerURL["ui:autofocus"] = false;
    }

    let buttons = (
      <div
        style={{
          "marginLeft": "-16px",
          "marginTop": "5px"
        }}
      >
        <Button
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className="dialog-button btn-create"
          type="submit"
          style={{
            "float": "none",
            "display": "inline-block",
            "marginTop": "10px"
          }}
        >
          Save Configuration
        </Button>

        <Button
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className="dialog-button btn-delete"
          style={{
            "float": "none",
            "display": "inline-block",
            "marginTop": "10px"
          }}
          onClick={() => this.removeProvider()}
        >
          Remove SSO
        </Button>
      </div>
    );

    if (this.state.isConfig) {
      return (
        <div>
          <div className="sso-status">
            <span className="label">Status:</span>
            {
              this.state.result.providerURL ?
                <span className="sso-success">
                  <i className="glyphicons glyphicons-sync-check"></i>
                  Enabled
                </span> :
                <span className="sso-error">
                  <i className="glyphicons glyphicons-sync-alert"></i>
                  Disabled
                </span>

            }
          </div>
          <Form
            schema={formSchema}
            uiSchema={uiSchema}
            onSubmit={(data) => this.saveConfig(data)}
          >
          {buttons}
        </Form>
        </div>
      );
    }

    if (self.state.loading) {
      return <LoaderMaker id="sources-nodata" config="no-data-large" />;
    }

    return (
      <NoResult
        title={"No SSO Provider"}
        body={"No SSO provider configured"}
        icon="glyphicons glyphicons-key"
        style={{
          paddingTop: "50px",
          paddingBottom: "10px"
        }}
      />
    );
  }

  render() {
    var self = this;
    let controls = self.controls();
    let providerData = self.renderProviderOrNoData();

    return (
      <div>
        <div>
          <Card>
            {
              _.get(this.context.csAccess, [this.state.resource, "update"], true) ? (
                <>
                <CardHeader
                  title="SSO providers"
                  subheader="What would you like to do?"
                />
                <CardContent>
                  {controls}
                  {providerData}
                </CardContent>
                </>
              ) : (
                <CardContent>
                  <Forbidden />
                </CardContent>
              )
            }
          </Card>
        </div>

        <div style={{paddingTop: "20px"}}>
          <Card>
            <CardHeader
              title="Connectors"
            />
            {
              _.get(this.context.csAccess, ["connectors.dex.coreos.com", "list"], true) ? (
                <>
                <CardContent>
                  <Connectors />
                </CardContent>
                </>
              ) : (
                <CardContent>
                  <Forbidden />
                </CardContent>
              )
            }
          </Card>
        </div>
      </div>
    );
  }
}

SSOProvider.contextType = RBACContext;

export default SSOProvider;
