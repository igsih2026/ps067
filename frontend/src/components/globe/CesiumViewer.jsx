import useCesiumViewer from "../../hooks/useCesiumViewer";

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
    setDepth,
  } = useCesiumViewer();

  const steps = column?.steps ?? [];
  const selectedStep = steps.find((step) => Number(step.depth) === Number(depth));

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
