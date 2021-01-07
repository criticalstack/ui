"use strict";

import React from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import h from "../../helpers";
import _ from "lodash";

class SubjectForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      kindOptions: [
        {
          value: "User",
          label: "User"
        },
        {
          value: "Group",
          label: "Group"
        },
        {
          value: "ServiceAccount",
          label: "ServiceAccount"
        }
      ],
      nameOptions: [],
      userOptions: [],
      groupOptions: [],
      nsOptions: [],
      isServiceAcct: props.subject.kind.value === "ServiceAccount"
    };
  }

  setOptions() {
    let userOptions = [];
    let groupOptions = [];

    this.props.rawUsers.forEach(x => {
      let option = {
        value: x.Name,
        label: x.Name
      };
      if ( x.Kind === "User") {
        userOptions.push(option);
      } else {
        groupOptions.push(option);
      }
    });

    this.setState({
      userOptions,
      groupOptions,
    });
  }

  componentDidMount() {
    let self = this;
    this.fetchNsOptions();

    if (this.props.rawUsers.length > 0) {
      this.setOptions();
    }

    h.Vent.addListener("dialog-body:scroll", function() {
      self.kind_ref.blur();
      if (self.state.isServiceAcct) {
        self.namespace_ref.blur();
      }
      self.name_ref.blur();
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.rawUsers !== prevProps.rawUsers) {
      this.setOptions();
    }

    let propValue = this.props.subject.kind.value;
    if (propValue !== prevProps.subject.kind.value) {
      this.setState({
        isServiceAcct: propValue === "ServiceAccount"
      });
    }
  }

  componentWillUnmount() {
    h.Vent.removeAllListeners("dialog-body:scroll");
  }

  fetchNsOptions() {
    let self = this;
    h.fetch({
      endpoint: "/namespaces",
      success: function(data) {
        let nsOptions = [];
        data.context.result.forEach(ns => {
          nsOptions.push({
            value: ns.metadata.name,
            label: ns.metadata.name
          });
        });
        self.setState({
          nsOptions
        });
      }
    });
  }

  setNameOptions(namespace) {
    let self = this;
    self.setState({
      isLoading: true
    });
    h.fetch({
      endpoint: `/serviceaccounts?namespace=${namespace}`,
      success: function(data) {
        let result = data.context.result;
        let nameOptions = [];

        result.forEach(x => {
          nameOptions.push({
            value: x.metadata.name,
            label: x.metadata.name
          });
        });

        self.setState({
          isLoading: false,
          nameOptions
        });
      }
    });
  }

  handleChange(type, subtype, selected, i) {
    let isRoleBinding = this.props.type === "RoleBinding";
    let ns = this.props.namespace;

    if (subtype === "kind") {
      if (selected.value === "User") {
        this.setState({
          nameOptions: this.state.userOptions,
          isServiceAcct: false
        });
      } else if ( selected.value === "Group") {
        this.setState({
          nameOptions: this.state.groupOptions,
          isServiceAcct: false
        });
      } else if ( selected.value === "ServiceAccount") {
        this.setState({
          nameOptions: [],
          isServiceAcct: true,
        });
        if (isRoleBinding) {
          this.props.handleSelect(type, "namespace", {value: ns, label: ns}, i);
          this.setNameOptions(ns);
        } else {
          this.props.handleSelect(type, "namespace", {value: "", label: ""}, i);
        }
      }
      this.props.handleSelect(type, "name", {value: "", label: ""}, i);
    }

    if (subtype === "namespace") {
      this.setNameOptions(selected.value);
    }
    this.props.handleSelect(type, subtype, selected, i);
  }

  render() {

    let {
      subject,
      i,
      isLoading,
      isSingle,
      type
    } = this.props;

    let errors = subject.hasOwnProperty("errors");

    let selectFields = [
      {
        title: "Kind",
        type: "kind",
        options: this.state.kindOptions,
        value: subject.kind,
        isDisabled: false,
        hasError: errors && _.includes(subject.errors, "kind"),
        help: "Subjects are users, groups, or service accounts in the cluster.",
        isCreatable: false,
      },
      ... (this.state.isServiceAcct ? [{
        title: "Namespace",
        type: "namespace",
        options: this.state.nsOptions,
        value: subject.namespace,
        isDisabled: type === "RoleBinding",
        hasError: errors && _.includes(subject.errors, "namespace"),
        help: "This is the namespace of the designated Service Account.",
        isCreatable: false,
      }] : []),
      {
        title: "Name",
        type: "name",
        options: this.state.nameOptions,
        value: subject.name,
        isDisabled: false,
        hasError: errors && _.includes(subject.errors, "name"),
        help: "Select the user, group, or service account this binding should be granted to.",
        isCreatable: true,
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
            onClick={() => this.props.removeItem("subjects", i)}
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
              {
                field.isCreatable ? <CreatableSelect
                  ref={ref => {
                    this[`${field.type}_ref`] = ref;
                  }}
                  isSearchable
                  isLoading={isLoading}
                  onChange={(selected) => this.handleChange("subjects", field.type, selected, i)}
                  options={field.options}
                  value={field.value}
                  menuPosition="fixed"
                  styles={{
                    control: styles => ({
                      ...styles,
                      borderColor: field.hasError ? "red !important" : styles.borderColor,
                    })
                  }}
                /> : <Select
                  ref={ref => {
                    this[`${field.type}_ref`] = ref;
                  }}
                  isSearchable
                  onChange={(selected) => this.handleChange("subjects", field.type, selected, i)}
                  options={field.options}
                  value={field.value}
                  menuPosition="fixed"
                  isDisabled={field.isDisabled}
                  styles={{
                    control: styles => ({
                      ...styles,
                      borderColor: field.hasError ? "red !important" : styles.borderColor,
                    })
                  }}
                />
              }
            </div>
          ))
        }

      </div>
    );
  }
}

export default SubjectForm;
