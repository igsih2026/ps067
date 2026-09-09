/**
 * Data layer for the ocean explorer frontend.
 *
 * Public exports mirror the backend contract (docs/frontend-brief.md):
 *   GET /api/model/{variable}?depth=&time=&bbox=
 *   GET /api/instruments?type=argo|glider&bbox=
 *   GET /api/instruments/{id}/profile
 *   GET /api/variables
 *
 * Plus inspect-column + explore flat-slice helpers used by the globe.
 * Flip USE_MOCK to false once section 8 endpoints are live — components/
 * hooks/store should not need to change.
 */

const USE_MOCK = true;
const API_BASE = import.meta.env?.VITE_API_BASE ?? "/api";

/** Arabian Sea / Bay of Bengal focus (matches India camera region) */
export const DEFAULT_BBOX = {
  west: 65,
  south: 5,
  east: 95,
  north: 25,
};

const DEPTH_STEPS = Array.from({ length: 21 }, (_, i) => i * 100); // 0..2000m

const TIME_STEPS = [
  "2026-08-01T00:00:00Z",
  "2026-08-02T00:00:00Z",
  "2026-08-03T00:00:00Z",
  "2026-08-04T00:00:00Z",
  "2026-08-05T00:00:00Z",
];

// ---------------------------------------------------------------------------
// Mock helpers (deterministic-ish noise so charts look non-flat)
// ---------------------------------------------------------------------------

function hash(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Tiny 1x1 PNG data-URI tinted by hue — placeholder "heatmap" texture */
function mockSliceImage(hue) {
  // solid color PNG would need encoding; use SVG data-URI instead (Cesium ImageMaterial accepts it)
  const color = `hsl(${hue}, 70%, 45%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------------------
// mockVariables  →  GET /api/variables
// ---------------------------------------------------------------------------

export function mockVariables() {
  return {
    variables: [
      {
        id: "temperature",
        display_name: "Sea water temperature",
        units: "°C",
        min: 0,
        max: 32,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
      {
        id: "salinity",
        display_name: "Practical salinity",
        units: "PSU",
        min: 30,
        max: 40,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
      {
        id: "dissolved_o2",
        display_name: "Dissolved oxygen",
        units: "µmol/kg",
        min: 0,
        max: 250,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
      {
        id: "nitrate",
        display_name: "Nitrate",
        units: "µmol/kg",
        min: 0,
        max: 45,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
      {
        id: "phosphate",
        display_name: "Phosphate",
        units: "µmol/kg",
        min: 0,
        max: 3,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
      {
        id: "silicate",
        display_name: "Silicate",
        units: "µmol/kg",
        min: 0,
        max: 150,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
    ],
  };
}

function variableMeta(id) {
  return mockVariables().variables.find((v) => v.id === id) ?? mockVariables().variables[0];
}

function sampleValue(variableId, depth, seed = 0) {
  const meta = variableMeta(variableId);
  const t = Math.min(depth / 2000, 1);
  // surface-ish warm / high → deep cooler / lower for most vars
  const base = lerp(meta.max * 0.85, meta.min + (meta.max - meta.min) * 0.15, t);
  const noise = (hash(depth * 0.1 + seed) - 0.5) * (meta.max - meta.min) * 0.08;
  return Number((base + noise).toFixed(3));
}

// ---------------------------------------------------------------------------
// mockFloats  →  GET /api/instruments?type=&bbox=
// ---------------------------------------------------------------------------

export function mockFloats({ type, bbox } = {}) {
  const region = bbox ?? DEFAULT_BBOX;
  const all = [
    {
      id: "argo-1900121",
      type: "argo",
      lat: 15.2,
      lon: 72.4,
      timestamp: "2026-08-03T06:12:00Z",
      platform_number: "1900121",
    },
    {
      id: "argo-2902746",
      type: "argo",
      lat: 10.8,
      lon: 68.1,
      timestamp: "2026-08-02T18:40:00Z",
      platform_number: "2902746",
    },
    {
      id: "argo-5906467",
      type: "argo",
      lat: 18.5,
      lon: 88.2,
      timestamp: "2026-08-03T01:05:00Z",
      platform_number: "5906467",
    },
    {
      id: "glider-sg001",
      type: "glider",
      lat: 12.3,
      lon: 80.1,
      timestamp: "2026-08-03T09:30:00Z",
      platform_number: "SG001",
    },
    {
      id: "glider-sg014",
      type: "glider",
      lat: 8.6,
      lon: 76.5,
      timestamp: "2026-08-01T14:22:00Z",
      platform_number: "SG014",
    },
  ];

  return {
    instruments: all.filter((inst) => {
      if (type && inst.type !== type) return false;
      if (inst.lon < region.west || inst.lon > region.east) return false;
      if (inst.lat < region.south || inst.lat > region.north) return false;
      return true;
    }),
  };
}

// ---------------------------------------------------------------------------
// mockFloatProfile  →  GET /api/instruments/{id}/profile
// ---------------------------------------------------------------------------

export function mockFloatProfile(id) {
  const floats = mockFloats().instruments;
  const instrument = floats.find((f) => f.id === id) ?? {
    id,
    type: "argo",
    lat: 15,
    lon: 72,
    timestamp: TIME_STEPS[2],
    platform_number: id,
  };

  const seed = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const depths = DEPTH_STEPS.filter((d) => d <= 1800);

  const profile = {
    depths,
    temperature: depths.map((d) => sampleValue("temperature", d, seed)),
    salinity: depths.map((d) => sampleValue("salinity", d, seed + 1)),
    dissolved_o2: depths.map((d) => sampleValue("dissolved_o2", d, seed + 2)),
    nitrate: depths.map((d) => sampleValue("nitrate", d, seed + 3)),
    phosphate: depths.map((d) => sampleValue("phosphate", d, seed + 4)),
    silicate: depths.map((d) => sampleValue("silicate", d, seed + 5)),
  };

  return {
    id: instrument.id,
    type: instrument.type,
    lat: instrument.lat,
    lon: instrument.lon,
    timestamp: instrument.timestamp,
    platform_number: instrument.platform_number,
    profile,
  };
}

// ---------------------------------------------------------------------------
// mockColumn  — inspect-mode vertical drill-core at a lat/lon
// ---------------------------------------------------------------------------

export function mockColumn({ lat, lon, time } = {}) {
  const seed = Math.round((lat ?? 15) * 100 + (lon ?? 72) * 10);
  const depths = DEPTH_STEPS;

  const values = {
    temperature: depths.map((d) => sampleValue("temperature", d, seed)),
    salinity: depths.map((d) => sampleValue("salinity", d, seed + 1)),
    dissolved_o2: depths.map((d) => sampleValue("dissolved_o2", d, seed + 2)),
    nitrate: depths.map((d) => sampleValue("nitrate", d, seed + 3)),
    phosphate: depths.map((d) => sampleValue("phosphate", d, seed + 4)),
    silicate: depths.map((d) => sampleValue("silicate", d, seed + 5)),
  };

  // Also provide stacked steps for easy Cesium box coloring
  const steps = depths.map((depth, i) => ({
    depth,
    temperature: values.temperature[i],
    salinity: values.salinity[i],
    dissolved_o2: values.dissolved_o2[i],
    nitrate: values.nitrate[i],
    phosphate: values.phosphate[i],
    silicate: values.silicate[i],
  }));

  return {
    lat: lat ?? 15,
    lon: lon ?? 72,
    time: time ?? TIME_STEPS[2],
    depths,
    values,
    steps,
  };
}

// ---------------------------------------------------------------------------
// mockModelField  →  GET /api/model/{variable}?depth=&time=&bbox=
// Shape aligns with backend to_common_scalar_field()
// ---------------------------------------------------------------------------

export function mockModelField(variable, { depth = 0, time, bbox } = {}) {
  const meta = variableMeta(variable);
  const region = bbox ?? DEFAULT_BBOX;
  const nLat = 8;
  const nLon = 10;
  const latitude = Array.from({ length: nLat }, (_, i) =>
    lerp(region.south, region.north, i / (nLat - 1)),
  );
  const longitude = Array.from({ length: nLon }, (_, j) =>
    lerp(region.west, region.east, j / (nLon - 1)),
  );

  const seed = Math.round(depth + (variable?.length ?? 0) * 7);
  const values = latitude.map((lat, i) =>
    longitude.map((lon, j) => {
      const spatial = hash(lat * 3 + lon * 5 + seed);
      return Number(
        (
          sampleValue(variable, depth, seed) +
          (spatial - 0.5) * (meta.max - meta.min) * 0.12
        ).toFixed(3),
      );
    }),
  );

  return {
    variable: meta.id,
    units: meta.units,
    long_name: meta.display_name,
    time: time ?? TIME_STEPS[2],
    depth,
    latitude,
    longitude,
    values, // 2D: values[lat_index][lon_index]
    metadata: {
      source: "mock",
      institution: "frontend-mocks",
      conventions: "CF-1.8",
    },
  };
}

// ---------------------------------------------------------------------------
// mockFlatSlices — explore-mode fallback (textured RectangleGeometry bands)
// ---------------------------------------------------------------------------

export function mockFlatSlices(variable, { time, bbox } = {}) {
  const meta = variableMeta(variable);
  const region = bbox ?? DEFAULT_BBOX;
  // every 200m band from 0–2000m
  const bandDepths = Array.from({ length: 11 }, (_, i) => i * 200);

  return {
    variable: meta.id,
    units: meta.units,
    time: time ?? TIME_STEPS[2],
    bbox: region,
    bands: bandDepths.map((depth, i) => ({
      depth,
      depth_min: depth,
      depth_max: depth + 200,
      west: region.west,
      south: region.south,
      east: region.east,
      north: region.north,
      // placeholder texture; replace with real heatmap images later
      imageUrl: mockSliceImage(200 - i * 18),
      // optional scalar summary for colorbar / legend
      min: meta.min,
      max: meta.max,
    })),
  };
}

// ---------------------------------------------------------------------------
// mockVoxelGrid — stretch-goal shape for VoxelPrimitive (optional consumer)
// ---------------------------------------------------------------------------

export function mockVoxelGrid(variable, { time, bbox } = {}) {
  const meta = variableMeta(variable);
  const region = bbox ?? DEFAULT_BBOX;
  const depths = Array.from({ length: 11 }, (_, i) => i * 200);
  const nLat = 6;
  const nLon = 8;
  const latitude = Array.from({ length: nLat }, (_, i) =>
    lerp(region.south, region.north, i / (nLat - 1)),
  );
  const longitude = Array.from({ length: nLon }, (_, j) =>
    lerp(region.west, region.east, j / (nLon - 1)),
  );

  // values[depthIndex][latIndex][lonIndex]
  const values = depths.map((depth, di) =>
    latitude.map((lat, i) =>
      longitude.map((lon, j) =>
        Number(
          (
            sampleValue(variable, depth, di * 17 + i + j) +
            (hash(lat + lon + di) - 0.5) * (meta.max - meta.min) * 0.1
          ).toFixed(3),
        ),
      ),
    ),
  );

  return {
    variable: meta.id,
    units: meta.units,
    time: time ?? TIME_STEPS[2],
    bbox: region,
    depths,
    latitude,
    longitude,
    values,
    min: meta.min,
    max: meta.max,
  };
}

// ---------------------------------------------------------------------------
// Public fetch wrappers — swap mock → real here only
// ---------------------------------------------------------------------------

/** GET /api/variables */
export async function fetchVariables() {
  if (USE_MOCK) return mockVariables();
  const res = await fetch(`${API_BASE}/variables`);
  if (!res.ok) throw new Error(`variables ${res.status}`);
  return res.json();
}

/** GET /api/instruments?type=&bbox= */
export async function fetchInstruments({ type, bbox } = {}) {
  if (USE_MOCK) return mockFloats({ type, bbox });
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (bbox) params.set("bbox", `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
  const res = await fetch(`${API_BASE}/instruments?${params}`);
  if (!res.ok) throw new Error(`instruments ${res.status}`);
  return res.json();
}

/** GET /api/instruments/{id}/profile */
export async function fetchInstrumentProfile(id) {
  if (USE_MOCK) return mockFloatProfile(id);
  const res = await fetch(`${API_BASE}/instruments/${id}/profile`);
  if (!res.ok) throw new Error(`profile ${res.status}`);
  return res.json();
}

/** GET /api/model/{variable}?depth=&time=&bbox= */
export async function fetchModel(variable, { depth, time, bbox } = {}) {
  if (USE_MOCK) return mockModelField(variable, { depth, time, bbox });
  const params = new URLSearchParams();
  if (depth != null) params.set("depth", String(depth));
  if (time) params.set("time", time);
  if (bbox) params.set("bbox", `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
  const res = await fetch(`${API_BASE}/model/${variable}?${params}`);
  if (!res.ok) throw new Error(`model ${res.status}`);
  return res.json();
}

/** Inspect-mode column at a point (no dedicated backend route yet → mock) */
export async function fetchColumn({ lat, lon, time } = {}) {
  if (USE_MOCK) return mockColumn({ lat, lon, time });
  // placeholder until backend exposes a column/profile-at-point route
  const res = await fetch(
    `${API_BASE}/model/column?lat=${lat}&lon=${lon}&time=${encodeURIComponent(time ?? "")}`,
  );
  if (!res.ok) throw new Error(`column ${res.status}`);
  return res.json();
}

/** Explore flat-slice bands (client helper; may stay mock even after API lands) */
export async function fetchFlatSlices(variable, { time, bbox } = {}) {
  if (USE_MOCK) return mockFlatSlices(variable, { time, bbox });
  const params = new URLSearchParams({ mode: "flat-slice" });
  if (time) params.set("time", time);
  if (bbox) params.set("bbox", `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
  const res = await fetch(`${API_BASE}/model/${variable}?${params}`);
  if (!res.ok) throw new Error(`flat-slices ${res.status}`);
  return res.json();
}

/** Stretch-goal voxel volume */
export async function fetchVoxelGrid(variable, { time, bbox } = {}) {
  if (USE_MOCK) return mockVoxelGrid(variable, { time, bbox });
  const params = new URLSearchParams({ mode: "voxel" });
  if (time) params.set("time", time);
  if (bbox) params.set("bbox", `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
  const res = await fetch(`${API_BASE}/model/${variable}?${params}`);
  if (!res.ok) throw new Error(`voxel ${res.status}`);
  return res.json();
}
