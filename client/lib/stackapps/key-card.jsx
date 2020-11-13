import React from "react";
import { useDrag } from "react-dnd";
import h from "../helpers";
import moment from "moment";
import resourceMetadata from "../../shared/manifests/resource-metadata";
import _ from "lodash";
import LabelMaker from "../../shared/label-maker";
import SelectorMaker from "../../shared/selector-maker";
import HoverMenu from "../../shared/hover-menu";
import ClipboardEntry from "../../shared/clipboard-entry";

const KeyCard = ({ data, onContextMenu, isLocked }) => {
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

  let opacity = isDragging ? 0.4 : 1;
  let name = data.metadata.name;
  let kind = data.kind;
  let keyCopy = (
    <ClipboardEntry
      copyText={data.data}
      toolTip="Copy key"
      message="Key"
      icon={true}
      uniqueId={`copy-${name}`}
    />
  );

  let noIcon = "glyphicons glyphicons-package";
  let icon = _.get(resourceMetadata, `${kind}.icon`, noIcon);
  let type = _.get(resourceMetadata, `${kind}.menu`, false);
  let appIcon = <i className={`${icon} resource-key`} />;
  let created = moment(data.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
  let uptime = h.view.helpers.uptime(created);
  let version = data.metadata.resourceVersion;
  let labels = "";
  let selectors = "";
  let menuIcon = menuIsVisible
    ? <HoverMenu data={data} type={type} variant="card1" />
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
  }

  let cursor = "context-menu";

  if (canDrag) {
    cursor = "move";
  }

  let card = (
    <div
      className="resource-key-parent"
      ref={drag}
      style={{
        opacity,
        cursor
      }}
      onContextMenu={(e) => onContextMenu(e, data)}
      onMouseOver={() => setMenuIsVisible(true)}
      onMouseLeave={() => setMenuIsVisible(false)}
    >
      <div className="resource-key">
        <div className="resource-key-header">
          {menuIcon}
          {appIcon}
        </div>
        <div className="resource-key-body">
          <div className="resource-attribute">
            <div className="resource-body-title">Name</div>
            {name}
          </div>
          <div className="resource-attribute">
            <div className="resource-body-title">Kind</div>
            {kind}
            {keyCopy}
          </div>
          {labels}
          {selectors}
        </div>

      </div>
      <div className="resource-key-footer">
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

export default KeyCard;
