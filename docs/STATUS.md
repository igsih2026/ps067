# Project status

## Backend progress

Tracked against the full backend spec (`docs/backend-spec.md` — the numbered sections below match it 1:1).

**1. Data ingestion**
- [x] 1.1 Numerical ocean model data — dataset identified, NetCDF downloaded, dimensions/coords/variables/units/timestamps/depth/metadata inspected. Temperature, salinity, current U/V components supported. Ingestion pipeline does not hardcode a fixed variable list.
- [x] 1.2 Argo data — float ID, lat, lon, time, pressure/depth, temperature, salinity, other available variables, and QC info all parsed. Converted into the common observation format.
- [x] 1.3 Glider data — glider ID, lat, lon, time, depth, temperature, salinity, other available variables all parsed. Converted into the common observation format.
- [x] 1.4 ASCII/text data — CSV/delimited text adapter built (`ascii_adapter.py`).

**2. Data validation & QC**
- [x] 2.1 Structural validation — dimensions/coords, lat/lon ranges, depth values, timestamps, variable shapes, units/metadata all verified.
- [x] 2.2 Missing-value handling — NaN detection, fill-value detection, missing-observation handling, invalid values blocked from reaching visualization.
- [x] 2.3 Observation quality control (QC flag filtering) — standard IOC/IFREMER Argo QC flag filtering (`filter_by_qc`).

**3. Data normalization**
- [x] 3.1 Common scalar field representation — standard structure defined (variable name, units, time, depth, lat, lon, values, metadata).
- [x] 3.2 Common vector field representation — standard structure defined (U, V, lat, lon, depth, time, magnitude, direction).
- [x] 3.3 Common observation representation — unified profile and tabular structure across Argo, Glider, and ASCII CTD observations.

**4. Dataset metadata management**
- [x] 4.1 Dataset metadata — ID, name, type, source, format, spatial/temporal coverage, depth range, available variables all stored.
- [x] 4.2 Variable metadata — name, display name, units, data type, min/max, description, scalar/vector, depth levels, time steps all stored; dynamic discovery in place.

**5. Data preprocessing**
- [x] 5.1 Spatial subsetting (bounding box extraction)
- [x] 5.2 Depth subsetting (specific depth / range / selected layers)
- [x] 5.3 Temporal subsetting (specific timestamp / range / time step)
- [x] 5.4 Variable subsetting (return only the requested variable)

**6. Visualization data processing**
- [x] Depth-slice grid processing (`route_model.py`)
- [x] Velocity vector field magnitude & angle calculation (`vector_processor.py`)
- [x] 3D Isosurface extraction via Marching Cubes (`isosurface.py`)

**7. Instrument & Ocean Analysis processing**
- [x] Instrument location & profile endpoints (`route_instruments.py`)
- [x] 1D Water column extraction & Model vs. Observation comparison (`route_analysis.py`)

**8. REST API development**
- [x] Live endpoints active: `/api/model/{variable}`, `/api/model/vectors/{variable}`, `/api/model/isosurface/{variable}`, `/api/instruments`, `/api/instruments/{id}/profile`, `/api/analysis/column`, `/api/analysis/compare`, `/api/variables`, `/api/datasets`.

**9. Caching & automated acquisition**
- [x] In-memory cache key generator (`memory_cache.py`)
- [x] Automated FTP observation fetch scheduler (`tasks/scheduler.py`)


## Frontend progress

- [x] Added a bare CesiumJS viewer rendered by the Vite + React app, using a blue ellipsoid with no terrain, imagery, camera targeting, or application wiring.
- [x] Replaced the ellipsoid terrain provider with Cesium World Terrain using the local Cesium ion token, vertex normals, water masks, and terrain lighting.
- [x] Set the initial camera view to the India target region without adding user-triggered camera controls.
- [x] Added land/sea click validation using sampled Cesium terrain heights, with accepted ocean coordinates stored and land clicks reported visibly.
- [x] vizStore.js with full shape, every mock function in api.js (mockFloats, mockFloatProfile, mockColumn, mock flat-slice data, mockVariables)


## Open decisions

- **Cesium ion access token** — not yet confirmed. Needed before the terrain PR.
- **Target ocean region / bounding box** — not yet confirmed. Needed before the default-camera PR.
- **Backend API integration timeline** — section 8 (the actual REST endpoints) isn't built yet, so frontend should keep running on mocks in `services/api.js` until this section shows as done above. No integration date set.
