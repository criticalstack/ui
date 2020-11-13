"use strict";
import React from "react";
import h from "../lib/helpers";

class EventList extends React.Component {

  makeEventEntry(events) {

    var formatted = events.map(function(event, i) {
      return (
        <div key={i} className="event-list-entry">
          <span className="event-list-key">
            count:
          </span>
          <span className="event-list-val">
            {event.count}
          </span>
          <span className="event-list-key">
            message:
          </span>
          <span className="event-list-val">
            {event.message}
          </span>
          <span className="event-list-key">
            reason:
          </span>
          <span className="event-list-val">
            {event.reason}
          </span>
          <span className="event-list-key">
            first time:
          </span>
          <span className="event-list-val">
            {h.view.helpers.localTimestamp(event.firstTimestamp)}
          </span>
          <span className="event-list-key">
            last time:
          </span>
          <span className="event-list-val">
            {h.view.helpers.localTimestamp(event.lastTimestamp)}
          </span>
        </div>
      );
    });

    return formatted;
  }

  render() {
    var events = this.makeEventEntry(this.props.data);

    return (
      <div className="event-list-container">
        {events}
      </div>
    );
  }
}

export default EventList;
