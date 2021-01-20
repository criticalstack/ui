"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import h from "../../helpers";
import moment from "moment";
import _ from "lodash";

class Table extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Syscalls"
        },
        {
          value: "Age"
        },
        {
          value: "Label Selectors"
        },
        {
          value: "Field Selectors"
        },
        {
          value: "Host Selector"
        }
      ]
    };

    return head;
  }

  createRow(d) {
    let name = d.metadata.name;

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");

    let labelSelectors = "None";
    let fieldSelectors = "None";

    if (d.spec.hasOwnProperty("labelSelector")) {
      labelSelectors = <LabelMaker scope="labelSelector"
        data={d.spec.labelSelector.matchLabels} uid={d.metadata.uid} />;
    }

    if (d.spec.hasOwnProperty("fieldSelector")) {
      fieldSelectors = <LabelMaker scope="fieldSelector"
        data={d.spec.fieldSelector.matchLabels} uid={d.metadata.uid} />;
    }

    let joinItems = ["syscalls", "hostSelector"];
    let joined = {};
    joinItems.map(item => {
      let raw = _.get(d.spec, item, ["-"]);
      raw = raw.join(", ");
      joined[item] = raw;
    });

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: joined.syscalls
        },
        {
          raw: rawTime,
          value: <div
            data-balloon={`created: ${created}`}
            data-balloon-pos="up">
            {uptime}
          </div>
        },
        {
          value: labelSelectors
        },
        {
          value: fieldSelectors
        },
        {
          value: joined.hostSelector
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <div>
        <TableBuilder
          id="traces-table"
          route={this.props.route}
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

export default Table;
