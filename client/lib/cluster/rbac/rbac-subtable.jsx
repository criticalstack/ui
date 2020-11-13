"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import _ from "lodash";

class RBACSubtable extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      data: [],
      type: ""
    };
  }

  componentDidMount() {
    this.setState({
      data: this.props.data,
      type: this.props.type
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.data !== prevProps.data) {
      this.setState({
        data: this.props.data
      });
    }
  }

  createRow(data) {
    let row;

    if (this.state.type === "Rules") {

      let ruleItems = ["apiGroups", "resources", "verbs", "resourceNames", "nonResourceURLs"];
      let rule = {};
      ruleItems.map(item => {
        let raw = _.get(data, item, ["-"]);
        raw = raw.map(x => {
          if (x === "") {
            x = "\" \" (core)";
          }
          return x;
        }).join(", ");
        rule[item] = raw;
      });

      row = {
        raw: data,
        cells: [
          {
            value: rule.apiGroups
          },
          {
            value: rule.resources
          },
          {
            value: rule.verbs
          },
          {
            value: rule.resourceNames
          },
          {
            value: rule.nonResourceURLs
          }
        ]
      };
    } else {
      row = {
        raw: data,
        cells: [
          {
            value: data.kind
          },
          {
            value: data.name
          },
          {
            value: _.get(data, "namespace", "-")
          }
        ]
      };
    }

    return row;
  }

  render() {
    let head;

    if (this.state.type === "Rules") {
      head = {
        main: [
          {
            value: "API Groups"
          },
          {
            value: "Resources"
          },
          {
            value: "Verbs"
          },
          {
            value: "Resource Names"
          },
          {
            value: "Non-Resource URLS"
          }
        ]
      };
    } else {
    head = {
      main: [
        {
          value: "Kind"
        },
        {
          value: "Name"
        },
        {
          value: "Namespace"
        }
      ]
    };
    }

    return (
        <TableBuilder
          id={`sub-${this.state.type}-table`}
          head={head}
          body={this.state.data.map(this.createRow.bind(this))}
          className={this.props.className}
          sort={true}
          filter={false}
          subTable={true}
          hasCheckBox={false}
          subtableTitle={this.state.type}
          noContextMenu
        />
    );
  }
}

export default RBACSubtable;
