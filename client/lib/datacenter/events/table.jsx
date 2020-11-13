"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import resourceMetadata from "../../../shared/manifests/resource-metadata";
import h from "../../helpers";
import moment from "moment";
import _ from "lodash";

const csTypeIcons = {
  "Normal": {
    "icon": "glyphicons glyphicons-circle-empty-info",
    "color": "#fff"
  },
  "Warning": {
    "icon": "glyphicons glyphicons-bell-ringing",
    "color": "#fff"
  },
  "Missing": {
    "icon": "glyphicons glyphicons-circle-empty-question",
    "color": "#fff",
  }
};

class EventTable extends React.Component {
  parseObject(obj) {
    let self = this;
    if (obj === null) {
      return false;
    }

    let html = Object.keys(obj).map((o, i) => {
      if (typeof obj[o] === "object") {
        if (obj[o] === null) {
          return null;
        }
        return (
          <span key={`${o}-${i}`}>
            <span className="e-root-key">
              {o}:
            </span>
            {self.parseObject(obj[o])}
          </span>
        );
      } else {
        let value = typeof obj[o] === "object" ? "" : obj[o];
        return (
          <span key={`${o}-${i}`}>
            <span className="e-key">
              {o}=
            </span>
            <span className="e-val">
              {value === "" ? "empty" : value}
            </span>
          </span>
        );
      }
    });

    return html;
  }

  createRow(event) {
    let typeIcon = csTypeIcons.hasOwnProperty(event.type) ? csTypeIcons[event.type].icon : csTypeIcons.Missing.icon;
    let typeColor = csTypeIcons.hasOwnProperty(event.type) ? csTypeIcons[event.type].color : csTypeIcons.Missing.color;
    let noIcon = "glyphicons glyphicons-package";
    let kindIcon = _.get(resourceMetadata, `${event.involvedObject.kind}.icon`, noIcon);
    let name = _.get(event, "involvedObject.name", "empty");
    let count = _.get(event, "count", 1);
    let first = typeof event.firstTimestamp !== "object"
      ? moment(event.firstTimestamp).format("YYYY-MM-DD HH:mm:ss")
      : "empty";
    let last = typeof event.lastTimestamp !== "object"
      ? moment(event.lastTimestamp).format("YYYY-MM-DD HH:mm:ss")
      : "empty";
    let reason = event.reason;
    let message = event.message;

    let parsed = this.parseObject(event);

    let row = {
      id: event.metadata.name,
      raw: event,
      filter: [event.metadata.name, event.reason],
      cells: [
        {
          value: <div
            data-balloon={event.type}
            data-balloon-pos="right"
            style={{
              zIndex: 100
            }}
          >
            <i
              style={{
                color: typeColor,
                fontSize: "28px",
              }}
              className={typeIcon}
            />
          </div>,
          style: {
            textAlign: "center",
            backgroundColor: "#0B5CE2",
            borderBottom: "none",
            fontSize: "20px",
            paddingLeft: 0,
            paddingRight: 0
          }
        },
        {
          value: <div className="e-parent">
            <span className="e-key">
              <i className={kindIcon} />
              name=
            </span>
            <span
              className="e-host-val"
              onClick={function() {
                h.Vent.emit("link", `/datacenter/${h.view.helpers.routeForKind(event.involvedObject.kind)}?fieldSelector=metadata.name=${name}`);
                return false;
              }}
            >
              {name}
            </span>
            <span className="e-key">
              count=
            </span>
            <span key="count" className="e-val">
              {count}
            </span>
            <span className="e-key">
              reason=
            </span>
            <span key="reason" className="e-val">
              {reason}
            </span>
            <span className="e-key">
              last timestamp=
            </span>
            <span key="last" className="e-val">
              {last}
            </span>
            <span className="e-key">
              first timestamp=
            </span>
            <span key="first" className="e-val">
              {first}
            </span>
            <span className="e-key">
              message=
            </span>
            <span key="message" className="e-val">
              {message}
            </span>
            {parsed}
          </div>
        }
      ]
    };

    return row;
  }

  render() {
    let head = {
      main: [
        {
          disableClick: true,
          value: <i className="glyphicons glyphicons-flash"></i>,
          className: "icon-cell",
          style: {
            width: "40px",
            textAlign: "center",
            backgroundColor: "#0E46A5",
            color: "#fff",
            borderBottom: "none"
          }
        },
        {
          value: "Event"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="events-table"
          className="default-table"
          head={head}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={false}
          noContextMenu
        />
      </div>
    );
  }
}

export default EventTable;
