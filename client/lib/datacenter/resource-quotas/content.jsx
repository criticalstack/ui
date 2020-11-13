"use strict";

import React from "react";
import SimpleBar from "../../../shared/charts/simple-bar";
import _ from "lodash";
import h from "../../helpers";

const csResources = {
  "cpu": {
    icon: "glyphicons glyphicons-dashboard"
  },
  "configmaps": {
    icon: "csicon csicon-config-maps"
  },
  "memory": {
    icon: "glyphicons glyphicons-equalizer-dots"
  },
  "requests-storage": {
    icon: "csicon csicon-storage"
  },
  "pods": {
    icon: "csicon csicon-pods"
  },
  "services": {
    icon: "csicon csicon-services"
  },
  "services-loadbalancers": {
    icon: "csicon csicon-services"
  },
  "services-nodeports": {
    icon: "csicon csicon-services"
  },
  "replicationcontrollers": {
    icon: "csicon csicon-replication-controller"
  },
  "resourcequotas": {
    icon: "csicon csicon-resource-quotas"
  },
  "secrets": {
    icon: "csicon csicon-secrets"
  },
  "persistentvolumeclaims": {
    icon: "csicon csicon-persistent-volume-claims"
  }
};

const csMultipliers = {
  "Mi": 1.049e+6,
  "Gi": 1.074e+9,
  "Ti": 1.1e+12,
  "Pi": 1.126e+15,
  "m": 0.001,
  "k": 1.024e+3
};

class Content extends React.Component {
  siToNumber(n) {
    let multipliers = csMultipliers;
    let re = /\D+$/;
    let convert = false;

    let nn = re.exec(n);
    if (nn !== null) {
      convert = true;
      n = n.replace(/\D/g, "") * multipliers[nn[0]] || 0;
    }

    return [n, convert];
  }

  calcInuse(a, b) {
    let multipliers = csMultipliers;

    let re = /\D+$/;

    let aa = re.exec(a);
    if (aa !== null) {
      a = a.replace(/\D/g, "") * multipliers[aa[0]] || 0;
    }

    let bb = re.exec(b);
    if (bb !== null) {
      b = b.replace(/\D/g, "") * multipliers[bb[0]] || 0;
    }

    let p = 0;
    if (b > 0) {
      p = Math.round((a / b) * 100) || 0;
    } else {
      p = 100;
    }
    return p;
  }

  createHeader(hr) {
    let header = (
      <tr>
        {hr.map(function(item, i) {
          let headerClass = ["default-header-cell"];

          if (item.hasOwnProperty("className")) {
            headerClass.push(item.className.split(" "));
          }

          return (
            <th
              key={`${i}`}
              className={headerClass.join(" ")}
              data-index={i}
              style={item.style}>
              {item.value}
            </th>
          );
        })}
      </tr>
    );
    return header;
  }

  createRow(d) {
    let statusColor = d.usage > 80 ? "#6a6a6a" : "#0b5ce2";

    let row = (
      <tr key={d.name}>
        <td style={{
          paddingLeft: 0,
          paddingRight: 0,
          textAlign: "center",
          borderBottom: "none",
          fontSize: "25px",
          borderLeft: "solid",
          borderLeftColor: statusColor
        }}
        >
          <div
              style={{position: "relative"}}
          >
            <i
             style={{color: "#6a6a6a"}}
             className={d.icon}
            />
              {(
                d.usage > 80 ?
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      position: "absolute",
                      top: "-20px",
                      right: "0px",
                      borderBottomLeftRadius: "5px"
                    }}
                   >
                      <i
                        style={{
                          color: "#c32f1e",
                          fontSize: "20px",
                          marginRight: "-2px",
                          marginTop: "1px"
                        }}
                        className="glyphicons glyphicons-skull-crossbones"
                      />
                  </div> : ""
                )}
          </div>
        </td>
        <td>{d.name}</td>
        <td>{d.hard}</td>
        <td>{d.used}</td>
        <td>{d.remaining}</td>
        <td>
         {<SimpleBar
            width={d.usage}
            height="25px"
            color="#6ea7fd"
          />}
        </td>
      </tr>
  );
    return row;
  }

  render() {
    let head = [
      {
        disableClick: true,
        value: <i className="glyphicons glyphicons-flash"></i>,
        className: "icon-cell",
        style: {
          width: "65px",
          textAlign: "center",
          backgroundColor: "#f1f2f6",
          color: "#6a6a6a",
          borderBottom: "none !important",
          zIndex: "5"
        }
      },
      {
        value: "Resource",
        style: {
          maxWidth: "450px"
        }
      },
      {
        value: "Limit"
      },
      {
        value: "Used"
      },
      {
        value: "Free"
      },
      {
        value: "In Use"
      }
    ];

    let self = this;
    let resourcesHard = _.get(self.props.data, "status.hard", {});
    let resourcesUsed = _.get(self.props.data, "status.used", {});

    let quotas = Object.keys(resourcesHard).map((key) => {
      let hard = self.siToNumber(resourcesHard[key]);
      let used = self.siToNumber(resourcesUsed[key]);
      let usage = self.calcInuse(used[0], hard[0]);
      let remaining = hard[0] - used[0];

      if (hard[1] || used[1]) {
        remaining = h.view.helpers.humanFileSize(remaining);
      }

      let icon = _.get(csResources, `${key.replace(".", "-")}.icon`, "glyphicons glyphicons-pulse");

      return {
        name: key,
        hard: resourcesHard[key],
        used: resourcesUsed[key],
        remaining: remaining,
        usage: usage,
        icon: icon
      };
    });

    let body = quotas.map((q) => self.createRow(q));
    let header = self.createHeader(head);

    return (
      <div className="table-parent rq">
        <div className="table-wrapper" >
          <table
            className="default-table rq"
            id="resource-quotas-table">
            <thead>
              {header}
            </thead>
            <tbody>
              {body}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default Content;
