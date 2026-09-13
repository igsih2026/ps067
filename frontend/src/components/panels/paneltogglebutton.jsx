import React from "react";
import useVizStore from "../../store/vizStore";

export default function PanelToggleButton({ side }) {
  const isOpen = useVizStore((s) => (side === "left" ? s.leftPanelOpen : s.rightPanelOpen));
  const setLeftPanelOpen = useVizStore((s) => s.setLeftPanelOpen);
  const setRightPanelOpen = useVizStore((s) => s.setRightPanelOpen);

  const handleToggle = () => {
    if (side === "left") setLeftPanelOpen(!isOpen);
    else setRightPanelOpen(!isOpen);
  };

  const arrow = side === "left" ? (isOpen ? "‹" : "›") : isOpen ? "›" : "‹";

  return (
    <button
      type="button"
      className={`panel-toggle panel-toggle--${side}`}
      onClick={handleToggle}
      aria-label={`${isOpen ? "Collapse" : "Expand"} ${side} panel`}
      aria-expanded={isOpen}
    >
      <span className="panel-toggle__arrow">{arrow}</span>
    </button>
  );
}
