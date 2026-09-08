# Project brief: ocean 3D data explorer — frontend

You are building the **frontend only** for a Smart India Hackathon project: a browser-based 3D ocean data explorer. A separate backend team is building the API independently, against the contract described below. Do not build backend code, do not assume backend implementation details beyond this contract, and flag anything in this brief that is ambiguous rather than guessing.

## What this app does

A user sees a 3D globe (CesiumJS) focused on an ocean region. They can browse oceanographic variables (temperature, salinity, dissolved O2, nitrate, phosphate, silicate) at different depths, see Argo float / glider instrument locations, click a float to see its measurement profile, and click any ocean point to inspect exact values at that location and depth.

## Confirmed tech stack

- React + Vite
- Tailwind CSS
- Zustand for state
- CesiumJS for the 3D globe/terrain/rendering
- Plotly.js for the instrument depth-profile chart

## Core interaction model — read this section carefully, it is the actual design

The app has **two modes**, switched by a segmented control (Explore / Inspect) in the UI. Only one mode's renderer is ever visible at a time — when switching, set `.show = false` on the hidden mode's Cesium primitives and `.show = true` on the active mode's. Never render both simultaneously.

### Explore mode (default on load)
- Free camera, full ocean region visible.
- User picks a variable (via a layer panel) and sees it rendered across the region as a volumetric layer.
- **Rendering approach — two tiers, build in this order:**
  1. **Fallback (build first, must always work):** flat, pre-rendered heatmap images per depth band (e.g. every 100–200m), placed as textured `RectangleGeometry` planes inside a box outline at their correct depth. No shaders. Banded, not continuous, but reliable.
  2. **Stretch goal (attempt only after the fallback works):** a real `Cesium.VoxelPrimitive` with a `CustomShader` — a colormap lookup plus a threshold/isosurface check, adapted from Cesium's own Sandcastle voxel examples. This is the single highest-risk item in the whole project. It must never replace the fallback in code — both should exist, with a flag to pick which renders.
- No precise value-picking happens in this mode. It's for browsing/orientation only.

### Inspect mode (entered by clicking a valid ocean point or an instrument marker)
- **Land/sea click validation:** on click, get the lat/lon via `scene.pickPosition`, then sample terrain height at that point (`sampleTerrainMostDetailed`). If height > ~0 (dry land), reject the click and show a message (e.g. "no ocean data here"). If ≤ 0, accept it.
- **Camera anchor:** on a valid click, `camera.flyTo` the point, then lock the camera to orbit-only around it (`trackedEntity` or disabling `screenSpaceCameraController.enableTranslate`). The user can rotate/zoom around the anchor but not pan away from it. Exiting inspect mode (via the toggle) releases the lock.
- **Vertical column ("drill core"):** at the anchored lat/lon, fetch the full depth profile and render it as a stack of solid-colored box primitives — one per depth step. Color each box client-side with a plain color-ramp function (no shader). A slider or draggable marker lets the user pick an exact depth; a small panel shows that depth's exact values for every variable.
- This mode intentionally never does free 3D picking into an occluded volume — X/Y is already fixed from the click, so only depth (1D) needs to be selected.

### Instrument markers (visible in both modes)
- Argo/glider positions render as point entities on the surface, always visible regardless of mode.
- Clicking a marker sets `selectedInstrumentId` in the store and opens a Plotly depth-vs-variable profile chart plus instrument metadata (ID, lat/lon, timestamp). It does not trigger the inspect-mode camera anchor — these are two separate click targets.

## Explicit non-goals for this phase (do not build these)

- No Ecological Marine Units-style clustering layer.
- No free/general 3D ray-picking into the volumetric layer — this was deliberately designed out due to occlusion from terrain.
- No real time-dynamic WMS-T rendering logic. The time slider exists in the UI but can be a non-functional / client-side-only loop over a static array for this phase.
- Do not attempt to render all six variables simultaneously in explore mode's shader on the first pass — get one variable fully working end to end before generalizing.

## Backend API contract (frontend mocks must match this exactly)

- `GET /api/model/{variable}?depth=&time=&bbox=` — returns a scalar field for the volumetric layer
- `GET /api/instruments?type=argo|glider&bbox=` — returns instrument marker positions
- `GET /api/instruments/{id}/profile` — returns a single instrument's depth profile
- `GET /api/variables` — returns available variables, units, and value ranges (for colorbars)

Frontend mock functions must return data shaped exactly like these will, so swapping mock → real is a URL change in `services/api.js` only, with no changes to components, hooks, or the store.

## File structure (frontend portion)

```
frontend/
  src/
    components/
      globe/          CesiumViewer, DepthSliceLayer, VectorFieldLayer, IsosurfaceLayer, InstrumentMarkers
      panels/          LeftPanel, RightPanel, PanelToggleButton
        controls/      VariableSelector, DepthSlider, TimeSlider, ColorbarEditor, OpacitySlider, VerticalExaggerationSlider
        instrument-profile/  ProfileChart, InstrumentMeta, TimeseriesChart
      common/          Loader, ErrorBoundary
    hooks/             useCesiumViewer, useModelData, useInstrumentData, usePanelState
    services/          api.js (real fetch + all mock functions)
    store/             vizStore.js (zustand)
    styles/            panels.css
```

## Team split (3 people, non-overlapping files)

- **Person 1 — globe/Cesium core:** everything in `components/globe/`, `hooks/useCesiumViewer.js`. Owns camera anchoring, mode toggle, both explore-mode renderers, inspect-mode column.
- **Person 2 — panels & controls:** everything in `components/panels/` except `instrument-profile/`, plus `components/common/`, `styles/panels.css`. Reads/writes the store directly, never touches `globe/` or `services/`.
- **Person 3 — state, mocks, instrument profile:** `store/vizStore.js`, `services/api.js`, all hooks, `components/panels/instrument-profile/`. Ships mock data first — this is the hour-one dependency for the other two.

## Timeline (4–5 days)

- **Day 1:** store + mock API shapes (P3, priority); Cesium viewer mount (P1); panel/layout shells (P2)
- **Day 2:** float markers + land-click validation (P1); variable/depth/time controls wired (P2); data hooks + instrument metadata (P3)
- **Day 3:** fly-to/anchor + inspect column (P1); colorbar/opacity/exaggeration controls (P2); ProfileChart wired to instrument clicks (P3)
- **Day 4 — checkpoint, full mocked app must work end-to-end:** mode toggle + flat-slice explore fallback (P1); visual polish pass (P2); timeseries chart + mock data realism (P3); joint `App.jsx` wiring session
- **Day 5 — stretch/buffer:** real `VoxelPrimitive` + `CustomShader` attempt (P1, only if Day 4 landed cleanly); support/bug-fix/rehearsal (P2, P3)

## Open items — needs explicit confirmation, do not assume

- Depth range and step interval for the inspect-mode column (examples so far used 0–2000m in 100m steps — is this final?)
- Vertical exaggeration factor to apply consistently to both terrain and the voxel/column rendering (Esri's reference used 500x)
- Geographic bounding box / region of focus (global, or a specific area such as the Indian Ocean / Arabian Sea / Bay of Bengal)
- Final variable list and per-variable colorbar min/max — six variables have been discussed (temperature, salinity, dissolved O2, nitrate, phosphate, silicate); confirm units and ranges for each
- TypeScript or plain JavaScript
- Source of Cesium terrain/imagery (Cesium ion access token availability, or a self-hosted alternative)
