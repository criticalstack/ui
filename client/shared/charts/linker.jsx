import React, { useState } from "react";
import ReactFlow, { removeElements, addEdge } from "react-flow-renderer";

const onLoad = (reactFlowInstance) => reactFlowInstance.fitView();

const onNodeMouseEnter = (event, node) => console.log("mouse enter:", node);
const onNodeMouseMove = (event, node) => console.log("mouse move:", node);
const onNodeMouseLeave = (event, node) => console.log("mouse leave:", node);
const onNodeContextMenu = (event, node) => {
  event.preventDefault();
  console.log("context menu:", node);
};

const basePositions = {
  Deployment: { x: 0, y: 0, sp: null, tp: "bottom" },
  Pod: { x: 500, y: false, sp: "right", tp: "left" },
  ReplicaSet: { x: 0, y: 75, sp: "right", tp: "top" }
};

const makeNodes = (data) => {
  let nodeData = [];
  data.map((d) => {
    let source = {
      id: d.source.uid,
      sourcePosition: basePositions.kind.sp,
      targetPosition: basePositions.kind.tp,
      data: {
        label: d.source.name,
        position: {
          x: basePositions.kind.x,
          y: basePositions.kind.y
        }
      }
    };

    let target = {
      id: d.target.uid,
      sourcePosition: basePositions.kind.sp,
      targetPosition: basePositions.kind.tp,
      data: {
        label: d.target.name,
        position: {
          x: basePositions.kind.x,
          y: basePositions.kind.y
        }
      }
    };

    let sEdge = {

    };

    let tEdge = {

    };

    nodeData.push(source, target, sEdge, tEdge);
  });

  return nodeData;
};

const Linker = (props) => {
  console.log(props);
  const nodes = makeNodes(props.data);
  const [elements, setElements] = useState(nodes);
  const onElementsRemove = (elementsToRemove) => setElements((els) => removeElements(elementsToRemove, els));
  const onConnect = (params) => setElements((els) => addEdge(params, els));

  return (
    <ReactFlow
      key={1}
      style={{width: "100vw", height: "100vh"}}
      elements={elements}
      onElementsRemove={onElementsRemove}
      onConnect={onConnect}
      onLoad={onLoad}
      selectNodesOnDrag={false}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseMove={onNodeMouseMove}
      onNodeMouseLeave={onNodeMouseLeave}
      onNodeContextMenu={onNodeContextMenu}
    >
    </ReactFlow>
  );
};

export default Linker;
