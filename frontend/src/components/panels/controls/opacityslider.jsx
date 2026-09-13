import React from "react";
import useVizStore from "../../../store/vizStore";

export default function OpacitySlider() {
  const opacity = useVizStore((s) => s.opacity);
  const setOpacity = useVizStore((s) => s.setOpacity);

  return (
    <div className="control control--slider">
      <div className="control__header">
        <label className="control__label" htmlFor="opacity-slider">
          Opacity
        </label>
        <span className="control__value">{Math.round(opacity * 100)}%</span>
      </div>
      <input
        id="opacity-slider"
        type="range"
        className="control__range"
        min={0}
        max={1}
        step={0.01}
        value={opacity}
        onChange={(e) => setOpacity(Number(e.target.value))}
      />
    </div>
  );
}
