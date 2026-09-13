import useCesiumViewer from "../../hooks/useCesiumViewer";
import useVizStore from "../../store/vizStore";

export default function CesiumViewer() {
  const {
    anchorPoint,
    clickMessage,
    column,
    columnError,
    columnLoading,
    containerRef,
    depth,
    mode,
    releaseAnchor,
    setDepth,
  } = useCesiumViewer();
  const setMode = useVizStore((state) => state.setMode);

  const steps = column?.steps ?? [];
  const selectedStep = steps.find((step) => Number(step.depth) === Number(depth));

  const handleModeChange = (nextMode) => {
    if (nextMode === "explore") {
      releaseAnchor();
      return;
    }
    setMode("inspect");
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        role="group"
        aria-label="Visualization mode"
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          display: "flex",
          padding: "0.2rem",
          gap: "0.2rem",
          background: "rgba(7, 24, 43, 0.86)",
          borderRadius: "0.45rem",
          boxShadow: "0 0.35rem 1rem rgba(0, 0, 0, 0.22)",
        }}
      >
        {["explore", "inspect"].map((option) => {
          const active = mode === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => handleModeChange(option)}
              style={{
                border: 0,
                borderRadius: "0.3rem",
                padding: "0.45rem 0.75rem",
                color: active ? "#082032" : "#e8f1f8",
                background: active ? "#f4c95d" : "transparent",
                cursor: "pointer",
                fontWeight: 700,
                textTransform: "capitalize",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
      {mode === "explore" && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: "4.3rem",
            left: "1rem",
            padding: "0.45rem 0.65rem",
            color: "#e8f1f8",
            background: "rgba(7, 24, 43, 0.72)",
            borderRadius: "0.3rem",
            fontSize: "0.8rem",
            pointerEvents: "none",
          }}
        >
          Explore renderer placeholder
        </div>
      )}
      {clickMessage && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.6rem 0.9rem",
            color: "#fff",
            background: "rgba(0, 0, 0, 0.72)",
            borderRadius: "0.25rem",
            pointerEvents: "none",
          }}
        >
          {clickMessage}
        </div>
      )}
      {mode === "inspect" && anchorPoint && (
        <div
          style={{
            position: "absolute",
            right: "1rem",
            bottom: "1rem",
            width: "min(20rem, calc(100vw - 2rem))",
            padding: "1rem",
            color: "#102a43",
            background: "rgba(255, 255, 255, 0.94)",
            borderRadius: "0.5rem",
            boxShadow: "0 0.5rem 1.5rem rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
            Inspect column
          </div>
          <label style={{ display: "block", fontSize: "0.85rem" }}>
            Depth: {depth} m
            <input
              aria-label="Inspect depth"
              type="range"
              min="0"
              max="2000"
              step="100"
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
              style={{ display: "block", width: "100%", marginTop: "0.5rem" }}
            />
          </label>
          {columnLoading && <div>Loading column…</div>}
          {columnError && <div>Column unavailable.</div>}
          {selectedStep && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", lineHeight: 1.5 }}>
              {[
                ["Temperature", "temperature", "°C"],
                ["Salinity", "salinity", "PSU"],
                ["Dissolved O₂", "dissolved_o2", "µmol/kg"],
                ["Nitrate", "nitrate", "µmol/kg"],
                ["Phosphate", "phosphate", "µmol/kg"],
                ["Silicate", "silicate", "µmol/kg"],
              ].map(([label, key, units]) => (
                <div key={key}>
                  <strong>{label}:</strong> {selectedStep[key]} {units}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
