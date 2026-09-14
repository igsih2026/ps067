import { useEffect, useRef } from "react";
import useCesiumViewer from "../../hooks/useCesiumViewer";
import useVizStore from "../../store/vizStore";

export default function CesiumViewer() {
  const {
    activateExplore,
    anchorPoint,
    clickMessage,
    column,
    columnError,
    columnLoading,
    containerRef,
    currentVariableMeta,
    depth,
    exploreActivated,
    mode,
    setDepth,
    setVoxelThreshold,
    voxelError,
    voxelLoading,
    voxelRange,
    voxelThreshold,
  } = useCesiumViewer();
  const setMode = useVizStore((state) => state.setMode);
  const exploreRenderer = useVizStore((state) => state.exploreRenderer);
  const setExploreRenderer = useVizStore((state) => state.setExploreRenderer);
  const variable = useVizStore((state) => state.variable);
  const rendererInitializedRef = useRef(false);

  useEffect(() => {
    if (rendererInitializedRef.current) return;
    rendererInitializedRef.current = true;
    const configuredRenderer = import.meta.env.VITE_EXPLORE_RENDERER;
    setExploreRenderer(configuredRenderer === "flat-slice" ? "flat-slice" : "voxel");
  }, [setExploreRenderer]);

  const steps = column?.steps ?? [];
  const selectedStep = steps.find((step) => Number(step.depth) === Number(depth));
  const hasVoxelRange =
    voxelRange &&
    Number.isFinite(voxelRange.min) &&
    Number.isFinite(voxelRange.max) &&
    voxelRange.max > voxelRange.min;
  const thresholdValue = hasVoxelRange
    ? Math.min(
        voxelRange.max,
        Math.max(voxelRange.min, voxelThreshold ?? voxelRange.min),
      )
    : voxelThreshold ?? 0;
  const thresholdStep = hasVoxelRange
    ? Math.max((voxelRange.max - voxelRange.min) / 100, 0.001)
    : 0.01;
  const variableLabel =
    currentVariableMeta?.display_name ??
    {
      temperature: "Sea water temperature",
      salinity: "Practical salinity",
      dissolved_o2: "Dissolved oxygen",
      nitrate: "Nitrate",
      phosphate: "Phosphate",
      silicate: "Silicate",
    }[variable] ??
    variable;
  const variableUnits = currentVariableMeta?.units ?? "";
  const rangeLabel = hasVoxelRange
    ? `${voxelRange.min.toFixed(2)}–${voxelRange.max.toFixed(2)}${
        variableUnits ? ` ${variableUnits}` : ""
      }`
    : "loading range";

  const handleModeChange = (nextMode) => {
    if (nextMode === "explore") {
      activateExplore();
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
      {mode === "explore" && exploreActivated && (
        <div
          role="group"
          aria-label="Explore renderer"
          style={{
            position: "absolute",
            top: "4.3rem",
            left: "1rem",
            width: "min(18rem, calc(100vw - 2rem))",
            padding: "0.65rem",
            color: "#e8f1f8",
            background: "rgba(7, 24, 43, 0.72)",
            borderRadius: "0.3rem",
            fontSize: "0.8rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>
            3D ocean field
          </div>
          <div style={{ opacity: 0.82, marginBottom: "0.55rem" }}>
            {variableLabel}
            {variableUnits ? ` · ${variableUnits}` : ""}
          </div>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {["voxel", "flat-slice"].map((renderer) => {
              const active = exploreRenderer === renderer;
              return (
                <button
                  key={renderer}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setExploreRenderer(renderer)}
                  style={{
                    border: "1px solid rgba(232, 241, 248, 0.35)",
                    borderRadius: "0.25rem",
                    padding: "0.35rem 0.5rem",
                    color: active ? "#082032" : "#e8f1f8",
                    background: active ? "#7bdff2" : "transparent",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {renderer === "voxel" ? "Voxel shader" : "Flat slices"}
                </button>
              );
            })}
          </div>
          {exploreRenderer === "voxel" && (
            <div style={{ marginTop: "0.7rem" }}>
              <div
                aria-label={`Colour range ${rangeLabel}`}
                style={{
                  height: "0.5rem",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, #0d33d9 0%, #00c7db 33%, #ffcf14 66%, #e0200b 100%)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "0.2rem",
                  fontSize: "0.7rem",
                  opacity: 0.8,
                }}
              >
                <span>Low</span>
                <span>{rangeLabel}</span>
                <span>High</span>
              </div>
            </div>
          )}
          {exploreRenderer === "voxel" && (
            <label style={{ display: "block", marginTop: "0.65rem" }}>
              Threshold: {hasVoxelRange ? thresholdValue.toFixed(2) : "loading"}
              {variableUnits ? ` ${variableUnits}` : ""}
              <input
                aria-label="Voxel threshold"
                type="range"
                min={hasVoxelRange ? voxelRange.min : 0}
                max={hasVoxelRange ? voxelRange.max : 1}
                step={thresholdStep}
                value={thresholdValue}
                disabled={!hasVoxelRange}
                onChange={(event) => setVoxelThreshold(Number(event.target.value))}
                style={{ display: "block", width: "100%", marginTop: "0.45rem" }}
              />
            </label>
          )}
          {exploreRenderer === "voxel" && voxelLoading && (
            <div style={{ marginTop: "0.45rem", opacity: 0.8 }}>
              Loading 3D field…
            </div>
          )}
          {exploreRenderer === "voxel" && voxelError && (
            <div style={{ marginTop: "0.45rem", color: "#ffb4a8" }}>
              3D field unavailable. Use Flat slices.
            </div>
          )}
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
