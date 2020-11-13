"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import h from "../../helpers";
import moment from "moment";

class Table extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Workload"
        },
        {
          value: "MinPods"
        },
        {
          value: "MaxPods"
        },
        {
          value: "Replicas"
        },
        {
          value: "Targets"
        },
        {
          value: "Age"
        },
        {
          value: "Labels"
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
    let workload = d.spec.scaleTargetRef.kind;
    let minPods = d.spec.minReplicas;
    let maxPods = d.spec.maxReplicas;
    let replicas = d.status.currentReplicas;
    let metrics = d.spec.hasOwnProperty("metrics") ? d.spec.metrics : [];

    let targets = (
      metrics.map((metric, i) => {
        return <div key={i} className="td-v-space">
          {metric.resource.target.averageUtilization}% {metric.resource.name}
        </div>;
      })
    );

    if (!d.metadata.hasOwnProperty("labels")) {
      d.metadata.labels = {};
    }

    let labels = (
      <span className="labels-empty">-</span>
    );

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="horizontalpodautoscaler" data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: workload.replace(/([A-Z])/g, " $1").trim()
        },
        {
          value: minPods
        },
        {
          value: maxPods
        },
        {
          value: replicas
        },
        {
          value: <span>{targets}</span>
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
          value: labels
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <div>
        <TableBuilder
          id="horizontal-pod-autoscalers-table"
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
