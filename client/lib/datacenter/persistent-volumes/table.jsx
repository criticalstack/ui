"use strict";

import React from "react";
import h from "../../helpers";
import LabelMaker from "../../../shared/label-maker";
import TableBuilder from "../../../shared/table";
import moment from "moment";

const csStorageTypes = {
  gcePersistentDisk: "GCEPersistentDisk",
  awsElasticBlockStore: "AWSElasticBlockStore",
  nfs: "NFS",
  iscsi: "iSCSI",
  rbd: "RBD (Ceph Block Device)",
  glusterFs: "Glusterfs",
  hostPath: "HostPath"
};

const csTypes = {
  Available: "glyphicons glyphicons-lock-open",
  Bound: "glyphicons glyphicons-lock",
  Released: "glyphicons glyphicons-roundabout",
  Failed: "glyphicons glyphicons-menu-close",
  Unknown: "glyphicons glyphicons-question-sign"
};

class Table extends React.Component {
  createRow(d) {
    let empty = "-";
    let type = "Unknown";
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let status = d.hasOwnProperty("status") ? d.status.phase : "Unknown";
    let statusIcon = csTypes[status];
    let capacity = d.hasOwnProperty("spec") ? d.spec.capacity.storage : empty;
    let accessMode = d.hasOwnProperty("spec") ? d.spec.accessModes[0] : empty;

    let labels = d.metadata.hasOwnProperty("labels") ?
      <LabelMaker scope="pv" data={d.metadata.labels} uid={d.metadata.uid} />
      : <span className="labels-empty">-</span>;

    if (d.hasOwnProperty("spec")) {
      Object.keys(d.spec).map(function(needle) {
        if (csStorageTypes.hasOwnProperty(needle)) {
          type = csStorageTypes[needle];
        }
      });
    }

    let row = {
      id: d.metadata.uid,
      raw: d,
      cells: [
        {
          value: <div
            data-balloon={status}
            data-balloon-pos="up"
            style={{
              textAlign: "center"
            }}>
            <i
              style={{
                color: "#c9c9c9",
                fontSize: "15px",
                textAlign: "center"
              }}
              className={statusIcon}
            />
          </div>
        },
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          value: type
        },
        {
          value: capacity
        },
        {
          value: accessMode
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
    let head = {
      main: [
        {
          disableClick: true,
          value: <i className="glyphicons glyphicons-flash"></i>,
          className: "icon-cell",
          style: {
            width: "65px",
            textAlign: "center"
          }
        },
        {
          value: "Name"
        },
        {
          value: "Type"
        },
        {
          value: "Capacity"
        },
        {
          value: "Access Mode"
        },
        {
          value: "Created"
        },
        {
          value: "Labels"
        }
      ]
    };

    return (
      <div>
        <TableBuilder
          id="persistent-volumes-table"
          route={this.props.route}
          className="default-table"
          head={head}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

export default Table;
