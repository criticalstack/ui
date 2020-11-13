"use strict";

import React from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import Tooltip from "react-tooltip";
import h from "../lib/helpers";

class ClipboardEntry extends React.Component {
  render() {
    const props = this.props;
    const icon = (
      <>
        <Tooltip id={`t0-${props.uniqueId}`} type="dark" place="top" effect="float">
          {props.toolTip || props.displayText}
        </Tooltip>
        <CopyToClipboard text={props.copyText}>
          <span
            className="tooltip"
            data-tip
            data-for={`t0-${props.uniqueId}`}
            onClick={(e) => {
              e.stopPropagation();
              h.Vent.emit("notification", {
                message: `${props.message} was copied to clipboard`
              });
            }}
          >
            <i className="glyphicons glyphicons-copy copy-icon" />
          </span>
        </CopyToClipboard>
      </>
    );

    const text = (
      <span
        style={{
          wordBreak: "break-all"
        }}
        className="clipboard-text">
        <span className="tooltip" data-tip data-for={`t0-${props.uniqueId}`}>
          <div style={props.style}>
            {props.displayText}
          </div>

          <Tooltip id={`t0-${props.uniqueId}`} type="dark" place="top" effect="float">
            {props.toolTip || props.displayText}
          </Tooltip>
        </span>
        <span
          className="clipboard-icon-container"
          onClick={(e) => {
            h.view.helpers.stopProp(e);

            var message = props.secret ? "item" : props.copyText;
            if (props.hasOwnProperty("message")) {
              message = props.message;
            }

            h.Vent.emit("notification", {
              message: `${h.view.helpers.truncate(message, 20)} was copied to clipboard`
            });
          }}>
          <CopyToClipboard text={props.copyText}>
            <span className="tooltip" data-tip data-for={`t1-${props.uniqueId}`}>
              <i className="glyphicons glyphicons-copy copy-icon" />
            </span>
          </CopyToClipboard>
        </span>
      </span>

    );

    return props.hasOwnProperty("icon") ? icon : text;
  }
}

export default ClipboardEntry;
