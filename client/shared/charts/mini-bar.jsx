import React from "react";

export default function MiniBar(props) {
  let width = props.width > 100 ? 100 : props.width;
  let barColor = props.width === 100 ? "#1473e6" : "#f04336";
  let suffixColor = props.width === 100 ? "#6e6e6e" : "#f04336";

  return (
    <div
      style={{
        marginBottom: "5px"
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          color: "#6e6e6e",
          fontSize: "12px"
        }}
      >
        <div>
          {props.prefix}
        </div>
        <div
          style={{
            color: suffixColor
          }}
        >
          {props.suffix}
        </div>
      </div>
      <div
        style={{
          height: "6px",
          borderRadius: "3px",
          backgroundColor: "#e1e1e1",
        }}>
        <div
          style={{
            width: `${width}%`,
            height: "6px",
            borderRadius: "3px",
            backgroundColor: barColor
          }}>
        </div>
      </div>
    </div>
  );
}

