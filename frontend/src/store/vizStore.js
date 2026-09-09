import { create } from "zustand";

/**
 * Shared visualization state.
 * Person 2 controls write here directly; Person 1 / 3 read (and P1 sets
 * selectedInstrumentId / mode / anchorPoint on globe interaction).
 *
 * Core fields match docs/notes.md Day-0 sketch:
 *   { variable, depth, time, mode, anchorPoint, selectedInstrumentId }
 */
const useVizStore = create((set) => ({
  // --- layer / time selection ---
  variable: "temperature",
  depth: 0,
  time: "2026-08-03T00:00:00Z",

  // --- interaction mode: only one Cesium renderer visible at a time ---
  mode: "explore", // "explore" | "inspect"

  // --- inspect-mode camera anchor (null in explore) ---
  anchorPoint: null, // { lat: number, lon: number } | null

  // --- instrument panel (marker click; does NOT enter inspect) ---
  selectedInstrumentId: null, // string | null

  // --- explore-mode renderer flag (flat-slice first; voxel is stretch) ---
  exploreRenderer: "flat-slice", // "flat-slice" | "voxel"

  // --- panel / visual controls (Person 2) ---
  opacity: 0.85,
  verticalExaggeration: 500,
  colorbar: { min: null, max: null }, // null = use variable default range
  leftPanelOpen: true,
  rightPanelOpen: true,

  // --- UI feedback ---
  landClickMessage: null, // e.g. "no ocean data here"

  // --- setters ---
  setVariable: (variable) => set({ variable }),
  setDepth: (depth) => set({ depth }),
  setTime: (time) => set({ time }),
  setMode: (mode) =>
    set({
      mode,
      // leaving inspect clears the camera lock target
      ...(mode === "explore" ? { anchorPoint: null, landClickMessage: null } : {}),
    }),
  setAnchorPoint: (anchorPoint) => set({ anchorPoint }),
  setSelectedInstrumentId: (selectedInstrumentId) => set({ selectedInstrumentId }),
  clearSelectedInstrument: () => set({ selectedInstrumentId: null }),
  setExploreRenderer: (exploreRenderer) => set({ exploreRenderer }),
  setOpacity: (opacity) => set({ opacity }),
  setVerticalExaggeration: (verticalExaggeration) => set({ verticalExaggeration }),
  setColorbar: (colorbar) => set({ colorbar }),
  setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  setLandClickMessage: (landClickMessage) => set({ landClickMessage }),

  /** Enter inspect at a validated ocean point */
  enterInspect: (lat, lon) =>
    set({
      mode: "inspect",
      anchorPoint: { lat, lon },
      landClickMessage: null,
    }),

  /** Exit inspect back to free explore camera */
  exitInspect: () =>
    set({
      mode: "explore",
      anchorPoint: null,
      landClickMessage: null,
    }),
}));

export default useVizStore;
