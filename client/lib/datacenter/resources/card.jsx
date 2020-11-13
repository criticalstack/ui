import React from "react";
import { useDrag } from "react-dnd";
import h from "../../helpers";
import moment from "moment";
import resourceMetadata from "../../../shared/manifests/resource-metadata";
import _ from "lodash";
import LabelMaker from "../../../shared/label-maker";
import SelectorMaker from "../../../shared/selector-maker";
import HoverMenu from "../../../shared/hover-menu";
import ResourceAttributes from "../../../shared/manifests/resource-attributes";

const Card = ({ data, onContextMenu, isLocked }) => {
  const [menuIsVisible, setMenuIsVisible] = React.useState(false);
  const [{ isDragging, canDrag }, drag] = useDrag({
    item: {
      data,
      type: "resource"
    },
    canDrag: isLocked,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const states = {
    "Ready": "ready",
    "Not ready": "error",
    "Pending": "error",
    "Running": "ready",
    "Problem": "error"
  };

  let opacity = isDragging ? 0.4 : 1;
  let name = data.metadata.name;
  let kind = data.kind;
  let noIcon = "glyphicons glyphicons-package";
  let icon = _.get(resourceMetadata, `${kind}.icon`, noIcon);
  let type = _.get(resourceMetadata, `${kind}.menu`, false);
  let attributes = typeof ResourceAttributes[kind] === "function"
    ? ResourceAttributes[kind](data)
    : false;
  let hasBody = typeof attributes === "object" ? true : false;
  let additions = attributes ? attributes.content : null;
  let hasState = _.get(attributes, "state", false);
  let state = hasState ? _.get(states, attributes.state, "") : "";
  let appIcon = <i className={`${icon} ${state}`} />;
  let created = moment(data.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
  let uptime = h.view.helpers.uptime(created);
  let version = data.metadata.resourceVersion;
  let generation = data.metadata.generation || 0;
  let labels = "";
  let selectors = "";
  let menuIcon = menuIsVisible
    ? <HoverMenu data={data} type={type} />
    : null;

  if (_.get(data, "metadata.labels")) {
    labels = (
      <div className="resource-labels">
        <div className="resource-body-title">Labels</div>
        <LabelMaker
          native
          data={data.metadata.labels}
          uid={data.metadata.uid}
        />
      </div>
    );
    hasBody = true;
  }

  if (_.get(data, "spec.selector")) {
    selectors = (
      <div className="resource-selectors">
        <div className="resource-body-title">Selectors</div>
        <SelectorMaker
          native
          data={data.spec.selector}
          uid={data.metadata.uid}
        />
      </div>
    );
    hasBody = true;
  }

  let cursor = "context-menu";

  if (canDrag) {
    cursor = "move";
  }

  let card = (
    <div
      className="resource"
      ref={drag}
      style={{
        opacity,
        cursor
      }}
      data-error={state}
      data-uid={data.metadata.uid}
      onContextMenu={(e) => onContextMenu(e, data)}
      onMouseOver={() => setMenuIsVisible(true)}
      onMouseLeave={() => setMenuIsVisible(false)}
    >
      <div className="resource-header">
        {appIcon}
        <div className="resource-header-title">
          <div className="resource-header-resource">
            <div className="kind">{kind}</div>
            <div className="name">{name}</div>
          </div>
          {menuIcon}
        </div>
      </div>
        <div
          className="resource-body"
          tabindex="0"
        >
        {additions}
        {labels}
        {selectors}
        {!hasBody ?
          <div className="resource-body-overlay">
            {appIcon}
          </div> : null
        }
      </div>
      <div className="resource-footer">
        <div className="resource-stamp">
          <i className="glyphicons glyphicons-clock" />
          {uptime}
        </div>
        <div className="resource-stamp">
          <i className="glyphicons glyphicons-modal-window" />
          {generation}.{version}
        </div>
      </div>
    </div>
  );

  return card;
};

export default Card;

