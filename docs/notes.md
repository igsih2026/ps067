# Brain dump

Visual idea seems super similar: https://labs.esri.com/ocean-explorer/

**Problem:** land is not elevated, spoils the look lwk. But its reason is to allow accessing the layers on the border to it.

This flow might help in mitigating that:

*[flow diagram: 1. Click the 2D map (ocean cells clickable, land dimmed) → 2. Camera flies to 3D (slice plane ready to drag)]*

But 2D coordinates to depth might remove the 3D aspect??? As 2D coordinates locked down, this reduces complexity — else shaders would be required. Plus agar 3D aspect has to be defended toh 2D map initial waala would technically be 3D too.

Buttttttt we need the money shot. So let's allow exploration main that layer-by-layer cheez, and inspection main lock it down.

A flow similar to this:

*[flow diagram: Explore/Inspect toggle — "Free camera, full box visible. Click any point to inspect." → "Anchored, orbit only. Back button returns to explore." with a sample readout: Depth 620m, O2 3.42]*

## Claude's plan (pasted for reference)

Day-0, 30 min, before anyone opens an editor: whoever owns `store/vizStore.js` and `services/api.js` sketches the field names and mock data shapes — `{ variable, depth, time, mode, anchorPoint, selectedInstrumentId }` for the store, and return shapes for each mock function. Keep these shaped exactly like the backend contract (`/api/model/{variable}`, `/api/instruments`, `/api/instruments/{id}/profile`, `/api/variables`) — that's what makes this genuinely swap-in-ready later, not just three parallel mockups that need rewriting to meet the real API.

### Person 1 — Globe/Cesium core
*(heaviest, most specialized — put your strongest Cesium/graphics person here)*
- `components/globe/*` — CesiumViewer, DepthSliceLayer, VectorFieldLayer, IsosurfaceLayer, InstrumentMarkers
- `hooks/useCesiumViewer.js`
- Build order: viewer mount → float markers (reads mock instrument data) → 2D click/land check → fly-to/anchor → inspect column → mode toggle → explore mode, flat-slice fallback first, real shader as stretch
- Consumes Person 3's `useModelData`/`useInstrumentData` hooks and the store, but never edits those files — pure read dependency
- On marker click: write `selectedInstrumentId` to the store and stop. Doesn't touch ProfileChart at all.

### Person 2 — Panels & controls
*(self-contained UI, no Cesium knowledge required — good fit if someone's weaker on 3D)*
- `components/panels/LeftPanel.jsx`, `RightPanel.jsx`, `PanelToggleButton.jsx`
- `components/panels/controls/*` — VariableSelector, DepthSlider, TimeSlider, ColorbarEditor, OpacitySlider, VerticalExaggerationSlider
- `components/common/*` — Loader, ErrorBoundary
- `styles/panels.css`
- Every control just reads/writes the store directly (slider drag → `setDepth(v)`). Never imports from `globe/` or `services/` at all.

### Person 3 — State, mock data layer, instrument profile
*(ships first, everyone else's hour-one dependency)*
- `store/vizStore.js`, `services/api.js` — every mock function (`mockFloats`, `mockFloatProfile`, `mockColumn`, `mockVoxelGrid`, `mockVariables`), returning realistic fake values in the agreed shapes
- `hooks/useModelData.js`, `useInstrumentData.js`, `usePanelState.js`
- `components/panels/instrument-profile/*` — ProfileChart, InstrumentMeta, TimeseriesChart (natural pairing: same person defining the data shape and consuming it, zero ambiguity)
- Priority order matters here: store + mock `api.js` functions land before anything else — stub them same-day even if rough, so Persons 1 and 2 aren't blocked waiting

**Why this stays non-overlapping:** Person 1 never opens `panels/`, Person 2 never opens `globe/` or `services/`, Person 3 never opens `globe/` or `controls/`. The only place all three meet is `App.jsx`/`main.jsx` — do that as a short joint session once the pieces exist, not solo work.

**Feasibility flag:** Person 1's explore-mode shader is the one item that can eat the whole timeline if it goes sideways — build the flat-slice fallback first, attempt the real `CustomShader` only once that's already working and there's slack left.

**Handoff to the backend three, later:** since Person 3's mock functions are shaped like the real endpoints, integration is deleting the mock body and pointing `api.js` at real `fetch()` calls — the store, hooks, and every component built by Persons 1 and 2 don't change at all.

### 4–5 day plan

Three tracks in parallel. Day 4 end is the safety checkpoint — a fully working, demoable prototype with mocks, no shader risk yet. Day 5 is where the wow-factor upgrade gets attempted, precisely because everything before it doesn't depend on it succeeding.

**Day 1**
- Person 3 (priority, blocks the other two): `vizStore.js` with full shape, every mock function in `api.js` (`mockFloats`, `mockFloatProfile`, `mockColumn`, mock flat-slice data, `mockVariables`) — rough is fine, shape matters more than realism today
- Person 1: CesiumViewer mount, terrain, default camera — doesn't need P3's mocks yet, independent start
- Person 2: LeftPanel/RightPanel shells, PanelToggleButton, layout scaffold, Loader/ErrorBoundary — independent start
- End of day: P3's store/mocks must be usable, even if bare-bones — P1 and P2 both start consuming them tomorrow.

**Day 2**
- Person 1: Float markers using mock instrument data, 2D click + land validation (terrain height check)
- Person 2: VariableSelector, DepthSlider, TimeSlider wired to the store
- Person 3: `useModelData`, `useInstrumentData`, `usePanelState` hooks; InstrumentMeta component

**Day 3**
- Person 1: Fly-to + camera anchor lock, inspect-mode column rendering (stacked boxes, client-side color lerp, depth slider bound to store)
- Person 2: ColorbarEditor, OpacitySlider, VerticalExaggerationSlider wired
- Person 3: ProfileChart (Plotly depth-vs-variable), wired to `selectedInstrumentId` from the store — this is where P1's marker clicks and P3's chart actually meet

**Day 4 — safety checkpoint, full mocked demo should work end-to-end today**
- Person 1: Mode toggle (explore/inspect `.show` switching) + explore mode's flat-slice fallback (textured rectangles per depth band, mock images) — no shader yet, this is the guaranteed-working version
- Person 2: Visual polish pass across all controls — spacing, collapse/expand animation, consistent styling
- Person 3: TimeseriesChart, tighten mock data realism (plausible value ranges/noise so the demo doesn't look fake)
- Do a 1–2 hr joint session today wiring `App.jsx` — first time all three tracks actually run together.

**Day 5 — stretch + buffer**
- Person 1: Attempt real `VoxelPrimitive` + `CustomShader` for explore mode (the actual wow-factor upgrade) — only now, because Day 4's fallback means failure here costs nothing
- Person 2 & 3: Available to help P1 (generate the flat-slice source images better, debug shader integration) or do final bug fixes / edge-case handling (loading states, empty states) wherever needed
- End of day: demo rehearsal, whatever state the shader's in

The thing that makes this safe: Day 4 gives you a complete, presentable prototype regardless of how Day 5 goes. If the shader lands, great — bigger wow factor. If it doesn't, you fall back to Thursday's version and nothing about the rest of the app changes, since the mode toggle already treats both renderers identically.

## Formal brief

Prompt/brief of this idea (formal-vormal bhaasha): see `ocean-explorer-frontend-brief.md`
