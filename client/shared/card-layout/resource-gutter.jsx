import React from "react";
import { useDrop } from "react-dnd";
import resourceMetadata from "../manifests/resource-metadata";
import ResourceActionSelect from "./resource-action-select";
import _ from "lodash";

const ResourceGutter = () => {
  const [items, setGutter] = React.useState([]);

  const [{ canDrop, isOver }, drop] = useDrop({
    accept: "resource",
    drop: (item) => {
      let currentItems = items;
      let key = {
        metadata: {
          resourceVersion: _.get(item.data, "metadata.resourceVersion", false)
        }
      };

      let idCheck = _.findIndex(currentItems, key);
      if (idCheck === -1) {
        items.push(item.data);
        setGutter(items);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      data: monitor.getDropResult()
    })
  });

  const removeItems = (uids) => {
    uids.map((uid) => {
      let currentItems = Array.from(items);
      let key = {
        metadata: {
          uid: uid
        }
      };

      let index = _.findIndex(currentItems, key);

      if (index !== -1) {
        currentItems.splice(index, 1);
        setGutter(currentItems);
      }
    });
  };

  const isActive = canDrop && isOver;
  let backgroundColor = "#fff";

  if (isActive) {
    backgroundColor = "rgba(139, 195, 74, 0.16)";
  } else if (canDrop) {
    backgroundColor = "#fafa";
  }

  let title = (
    <span>
      <i className="glyphicons glyphicons-plus icon-left" />
        Action zone
      <i className="glyphicons glyphicons-chevron-up icon-right" />
    </span>
  );

  let content = (
    <div className="gutter-empty">
      <i className="glyphicons glyphicons-import" />
      drop resources here..
    </div>
  );

  if (items.length > 0) {
    content = items.map((d, i) => {
      let noIcon = "glyphicons glyphicons-package";
      let icon = _.get(resourceMetadata, `${d.kind}.icon`, noIcon);
      return (
        <div key={i} className="gutter-card">
          <div className="gutter-card-icon">
            <i className={icon} />
          </div>
          <div title={d.metadata.name} className="gutter-card-name">
            {d.metadata.name}
          </div>
          <div
            className="gutter-card-action"
            onClick={() => removeItems([d.metadata.uid])}
          >
            <i className="glyphicons glyphicons-menu-close" />
          </div>
        </div>
      );
    });
  }

  return (
    <div
      className="gutter"
      ref={drop}
      style={{ background: backgroundColor }}
    >
      <div className="gutter-header">
        {title}
      </div>
      <div className="gutter-content">
        {content}
        </div>
      <div className="gutter-footer">
        <ResourceActionSelect />
      </div>
    </div>
  );
};

export default ResourceGutter;
