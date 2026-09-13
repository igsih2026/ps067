import React from "react";
import useVizStore from "../../store/vizStore";
import PanelToggleButton from "./paneltogglebutton";
import VariableSelector from "./controls/variableselector";
import DepthSlider from "./controls/depthslider";
import TimeSlider from "./controls/timeslider";

export default function LeftPanel() {
  const isOpen = useVizStore((s) => s.leftPanelOpen);

  return (
    <aside className={`panel panel--left ${isOpen ? "panel--open" : "panel--closed"}`}>
      <div className="panel__inner">
        <h2 className="panel__title">Model Data</h2>
        <div className="panel__section">
          <VariableSelector />
        </div>
        <div className="panel__section">
          <DepthSlider />
        </div>
        <div className="panel__section">
          <TimeSlider />
        </div>
      </div>
      <PanelToggleButton side="left" />
    </aside>
  );
}
