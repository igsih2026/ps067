import React from "react";
import useVizStore from "../../../store/vizStore";

const MIN_DEPTH = 0;
const MAX_DEPTH = 2000;
const STEP = 100;

export default function DepthSlider() {
  const depth = useVizStore((s) => s.depth);
  const setDepth = useVizStore((s) => s.setDepth);

  return (
    <div className="control control--slider">
      <div className="control__header">
        <label className="control__label" htmlFor="depth-slider">
          Depth
        </label>
        <span className="control__value">{depth} m</span>
      </div>
      <input
        id="depth-slider"
        type="range"
        className="control__range"
        min={MIN_DEPTH}
        max={MAX_DEPTH}
        step={STEP}
        value={depth}
        onChange={(e) => setDepth(Number(e.target.value))}
      />
      <div className="control__range-labels">
        <span>{MIN_DEPTH} m</span>
        <span>{MAX_DEPTH} m</span>
      </div>
    </div>
  );
}