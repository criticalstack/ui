"use strict";

import React from "react";

class Content extends React.Component {
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

  createRow(d, i) {
    let row = "";
    let empty = "-";

    let type = d.type;
    let parseType = 0;

    if (type === "PersistentVolumeClaim") {
      parseType = 1;
    }

    switch (parseType) {
      case 0: // Pod or Container

        let cpuMin = empty;
        let memMin = empty;

        if (d.hasOwnProperty("min")) {
          cpuMin = d.min.hasOwnProperty("cpu") ? d.min.cpu : empty;
          memMin = d.min.hasOwnProperty("memory") ? d.min.memory : empty;
        }

        let cpuMax = empty;
        let memMax = empty;

        if (d.hasOwnProperty("max")) {
          cpuMax = d.max.hasOwnProperty("cpu") ? d.max.cpu : empty;
          memMax = d.max.hasOwnProperty("memory") ? d.max.memory : empty;
        }

        let cpuDefault = d.hasOwnProperty("default") ? d.default.cpu : empty;
        let memDefault = d.hasOwnProperty("default") ? d.default.memory : empty;

        let cpuRequest = d.hasOwnProperty("defaultRequest") ? d.defaultRequest.cpu : empty;
        let memRequest = d.hasOwnProperty("defaultRequest") ? d.defaultRequest.memory : empty;

        row = (
        <tbody>
          <tr key={`${type}-cpu-${i}`}>
            <td style={{
              textAlign: "center",
              borderBottom: "none",
              fontSize: "25px",
              borderLeft: "solid",
              borderLeftColor: "#0b5ce2"
              }}
            >
              <i
                style={{
                  marginLeft: "-10px",
                  color: "#6a6a6a"
                }}
                className={"glyphicons glyphicons-dashboard"}
              />
            </td>
            <td><strong>CPU</strong></td>
            <td>{type}</td>
            <td>{cpuMin}</td>
            <td>{cpuMax}</td>
            <td>{cpuRequest}</td>
            <td>{cpuDefault}</td>
            <td>{empty}</td>
          </tr>
          <tr key={`${type}-memory-${i}`}>
            <td style={{
              textAlign: "center",
              borderBottom: "none",
              fontSize: "25px",
              borderLeft: "solid",
              borderLeftColor: "#0e46a5"
               }}
            >
               <i
                style={{
                  marginLeft: "-10px",
                  color: "#6a6a6a"
                }}
                className={"glyphicons glyphicons-equalizer-dots"}
               />
            </td>
              <td><strong>Memory</strong></td>
              <td>{type}</td>
              <td>{memMin}</td>
              <td>{memMax}</td>
              <td>{memRequest}</td>
              <td>{memDefault}</td>
              <td>{empty}</td>
          </tr>
        </tbody>
      );

        break;

      case 1: // storage
        let min = d.min.hasOwnProperty("storage") ? d.min.storage : empty;
        let max = d.max.hasOwnProperty("storage") ? d.max.storage : empty;

        row = (
        <tbody>
          <tr key={`${type}-${i}`}>
            <td style={{
                 textAlign: "center",
                 borderBottom: "none",
                 fontSize: "25px",
                 borderLeft: "solid",
                 borderLeftColor: "#6a6a6a"
              }}
              >
               <i
                style={{
                  marginLeft: "-10px",
                  color: "#fff"
                }}
                className={"glyphicons glyphicons-hard-drive"}
               />
            </td>
            <td><strong>Storage</strong></td>
            <td>{type}</td>
            <td>{min}</td>
            <td>{max}</td>
            <td>{empty}</td>
            <td>{empty}</td>
            <td>{empty}</td>
          </tr>
        </tbody>
      );

        break;

      default:
        break;
    }

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
            borderBottom: "none",
            zIndex: "5"
          }
        },
        {
          value: "Resource"
        },
        {
          value: "Type"
        },
        {
          value: "Min"
        },
        {
          value: "Max"
        },
        {
          value: "Default Request"
        },
        {
          value: "Default Limit"
        },
        {
          value: "Max Limit/Request Ratio"
        }
    ];

    let noLimits = [
      {
        max: {
          cpu: "-",
          memory: "-"
        },
        min: {
          cpu: "-",
          memory: "-"
        },
        type: "Pod"
      },
      {
        max: {
          cpu: "-",
          memory: "-"
        },
        min: {
          cpu: "-",
          memory: "-"
        },
        type: "Container"
      }
    ];

    let limits = this.props.data.spec.limits;

    if (limits === null) {
      limits = noLimits;
    }

    let header = this.createHeader(head);
    let body = limits.map((l) => this.createRow(l));

    body = body.reduce(function(a, b) {
      return a.concat(b);
    });

    return (
       <div className="table-parent rq">
        <div className="table-wrapper" >
          <table
            className="default-table rq"
            id="limit-ranges--table">
            <thead>
              {header}
            </thead>
              {body}
          </table>
        </div>
      </div>
    );
  }
}

export default Content;
