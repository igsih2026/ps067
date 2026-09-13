import React from "react";
import useVizStore from "../../../store/vizStore";

const MIN = 1;
const MAX = 2000;
const STEP = 10;

export default function VerticalExaggerationSlider() {
  const verticalExaggeration = useVizStore((s) => s.verticalExaggeration);
  const setVerticalExaggeration = useVizStore((s) => s.setVerticalExaggeration);

  return (
    <div className="control control--slider">
      <div className="control__header">
        <label className="control__label" htmlFor="vexag-slider">
          Vertical Exaggeration
        </label>
        <span className="control__value">{verticalExaggeration}×</span>
      </div>
      <input
        id="vexag-slider"
        type="range"
        className="control__range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={verticalExaggeration}
        onChange={(e) => setVerticalExaggeration(Number(e.target.value))}
      />
    </div>
  );
}