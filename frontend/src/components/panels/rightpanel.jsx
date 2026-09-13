import React from "react";
import useVizStore from "../../store/vizStore";
import PanelToggleButton from "./paneltogglebutton";
import ColorbarEditor from "./controls/colorbareditor";
import OpacitySlider from "./controls/opacityslider";
import VerticalExaggerationSlider from "./controls/verticalexaggerationslider";

export default function RightPanel() {
  const isOpen = useVizStore((s) => s.rightPanelOpen);

  return (
    <aside className={`panel panel--right ${isOpen ? "panel--open" : "panel--closed"}`}>
      <PanelToggleButton side="right" />
      <div className="panel__inner">
        <h2 className="panel__title">Display</h2>
        <div className="panel__section">
          <ColorbarEditor />
        </div>
        <div className="panel__section">
          <OpacitySlider />
        </div>
        <div className="panel__section">
          <VerticalExaggerationSlider />
        </div>
      </div>
    </aside>
  );
}