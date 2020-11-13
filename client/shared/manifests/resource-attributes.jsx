"use strict";

import React from "react";
import CsTooltip from "../cs-tooltip";
import MiniBar from "../charts/mini-bar";
import _ from "lodash";
import h from "../../lib/helpers";

// this allows us to add additional attributes to the resource
// cards that are specific to the resource kind
let ResourceAttributes = {};

const getWidth = (value, max) => {
  let width = 0;
  if (max > 0) {
    width = value / max * 100;
  }

  return width;
};

ResourceAttributes.Deployment = (d) => {
  const desired = _.get(d, "spec.replicas", 0);
  const upToDate = _.get(d, "status.updatedReplicas", 0);
  const available = _.get(d, "status.availableReplicas", 0);
  const state = desired === available ? "Ready" : "Not ready";
  const statusAction = () => h.Vent.emit("link", `/datacenter/events?fieldSelector=involvedObject.uid=${d.metadata.uid}`);
  const status = <CsTooltip text={state} action={statusAction} icon={state} />;

  const attributes = {
    content: (
      <>
        <div className="resource-attribute">
          <div className="resource-body-title">State</div>
          {state}{status}
        </div>
        <div className="resource-attribute">
          <div className="resource-body-title">Replica Status</div>
          <div className="resource-bars">
            <MiniBar width={getWidth(upToDate, desired)} prefix="up-to-date" suffix={`${upToDate}/${desired}`} />
            <MiniBar width={getWidth(available, desired)} prefix="available" suffix={`${available}/${desired}`} />
          </div>
        </div>
      </>
    ),
    state: state
  };

  return attributes;
};

ResourceAttributes.Pod = (d) => {
  const containers = _.get(d.spec, "containers", []).length;
  const node = _.get(d.spec, "nodeName", "-");
  const statusPhase = d.status.hasOwnProperty("phase") ? d.status.phase : false;
  const podStatusObj = h.view.helpers.pod.getPodStatus(d, true);
  let state = !podStatusObj.statusProblem ? podStatusObj.status : "Problem";

  if (state === "Pending") {
    state = statusPhase === "Succeeded" ? "Succeeded" : "Pending";
  } else if (state === "Problem") {
    state = "Error";
  }

  const statusDetail = !podStatusObj.statusProblem
    ? `[${podStatusObj.total - podStatusObj.pending}/${podStatusObj.total}] ${podStatusObj.conditions}`
    : podStatusObj.statusMessage;

  const statusAction = () => h.Vent.emit("link", `/datacenter/events?fieldSelector=involvedObject.uid=${d.metadata.uid}`);
  const status = <CsTooltip text={statusDetail} action={statusAction} icon={state} />;

  const attributes = {
    content: (
      <>
        <div className="resource-attribute">
          <div className="resource-body-title">State</div>
          {state}{status}
        </div>
        <div className="resource-attribute">
          <div className="resource-body-title">Containers</div>
          {containers}
        </div>
        <div className="resource-attribute">
          <div className="resource-body-title">Node</div>
          {node}
        </div>
      </>
    ),
    state: state
  };

  return attributes;
};

ResourceAttributes.ReplicaSet = (d) => {
  const desired = _.get(d, "spec.replicas", 0);
  const current = _.get(d, "status.replicas", 0);
  const ready = _.get(d, "status.readyReplicas", 0);
  const state = desired === ready ? "Ready" : "Not ready";
  const statusAction = () => h.Vent.emit("link", `/datacenter/events?fieldSelector=involvedObject.uid=${d.metadata.uid}`);
  const status = <CsTooltip text={state} action={statusAction} icon={state} />;

  const attributes = {
    content: (
      <>
        <div className="resource-attribute">
          <div className="resource-body-title">State</div>
          {state}{status}
        </div>
        <div className="resource-attribute">
          <div className="resource-body-title">Replica Status</div>
          <div className="resource-bars">
            <MiniBar width={getWidth(current, desired)} prefix="current" suffix={`${current}/${desired}`} />
            <MiniBar width={getWidth(ready, desired)} prefix="ready" suffix={`${ready}/${desired}`} />
          </div>
        </div>
      </>
    ),
    state: state
  };

  return attributes;
};

ResourceAttributes.Secret = (d) => {
  const type = _.get(d, "type", "-");
  const data = Object.keys(_.get(d, "data", {})).map((a) => {
    return <div>{a}</div>;
  });

  const attributes = {
    content: (
      <>
        <div className="resource-attribute">
          <div className="resource-body-title">Type</div>
          {type}
        </div>
        <div className="resource-attribute">
          <div className="resource-body-title">{`Data (${data.length})`}</div>
          {data}
        </div>
      </>
    ),
    state: "ready"
  };

  return attributes;
};

export default ResourceAttributes;
