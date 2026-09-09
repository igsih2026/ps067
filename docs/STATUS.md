# Project status

## Backend progress

Tracked against the full backend spec (`docs/backend-spec.md` — the numbered sections below match it 1:1).

**1. Data ingestion**
- [x] 1.1 Numerical ocean model data — dataset identified, NetCDF downloaded, dimensions/coords/variables/units/timestamps/depth/metadata inspected. Temperature, salinity, current U/V components supported. Ingestion pipeline does not hardcode a fixed variable list.
- [x] 1.2 Argo data — float ID, lat, lon, time, pressure/depth, temperature, salinity, other available variables, and QC info all parsed. Converted into the common observation format.
- [x] 1.3 Glider data — glider ID, lat, lon, time, depth, temperature, salinity, other available variables all parsed. Converted into the common observation format.
- [ ] 1.4 ASCII/text data — not started.

**2. Data validation & QC**
- [x] 2.1 Structural validation — dimensions/coords, lat/lon ranges, depth values, timestamps, variable shapes, units/metadata all verified.
- [x] 2.2 Missing-value handling — NaN detection, fill-value detection, missing-observation handling, invalid values blocked from reaching visualization.
- [ ] 2.3 Observation quality control (QC flag filtering) — not started.

**3. Data normalization**
- [x] 3.1 Common scalar field representation — standard structure defined (variable name, units, time, depth, lat, lon, values, metadata).
- [x] 3.2 Common vector field representation — standard structure defined (U, V, lat, lon, depth, time, magnitude, direction).
- [ ] 3.3 Common observation representation (Argo/Glider/CTD/BGC unified structure) — not started.

**4. Dataset metadata management**
- [x] 4.1 Dataset metadata — ID, name, type, source, format, spatial/temporal coverage, depth range, available variables all stored.
- [x] 4.2 Variable metadata — name, display name, units, data type, min/max, description, scalar/vector, depth levels, time steps all stored; dynamic discovery in place.

**5. Data preprocessing**
- [x] 5.1 Spatial subsetting (bounding box extraction)
- [x] 5.2 Depth subsetting (specific depth / range / selected layers)
- [x] 5.3 Temporal subsetting (specific timestamp / range / time step)
- [x] 5.4 Variable subsetting (return only the requested variable)

**Not yet started (sections 6–15):**
- 6. Visualization data processing — depth-slice, vector field, isosurface, colorbar processing
- 7. Instrument data processing — location processing, **profile processing, time-series processing**
- 8. REST API development — **none of the actual endpoints are live yet**, including the four the frontend contract depends on: `/api/model/{variable}`, `/api/instruments`, `/api/instruments/{id}/profile`, `/api/variables`
- 9. Caching & performance optimization
- 10. Processed data storage (raw/processed separation)
- 11. Automated data acquisition (fetch scripts)
- 12. Extensible/plugin architecture (base adapter interface)
- 13. Error handling
- 14. Logging & monitoring
- 15. Security & configuration

## Frontend progress

- [x] Added a bare CesiumJS viewer rendered by the Vite + React app, using a blue ellipsoid with no terrain, imagery, camera targeting, or application wiring.
- [x] Replaced the ellipsoid terrain provider with Cesium World Terrain using the local Cesium ion token, vertex normals, water masks, and terrain lighting.
- [x] Set the initial camera view to the India target region without adding user-triggered camera controls.
- [x] Added land/sea click validation using sampled Cesium terrain heights, with accepted ocean coordinates stored and land clicks reported visibly.


## Open decisions

- **Cesium ion access token** — not yet confirmed. Needed before the terrain PR.
- **Target ocean region / bounding box** — not yet confirmed. Needed before the default-camera PR.
- **Backend API integration timeline** — section 8 (the actual REST endpoints) isn't built yet, so frontend should keep running on mocks in `services/api.js` until this section shows as done above. No integration date set.
