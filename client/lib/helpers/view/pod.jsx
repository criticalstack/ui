"use strict";

import React from "react";
import _ from "lodash";
import moment from "moment";
import Tooltip from "react-tooltip";
import h from "./common";

var PodHelpers = {

  getPodStatus(pod, textOnly) {
    var s = this.getPodPhase(pod);
    var c = this.renderPodStatusState(pod, textOnly);

    var total = pod.status.containerStatuses ? pod.status.containerStatuses.length : 0;
    var pending = 0;

    var statusMessage = _.get(pod, "status.message", false);
    var statusReason = _.get(pod, "status.reason", false);
    var statusProblem = statusReason ? true : false;

    _.each(pod.status.containerStatuses, function(data) {
      if (data && data.hasOwnProperty("ready")) {
        if (!data.ready) {
          pending++;
        }
      } else {
        pending++;
      }
    });

    if (pending > 0 && s !== "Terminating") {
      s = "Pending";
    }

    return {
      pod: pod,
      status: s,
      conditions: c,
      total: total,
      pending: pending,
      statusMessage: statusMessage,
      statusReason: statusReason,
      statusProblem: statusProblem
    };
  },

  getPodPhase(pod) {
    if (pod.metadata.hasOwnProperty("deletionTimestamp")) {
      return "Terminating";
    }

    return pod.status.phase;
  },

  renderPodStatusState(pod, textOnly) {
    var html = [];

    if (pod.metadata.hasOwnProperty("deletionTimestamp")) {

      if (textOnly) {
        html.push("Terminating");
      } else {
        html.push((
          <span className="node-pod-status" key="node-pod-status-terminating">
            Terminating
          </span>
        ));
      }

      return html;
    }

    if (pod.hasOwnProperty("status")) {
      if (pod.status.hasOwnProperty("containerStatuses")) {
        _.each(pod.status.containerStatuses, function(status, i) {
          if (status.state.hasOwnProperty("waiting")) {

            if (textOnly) {
              if (status.state.waiting.hasOwnProperty("message")) {
                html.push(`[${status.name}] ${h.truncate(status.state.waiting.message, 100)}`);
              }

              if (status.state.waiting.hasOwnProperty("reason")) {
                html.push(`[${status.name}] ${h.truncate(status.state.waiting.reason, 100)}`);
              }
            } else {
              html.push((
                <div className="node-pod-status" key={`node-pod-status-${status.name}-${i}`}>
                  <strong>{status.name}</strong>
                  :
                  {h.truncate(status.state.waiting.message, 100)}
                </div>
              ));
            }

          }
        });
      }
    }

    if (html.length <= 0) {
      if (textOnly) {
        html.push(`${pod.status.phase}`);
      } else {
        html.push((
          <span className="node-pod-status" key={`node-pod-status-${pod.status.phase}`}>
            {pod.status.phase}
          </span>
        ));
      }
    }

    return html;
  },

  createPodEvents(pod) {
    var errorCount = 0;
    var errorDetail = [];

    if (pod.hasOwnProperty("events") && (pod.events && pod.events.length > 0)) {
      pod.events.map(function(e, i) {
        if (e.type === "Warning") {
          errorCount++;
        }

        errorDetail.push(
          <tr key={i}>
            <td>{e.type}</td>
            <td>{e.reason}</td>
            <td>{e.message}</td>
            <td>{moment(e.firstTimestamp).format("YYYY-MM-DD HH:mm:ss")}</td>
            <td>{moment(e.lastTimetamp).format("YYYY-MM-DD HH:mm:ss")}</td>
          </tr>
        );
      });
    }

    var events = (errorCount > 0 ?
      <div
        data-tip
        data-for={`tip-${pod.metadata.name}`}
        data-place="right"
        data-class="tooltip-conditions">
        <Tooltip
          id={`tip-${pod.metadata.name}`}
          effect="float">
          <table>
            <thead>
              <tr>
                <th className="type">Type</th>
                <th className="reason">Reason</th>
                <th className="message">Message</th>
                <th className="time">First</th>
                <th className="time">Last</th>
              </tr>
            </thead>
            <tbody>
              {errorDetail}
            </tbody>
          </table>
        </Tooltip>
        <i style={{fontSize: "20px"}} className="glyphicons glyphicons-circle-empty-alert warning" />
      </div>
      :
      false
    );

    return events;

  }

};

export default PodHelpers;
