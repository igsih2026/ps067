# Project status

## Backend progress

Tracked against the full backend spec (`docs/backend-spec.md` — the numbered sections below match it 1:1).

**1. Data ingestion**
- [x] 1.1 Numerical ocean model data
- [x] 1.2 Argo data
- [x] 1.3 Glider data
- [x] 1.4 ASCII/text data — CSV/delimited text adapter built (`ascii_adapter.py`)

**2. Data validation & QC**
- [x] 2.1 Structural validation
- [x] 2.2 Missing-value handling
- [x] 2.3 Observation quality control — standard IOC/IFREMER Argo QC flag filtering (`filter_by_qc`)

**3. Data normalization**
- [x] 3.1 Common scalar field representation
- [x] 3.2 Common vector field representation
- [x] 3.3 Common observation representation — unified profile/tabular structure across Argo, Glider, ASCII CTD

**4. Dataset metadata management**
- [x] 4.1 Dataset metadata
- [x] 4.2 Variable metadata

**5. Data preprocessing**
- [x] 5.1–5.4 Spatial, depth, temporal, variable subsetting

**6. Visualization data processing**
- [x] Depth-slice grid processing (`route_model.py`)
- [x] Velocity vector field magnitude & angle (`vector_processor.py`)
- [x] 3D isosurface extraction via Marching Cubes (`isosurface.py`)

**7. Instrument & ocean analysis processing**
- [x] Instrument location & profile endpoints (`route_instruments.py`)
- [x] 1D water column extraction & model-vs-observation comparison (`route_analysis.py`)

**8. REST API development — LIVE**
- [x] `/api/model/{variable}`, `/api/model/vectors/{variable}`, `/api/model/isosurface/{variable}`, `/api/instruments`, `/api/instruments/{id}/profile`, `/api/analysis/column`, `/api/analysis/compare`, `/api/variables`, `/api/datasets`

**9. Caching & automated acquisition**
- [x] In-memory cache key generator (`memory_cache.py`)
- [x] Automated FTP observation fetch scheduler (`tasks/scheduler.py`)

**Not yet started (sections 10–15):**
- 10. Processed data storage (raw/processed separation)
- 11. (Automated acquisition scheduling is done — remaining: manual-trigger fallback if needed)
- 12. Extensible/plugin architecture beyond current adapters
- 13. Error handling (graceful failure on bad requests/corrupt files)
- 14. Logging & monitoring
- 15. Security & configuration (input validation, rate limiting, CORS)

## Frontend progress

- [x] PR1 — bare Cesium viewer mounted (Keerat)
- [x] PR2 — real Cesium World Terrain, vertex normals + water mask, terrain lighting, local ion token (Keerat)
- [x] PR3 — default camera view over India, no user-triggered controls yet (Keerat)
- [x] PR4 — Argo/glider point markers mounted from `useInstrumentData` (currently mock-backed); marker clicks set `selectedInstrumentId` (Keerat)
- [x] PR5 — land/sea click validation via sampled terrain height; ocean coords stored, land clicks reported visibly (Keerat)
- [x] PR6 — valid ocean clicks fly the camera to an anchored inspect point and disable camera translation; `releaseAnchor` restores free navigation (Keerat)
- [x] PR7 — inspect-mode depth column rendered as colored box primitives with a 0–2000m depth slider and selected-depth value readout (Keerat)
- [x] PR8 — Explore/Inspect segmented control wired to store mode; inspect column visibility and camera release are mutually exclusive (Keerat)
- [x] Day 1 store/mocks — `vizStore.js`, `services/api.js` (mockFloats, mockFloatProfile, mockColumn, mockFlatSlices, mockVoxelGrid, mockVariables) (Gehna)
- [x] `useInstrumentData.js` — instruments, selectedInstrument, profile, loading/error, selected ID (Gehna)
- [x] `useModelData.js` — field, slices, voxels, column (auto-fetches in inspect mode), variable metadata (Gehna)
- [x] `usePanelState.js` — panel toggles, selected instrument state, land-click message, mode (Gehna)
- [x] `InstrumentMeta.jsx` — instrument type, ID, platform, coordinates, timestamp (Gehna)
- [ ] `ProfileChart.jsx`, `TimeseriesChart.jsx` — not started (Gehna)
- [x] PR9 — Explore mode flat-slice fallback with textured depth bands and a box outline (Keerat)
- [~] PR10 — frontend isosurface renderer wired to backend mesh contract; live variable mapping and dataset validation pending (Keerat)
- [ ] PR11 — shader generalization (Keerat)

## Open decisions

- **Route bug, not just a mismatch** — `useModelData`'s column fetch targets `/api/model/column`. The live backend's actual route is `/api/analysis/column` (confirmed in section 8 above). Fix the frontend wrapper to match — this is now a real bug, since the real endpoint exists to test against.
- **Backend is far ahead of the mock-only assumption** — sections 1–9 are done with live endpoints. Worth deciding whether to start real integration on simple read endpoints (`/api/variables`, `/api/instruments`) before Day 4, rather than staying mock-only by default.
- **Depth range difference, confirm intentional** — `mockFloatProfile` (0–1800m) vs. `mockColumn` (0–2000m) may be legitimately different data sources (measured float range vs. model grid extent), not a bug. 
- **`useModelData` double-fetch in inspect mode** — fetches the full grid field before returning the column. Known inefficiency, worth revisiting now that real endpoints exist and this has a real performance cost.
- **Camera target vs. data bbox may drift** — `useCesiumViewer.js`'s camera target and `api.js`'s `DEFAULT_BBOX` (65–95°E, 5–25°N) are separately hardcoded to the same region. Worth unifying.
- ~~Cesium ion access token~~ — resolved, terrain is live.
- ~~Target ocean region~~ — resolved, India focus (65–95°E, 5–25°N).
