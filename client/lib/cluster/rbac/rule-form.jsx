"use strict";

import React from "react";
import CreatableSelect from "react-select/creatable";
import makeAnimated from "react-select/animated";
import _ from "lodash";
import h from "../../helpers";

const animatedComponents = makeAnimated();

class RuleForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isRsrcFirst: false,
      resources: [],
      resourceOptions: [],
      verbOptions: [],
      apiGroupOptions: []
    };

    this.setOptions = this.setOptions.bind(this);
  }

  componentDidMount() {
    let self = this;
    this.filterResources();

    h.Vent.addListener("dialog-body:scroll", function() {
      self.apiGroups_ref.blur();
      self.resources_ref.blur();
      self.verbs_ref.blur();
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.rawResources !== prevProps.rawResources) {
      this.filterResources();
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("dialog-body:scroll");
  }

  filterResources() {
    let { isNamespaced, rawResources } = this.props;
    let resources = [];

    if (isNamespaced) {
      resources = _.filter(rawResources, {namespaced: true});
    } else {
      resources = rawResources;
    }
    this.setState({resources}, this.setOptions);
  }

  setOptions() {
    this.handleChange("rules", "apiGroups", this.props.rule.apiGroups, this.props.i);

    // Switches out selected resources with ones from rawResources bc it contains other necessary data
    let selectedResources = [];

    if (this.props.rule.resources) {
      this.props.rule.resources.forEach(resource => {
        let isIncluded = _.some(this.state.resources, (o) => o.value === resource.value);

        if (!isIncluded) {
          selectedResources.push(resource);
        } else {
          let rawResource = _.find(this.state.resources, function(o) {
            return o.value === resource.value;
          });
          selectedResources.push(rawResource);
        }
      });
    }
    this.handleChange("rules", "resources", selectedResources, this.props.i);
  }

  toggleOrder() {
    this.setState({
      isRsrcFirst: !this.state.isRsrcFirst
    });
  }

  handleChange(type, subtype, selected, i) {
    if (subtype === "apiGroups") {
      if (!selected) {
        let resourceOptions = [];
        this.setState({
          resourceOptions
        });
      } else {
        let resourceOptions = [];
        let flatResources = [];

        this.state.resources.forEach(resource => {
          let exist = _.includes(flatResources, resource.value);
          if (!exist) {
            selected.forEach(apiGroup => {
              if (resource.groupVersion === apiGroup.value) {
                resourceOptions.push(resource);
                flatResources.push(resource.value);
              }
            });
          }
        });

        this.setState({
          resourceOptions
        });
      }
    }

    if (subtype === "resources") {
      if (!selected) {
        let verbOptions = [];
        let apiGroupOptions = [];
        this.setState({
          verbOptions,
          apiGroupOptions
        });
      } else {
        let apiGroupOptions = [];
        let flatApiGroups = [];

        selected.forEach(resource => {
          let group = resource.groupVersion;
          let groupLabel = group;
          if (group === "") {
            groupLabel = "\" \" (core)";
          }
          let exist = _.includes(flatApiGroups, group);
          if (!exist && typeof group === "string") {
            flatApiGroups.push(group);
            apiGroupOptions.push({
              value: group,
              label: groupLabel
            });
          }
        });

        let rawVerbs = [];
        selected.forEach(x => {
          if (x.verbs) {
            rawVerbs.push(x.verbs);
          }
        });
        let verbs = _.uniq(_.flatten(rawVerbs));

        let verbOptions = verbs.map(verb => {
          let option = {
            value: verb,
            label: verb
          };
          return option;
        });

        this.setState({
          apiGroupOptions,
          verbOptions
        });
      }
    }
    this.props.handleSelect(type, subtype, selected, i);
  }

  render() {
    let {
      isRsrcFirst,
      resources,
      resourceOptions,
      apiGroupOptions
    } = this.state;

    let {
      rule,
      i,
      isLoading,
      isSingle
    } = this.props;

    let apiGroupsRaw = _.uniq(
      resources.map(x => {
        return x.groupVersion;
      })
    );

    let apiGroups = [];
    apiGroupsRaw.forEach(group => {
      let groupLabel = group;
      if (group === "") {
        groupLabel = "\" \" (core)";
      }
      apiGroups.push({
        value: group,
        label: groupLabel
      });
    });

    let errors = rule.hasOwnProperty("errors");

    let resourcesField = {
      title: "Resources",
      type: "resources",
      options: isRsrcFirst ? _.uniqBy(resources, "value") : resourceOptions,
      value: rule.resources,
      hasError: errors && _.includes(rule.errors, "resources"),
      message: () => "Options depend on selected API Groups",
      help: "The ID or name of the resource that is being accessed (for resource requests only) such as podsecuritypolicies or clusterroles resources. For resource requests using \"get\", \"update\", \"patch\" and \"delete\" verbs, you must provide the resource name."
    };

    let apiGroupsField = {
      title: "API Groups",
      type: "apiGroups",
      options: isRsrcFirst ? apiGroupOptions : apiGroups,
      value: rule.apiGroups,
      hasError: errors && _.includes(rule.errors, "apiGroups"),
      message: () => "Options depend on selected Resources",
      help: "API Groups extend the Kubernetes API. For example, RBAC (rbac.authorization.k8s.io) is an API group that extends Kubernetes' API to handle authenticaion and authorization of users."
    };

    let selectFields = [
      ...( this.state.isRsrcFirst ? [resourcesField, apiGroupsField] : []),
      ...( !this.state.isRsrcFirst ? [apiGroupsField, resourcesField] : []),
      {
        title: "Verbs",
        type: "verbs",
        options: this.state.verbOptions,
        value: rule.verbs,
        hasError: errors && _.includes(rule.errors, "verbs"),
        message: () => "Options depend on selected Resources",
        help: "These are standard HTTP Request verbs such as \"get\", \"post\", \"patch\", as well as Kubernetes specialized verbs such as \"use\", \"bind\" and \"escalate\"."
      }
    ];

    return (
      <div className="react-select">
        <div style={{marginBottom: "0"}}>
          <button
            style={{
              visibility: isSingle ? "hidden" : "visible"
            }}
            type="button"
            className="remove-btn-icon"
            onClick={() => this.props.removeItem("rules", i)}
          >
            <i className="glyphicons glyphicons-menu-close"></i>
          </button>
        </div>

        {
          selectFields.map((field, index) => (
            <div key={index}>
              <div className="label-info">
                <label>{field.title}*</label>
                <span
                  className="info"
                  data-balloon={field.help}
                  data-balloon-pos="right"
                  data-balloon-length="large"
                >
                  <i className="glyphicons glyphicons-circle-info"></i>
                </span>
                {
                  field.hasError && (<div className="required-label">required</div>)
                }
              </div>
              <CreatableSelect
                ref={ref => {
                  this[`${field.type}_ref`] = ref;
                }}
                isClearable
                isMulti
                isSearchable
                isLoading={isLoading}
                onChange={(selected) => this.handleChange("rules", field.type, selected, i)}
                options={field.options}
                value={field.value}
                menuPosition="fixed"
                components={animatedComponents}
                closeMenuOnSelect={false}
                noOptionsMessage={field.message}
                styles={{
                  control: styles => ({
                    ...styles,
                    borderColor: field.hasError ? "red !important" : styles.borderColor,
                  })
                }}
              />
              {
                index === 0 && (
                  <div className="toggle-order">
                    <span
                      className="toggle-order-btn"
                      onClick={() => this.toggleOrder()}
                    >
                      <i className="glyphicons glyphicons-sort"></i>
                    </span>
                  </div>
                )
              }
            </div>
          ))
        }
      </div>
    );
  }
}

export default RuleForm;
