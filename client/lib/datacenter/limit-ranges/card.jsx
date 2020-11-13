import React from "react";
import { useDrag } from "react-dnd";
import h from "../../helpers";
import moment from "moment";
import resourceMetadata from "../../../shared/manifests/resource-metadata";
import _ from "lodash";
import LabelMaker from "../../../shared/label-maker";
import SelectorMaker from "../../../shared/selector-maker";
import Content from "./content";

const Card = ({ data, onContextMenu }) => {
  const [{ isDragging, canDrag }, drag] = useDrag({
    item: {
      data,
      type: "resource"
    },
    canDrag: false,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  let opacity = isDragging ? 0.4 : 1;
  let name = data.metadata.name;
  let kind = data.kind;
  let noIcon = "glyphicons glyphicons-package";
  let icon = _.get(resourceMetadata, `${kind}.icon`, noIcon);
  let appIcon = <i className={icon} />;
  let created = moment(data.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
  let uptime = h.view.helpers.uptime(created);
  let version = data.metadata.resourceVersion;
  let labels = "";
  let selectors = "";
  let hasBody = false;
  let content = Object.keys(data.spec).length > 0 ? <Content data={data} /> : "No limit ranges";

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
      className="resource lr"
      ref={drag}
      style={{
        opacity,
        cursor
      }}
      onContextMenu={(e) => onContextMenu(e, data)}
    >
      <div className="resource-header rq">
        {appIcon}
        <div className="resource-header-title rq">
          {name}
        </div>
      </div>
      <div className="resource-body rq">
        {content}
        {labels}
        {selectors}
        {!hasBody ?
          <div className="resource-body-overlay rq">
            {appIcon}
          </div> : null
        }
      </div>
      <div className="resource-footer rq">
        <div className="resource-stamp">
          <i className="glyphicons glyphicons-clock" />
          {uptime}
        </div>
        <div className="resource-stamp">
          <i className="glyphicons glyphicons-modal-window" />
          v.{version}
        </div>
      </div>
    </div>
  );

  return card;
};

export default Card;

