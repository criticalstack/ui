"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import SelectorMaker from "../../../shared/selector-maker";
import ClipboardEntry from "../../../shared/clipboard-entry";
import _ from "lodash";
import h from "../../helpers";
import moment from "moment";

class ServiceTable extends React.Component {
  createRow(service) {
    // TODO Fix for AWS in services UI
    // Temporary hack for Capital One demo instance
    // let hostName = (CSOS.HOSTNAME.indexOf(".local") !== -1) ? CSOS.HOSTNAME : "10.34.8.221";
    let hostName = CSOS.HOSTNAME;

    let name = service.metadata.name;
    let clusterIp = service.spec.clusterIP;

    let mode = service.spec.type;

    if (mode === "ClusterIP") {
      mode = "Cluster IP";
    } else {
      mode = mode.replace(/([A-Z])/g, " $1").trim();
    }

    let dnsName = _.get(service, "status.loadBalancer.ingress[0].hostname", "-");

    let dnsEntry = dnsName !== "-" ?
      <ClipboardEntry
        style={{
          height: "20px",
          width: "220px",
          float: "left",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
        displayText={dnsName}
        copyText={dnsName}
        uniqueId={`copy-${dnsName}`}
        toolTip={dnsName}
      /> : dnsName;

    let created = moment(service.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let labels = "None";

    if (service.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="service" data={service.metadata.labels} uid={service.metadata.uid} />;
    }

    let selectors = "None";

    if (service.spec.hasOwnProperty("selector")) {
      selectors = <SelectorMaker scope="service" data={service.spec.selector} uid={service.metadata.uid} />;
    }

    let ports = "-";
    let nodePorts = "-";

    if (service.spec.hasOwnProperty("ports")) {
      ports = service.spec.ports.map(function(p) {
        return `${p.port}`;
      }).join(", ");

      let np = [];
      service.spec.ports.map(function(p) {
        if (p.hasOwnProperty("nodePort")) {
          np.push(<a
            className="services-port-link"
            key={p.nodePort}
            href={`//${hostName}:${p.nodePort}`}
            target="_blank">
            {p.nodePort}
            <i className="glyphicons glyphicons-square-new-window" />
            </a>);
        }
      });
      if (np.length > 0) {
        nodePorts = np;
      }
    }

    let row = {
      id: name,
      raw: service,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: mode
        },
        {
          value: clusterIp
        },
        {
          raw: ports,
          value: ports
        },
        {
          raw: nodePorts,
          value: nodePorts
        },
        {
          value: dnsEntry
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
        },
        {
          value: selectors
        }
      ]
    };

    return row;
  }

  render() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Mode"
        },
        {
          value: "Cluster IP"
        },
        {
          value: "Pod Ports"
        },
        {
          value: "Node Ports"
        },
        {
          value: "DNS Name"
        },
        {
          value: "Age",
          style: {
            minWidth: "100px"
          }
        },
        {
          value: "Labels"
        },
        {
          value: "Selectors"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="services-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
          filter={false}
        />
      </div>
    );
  }
}

export default ServiceTable;
