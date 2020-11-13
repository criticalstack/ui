"use strict";

import React from "react";
import h from "../../helpers";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import _ from "lodash";
import moment from "moment";

class Table extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Policy Types",
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
    let policies = d.spec.hasOwnProperty("policyTypes")
      ? d.spec.policyTypes
      : [];

    let policyDetail = [];
    let policyDetailHtml = [];
    let policy;

    for (policy of policies) {
      let detail = d.spec[policy.toLowerCase()];
      policyDetail[policy] = detail;
      let policyTest = _.get(policyDetail, policy, false);
      let policyFunc = policy;

      let policyText = policyTest !== false ?
        <pre>
          {JSON.stringify(policyTest, null, 2)}
        </pre> : "No policy is defined";

      policyDetailHtml.push(
        <div
          className="table-network-policy-link"
          key={policy}
          onClick={
            function() {
              h.Vent.emit("layout:confirm:open", {
                open: true,
                title: <span>
                  <i
                    className="csicon csicon-mp-networking"
                    style={{
                      marginTop: "2px",
                      marginRight: "15px",
                      color: "#0078e7"
                    }}
                  />
                  Policy Type: {policyFunc}
                </span>,
                message: policyText,
                bodyStyle: {
                  backgroundColor: "#14171B",
                  color: "#fff",
                  borderRadius: "5px",
                  padding: "20px",
                  margin: "20px"
                }
              });
            }
          }
        >
          {policy}
        </div>
      );
    }

    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let labels = _.get(d, "metadata.labels", "None");

    if (labels !== "None") {
      labels = <LabelMaker scope="networkpolicies"
        data={d.metadata.labels} uid={d.metadata.uid} />;
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
          value: policyDetailHtml
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
          id="network-policies-table"
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
