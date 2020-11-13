import React from "react";
import { useDrag } from "react-dnd";
import h from "../helpers";
import moment from "moment";
import resourceMetadata from "../../shared/manifests/resource-metadata";
import _ from "lodash";
import LabelMaker from "../../shared/label-maker";
import SelectorMaker from "../../shared/selector-maker";
import HoverMenu from "../../shared/hover-menu";
import CsTooltip from "../../shared/cs-tooltip";

const SubCard = ({ data, isLocked, hasDrifted, currentResource }) => {
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
  let version = data.metadata.resourceVersion;
  let newVersion = _.get(currentResource, "metadata.resourceVersion", false);
  let noIcon = "glyphicons glyphicons-package";
  let icon = _.get(resourceMetadata, `${kind}.icon`, noIcon);
  let appIcon = <i className={icon} />;
  let cursor = "default";

  delete data.metadata.managedFields;
  if (currentResource) {
    delete currentResource.metadata.managedFields;
  }

  const onClickViewDiff = () => {
    h.Vent.emit("layout:form-dialog-advanced:open", {
      title: "View Changes",
      icon: "glyphicons glyphicons-layers-cogwheel",
      bodyClass: "dialog-body-editor",
      dialogClass: "editorLarge",
      data: [data, currentResource],
      diffModeEnabled: true,
      format: "yaml",
      readOnly: true
    });
  };

  if (canDrag) {
    cursor = "move";
  }

  let card = (
    <div
      className={"resource small " + (hasDrifted ? "drift" : "")}
      ref={drag}
      style={{
        opacity,
        cursor
      }}
    >
      <div className="resource-header small">
        {appIcon}
        <div className="resource-header-title small">
          {name}
        </div>
      </div>
      <div className="resource-body small">
        <div className="resource-kind small">
          <div className="resource-body-title small">Kind</div>
            {kind}
        </div>
        <div className="resource-body-overlay small">
          {appIcon}
        </div>
      </div>
      <div className={"resource-footer small " + (hasDrifted ? "drift" : "")}>
        <div className="resource-stamp small">
        </div>
        <div className="resource-stamp small">
          <i className="glyphicons glyphicons-modal-window" />
          v.{version}
        </div>
      </div>
      {hasDrifted && newVersion && <div className="resource-footer-drift" style={{cursor: "pointer"}} onClick={onClickViewDiff}>
        <div className="resource-stamp">
        <i className="glyphicons glyphicons-switch" />
          View Changes
        </div>
        <div className="resource-stamp">
          <i className="glyphicons glyphicons-modal-window" />
          v.{newVersion}
        </div>
      </div>}
      {hasDrifted && !newVersion && <div className="resource-footer-drift">
        <div className="resource-stamp">
          Resource Deleted
        </div>
      </div>}
    </div>
  );

  return card;
};

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

  let opacity = isDragging ? 0.4 : 1;
  let name = data.metadata.name;
  let kind = data.kind;
  let noIcon = "glyphicons glyphicons-package";
  let icon = _.get(resourceMetadata, `${kind}.icon`, noIcon);
  let type = _.get(resourceMetadata, `${kind}.menu`, false);
  let appIcon = <i className={icon} />;
  let created = moment(data.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
  let uptime = h.view.helpers.uptime(created);
  let version = data.metadata.resourceVersion;
  let state;
  let conditions = _.get(data, "status.conditions", false);
  let signatures = _.get(data, "spec.signatures", false);
  let signedBy = "-";
  if (signatures) {
    let signers = Object.keys(signatures).map((s) => {
      return <span>{s}</span>;
    });

    signedBy = (
      <div
        style={{
          display: "flex",
          flexDirection: "column"
        }}
      >
        {signers}
      </div>
    );
  }

  let readyStatusObj = _.find(conditions, d => d.type === "Ready");
  let readyStatus = _.get(readyStatusObj, "status", false);
  let deploymentFailedObj = _.find(conditions, d => d.type === "DeploymentFailed");
  let deploymentFailedStatus = _.get(deploymentFailedObj, "status", false);
  let updatingStatusObj = _.find(conditions, d => d.type === "Updating");
  let updatingStatus = _.get(updatingStatusObj, "status", false);
  let healthyStatusObj = _.find(conditions, d => d.type === "Healthy");
  let healthyStatus = _.get(healthyStatusObj, "status", false);

  if (deploymentFailedStatus === "True") {
    state = "Deployment Failed";
  } else if (updatingStatus === "True") {
    state = "Updating";
  } else if (readyStatus === "True") {
    state = "Ready";
  } else {
    state = "Not Ready";
  }

  let healthy;
  let healthyIcon;

  if (healthyStatus === "True") {
    healthy = "OK";
    healthyIcon = <CsTooltip text={healthy} icon="Ready" />;
  } else if (healthyStatus === "Unknown") {
    healthy = "Unknown";
    healthyIcon = null;
  } else {
    healthy = "Not Healthy";
    healthyIcon = <CsTooltip text={healthy} icon="Error" />;
  }

  let statusMsg = state;

  let status = <CsTooltip text={statusMsg} icon="Ready" />;

  if (state !== "Ready") {
    let statusAction = () => h.Vent.emit("link", `/datacenter/events?fieldSelector=involvedObject.uid=${data.metadata.uid}`);
    appIcon = <i className={`${icon} offline`} />;
    status = <CsTooltip text={statusMsg} action={statusAction} icon="Error" />;
  }

  let revision = _.get(data, "spec.revision", "-");
  let labels = "";
  let selectors = "";
  let hasBody = false;
  let subCardData = _.get(data, "status.originalResources", []);
  let subCards = [];

  subCardData.map((manifest, i) => {
    let hasDrifted = false;
    let originalResourceUid = manifest.metadata.uid;
    let originalResourceVersion = manifest.metadata.resourceVersion;
    let currentResource = _.get(data, "status.resources", []).find(d => d.metadata.uid === originalResourceUid);

    // if currentResource is false, that means the resource has been deleted
    if (!currentResource) {
      hasDrifted = true;
      subCards.push(<SubCard key={i} data={manifest} isLocked={false} hasDrifted={hasDrifted} currentResource={currentResource}/>);
    } else {
      let currentResourceVersion = currentResource.metadata.resourceVersion;

      if (originalResourceVersion !== currentResourceVersion) {
        hasDrifted = true;
      }

      if (manifest.kind === "Deployment") {
        let originalGeneration = manifest.metadata.generation;
        let currentGeneration = currentResource.metadata.generation;
        hasDrifted = originalGeneration === currentGeneration ? false : true;
      }

      subCards.push(<SubCard key={i} data={manifest} isLocked={false} hasDrifted={hasDrifted} currentResource={currentResource}/>);
    }
  });
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
      onContextMenu={(e) => onContextMenu(e, data)}
      onMouseOver={() => setMenuIsVisible(true)}
      onMouseLeave={() => setMenuIsVisible(false)}
    >
      <div className="resource-header">
        {appIcon}
        <div className="resource-header-title">
          {name}
          {menuIcon}
        </div>
      </div>
      <div className="resource-body">
        <div className="resource-attribute">
          <div className="resource-body-title">Kind</div>
          {kind}
        </div>
        <div className="resource-attribute">
          <div className="resource-body-title">State</div>
            <div
              style={{
                display: "flex",
                alignItems: "center"
              }}
            >
              {state}{status}
            </div>
        </div>
        {state === "Ready" ?
          <div className="resource-attribute">
            <div className="resource-body-title">Healthy</div>
          <div
            style={{
              display: "flex",
              alignItems: "center"
            }}
            >
            {healthy}{healthyIcon}
          </div>
          </div> : null
        }
        <div className="resource-attribute">
          <div className="resource-body-title">Revision</div>
          {revision}
        </div>
        <div className="resource-attribute">
          <div className="resource-body-title">Signed by</div>
          {signedBy}
        </div>
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
          v.{version}
        </div>
      </div>
    </div>
  );

  return (
    <div className="resource-parent">
      <div className="resources">
        {card}
        {subCards}
      </div>
    </div>
  );
};

export default Card;

