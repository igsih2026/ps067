import { useMemo } from "react";
import useVizStore from "../../store/vizStore";
import usePanelState from "../../hooks/usePanelState";

/**
 * Parameter Summary Panel
 * 
 * Displays all active visualization parameters in a responsive bottom panel.
 * - Coverage: ~15% of viewport height
 * - Updates reactively as parameters change
 * - NLP-style explanations of parameter meanings and values
 * - Non-intrusive: doesn't hide globe or other UI elements
 */
export default function ParameterSummaryPanel() {
  // Global state
  const variable = useVizStore((state) => state.variable);
  const mode = useVizStore((state) => state.mode);
  const exploreRenderer = useVizStore((state) => state.exploreRenderer);
  const selectedInstrumentId = useVizStore((state) => state.selectedInstrumentId);
  
  // Panel state
  const { depth } = usePanelState();

  // Variable metadata mapping
  const variableMetadata = useMemo(() => ({
    temperature: {
      display_name: "Sea water temperature",
      units: "°C",
      description: "Temperature of the ocean water at specified depth"
    },
    salinity: {
      display_name: "Practical salinity",
      units: "PSU",
      description: "Salt concentration of seawater"
    },
    dissolved_o2: {
      display_name: "Dissolved oxygen",
      units: "µmol/kg",
      description: "Amount of oxygen dissolved in seawater"
    },
    nitrate: {
      display_name: "Nitrate concentration",
      units: "µmol/kg",
      description: "Nutrient concentration indicating biological productivity"
    },
    phosphate: {
      display_name: "Phosphate concentration",
      units: "µmol/kg",
      description: "Essential nutrient for marine ecosystem productivity"
    },
    silicate: {
      display_name: "Silicate concentration",
      units: "µmol/kg",
      description: "Nutrient required by diatoms and other silica-based organisms"
    },
  }), []);

  // Generate NLP-style summary text
  const summaryText = useMemo(() => {
    const varMeta = variableMetadata[variable] || {
      display_name: variable,
      units: "",
      description: `${variable} concentration`
    };

    const modeDescription = mode === "inspect"
      ? `inspecting a single water column at a fixed location`
      : `exploring the full 3D ocean field using ${exploreRenderer === "voxel" ? "volumetric rendering" : "depth slices"}`;

    const depthText = mode === "inspect"
      ? `at ${depth} meters depth`
      : "";

    const instrumentText = selectedInstrumentId
      ? ` near instrument ${selectedInstrumentId}`
      : "";

    return `Displaying ${varMeta.display_name} (${varMeta.units}) while ${modeDescription}${depthText}${instrumentText}. ${varMeta.description}.`;
  }, [variable, mode, exploreRenderer, depth, selectedInstrumentId, variableMetadata]);

  // Parameter items for detailed view
  const parameterItems = useMemo(() => {
    const items = [
      {
        label: "Variable",
        value: variableMetadata[variable]?.display_name || variable,
        explanation: variableMetadata[variable]?.description || "Ocean data variable",
        unit: variableMetadata[variable]?.units || ""
      },
      {
        label: "Visualization Mode",
        value: mode.charAt(0).toUpperCase() + mode.slice(1),
        explanation: mode === "inspect"
          ? "Inspect mode focuses on a single water column profile with depth variation"
          : "Explore mode shows the full 3D ocean field across the region",
        unit: ""
      },
    ];

    if (mode === "explore") {
      items.push({
        label: "Renderer Type",
        value: exploreRenderer === "voxel" ? "Voxel Shader (3D)" : "Flat Slices",
        explanation: exploreRenderer === "voxel"
          ? "3D volumetric rendering showing the full depth-dependent structure"
          : "2D depth slices providing a simplified view of the data",
        unit: ""
      });
    }

    if (mode === "inspect") {
      items.push({
        label: "Inspection Depth",
        value: String(depth),
        explanation: "Current depth level being inspected in the water column",
        unit: "meters"
      });
    }

    if (selectedInstrumentId) {
      items.push({
        label: "Selected Instrument",
        value: selectedInstrumentId,
        explanation: "Active instrument profile being compared with model data",
        unit: ""
      });
    }

    return items;
  }, [variable, mode, exploreRenderer, depth, selectedInstrumentId, variableMetadata]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "15vh",
        minHeight: "120px",
        maxHeight: "200px",
        backgroundColor: "rgba(8, 32, 50, 0.95)",
        color: "#e8f1f8",
        borderTop: "2px solid #7bdff2",
        padding: "1rem",
        overflowY: "auto",
        zIndex: 100,
        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Main Summary Section */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div
          style={{
            fontSize: "0.9rem",
            lineHeight: 1.5,
            color: "#7bdff2",
            fontWeight: 500,
            textAlign: "left",
            wordWrap: "break-word",
          }}
        >
          {summaryText}
        </div>
      </div>

      {/* Parameter Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginTop: "0.75rem",
        }}
      >
        {parameterItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "rgba(123, 223, 242, 0.08)",
              border: "1px solid rgba(123, 223, 242, 0.2)",
              borderRadius: "0.35rem",
              padding: "0.5rem",
              fontSize: "0.75rem",
              lineHeight: 1.4,
            }}
          >
            {/* Parameter Label */}
            <div
              style={{
                fontWeight: 700,
                color: "#7bdff2",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {item.label}
            </div>

            {/* Parameter Value */}
            <div
              style={{
                color: "#f4c95d",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              {item.value}
              {item.unit && (
                <span style={{ color: "#b0d9e8", fontWeight: 400, marginLeft: "0.25rem" }}>
                  {item.unit}
                </span>
              )}
            </div>

            {/* Explanation Text */}
            <div
              style={{
                color: "#b0d9e8",
                fontSize: "0.7rem",
                opacity: 0.85,
                fontStyle: "italic",
              }}
            >
              {item.explanation}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Data source indicator */}
      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.65rem",
          color: "#708d99",
          opacity: 0.7,
          textAlign: "right",
        }}
      >
        TRITON Ocean Platform — Real-time data visualization
      </div>
    </div>
  );
}
