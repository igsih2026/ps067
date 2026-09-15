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

const USE_MOCK = false;
const API_BASE = import.meta.env?.VITE_API_BASE ?? "/api";

/** Arabian Sea / Bay of Bengal focus (matches India camera region) */
export const DEFAULT_BBOX = {
  west: 65,
  south: 5,
  east: 95,
  north: 25,
};

const DEPTH_STEPS = Array.from({ length: 21 }, (_, i) => i * 100); // 0..2000m

const TIME_STEPS = Array.from({ length: 16 }, (_, i) => {
  const day = String(i + 1).padStart(2, "0");
  return `2026-08-${day}T00:00:00Z`;
});

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
        min: 31,
        max: 37,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
      {
        id: "dissolved_o2",
        display_name: "Dissolved oxygen",
        units: "µmol/kg",
        min: 0,
        max: 220,
        is_vector: false,
        available_depths: DEPTH_STEPS,
        available_times: TIME_STEPS,
      },
      {
        id: "nitrate",
        display_name: "Nitrate",
        units: "µmol/kg",
        min: 0,
        max: 38,
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
        max: 140,
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Piecewise-linear depth curve. points = [[depth_m, value], ...] */
function interpCurve(depth, points) {
  if (depth <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    if (depth <= points[i][0]) {
      const t = (depth - points[i - 1][0]) / (points[i][0] - points[i - 1][0]);
      return lerp(points[i - 1][1], points[i][1], t);
    }
  }
  return points[points.length - 1][1];
}

function timeIndex(time) {
  if (!time) return 2;
  const idx = TIME_STEPS.indexOf(time);
  return idx >= 0 ? idx : 2;
}

/** 0 = Arabian Sea, 1 = Bay of Bengal */
function bayBlend(lon) {
  return clamp(((lon ?? 72) - 74) / 10, 0, 1);
}

/**
 * Northern Indian Ocean (August) climatology + tiny instrument/model noise.
 * Nutrients increase with depth; temperature drops through a thermocline;
 * O2 has an OMZ — not a fake linear lerp across the colorbar.
 */
function sampleValue(variableId, depth, seed = 0, { lat = 15, lon = 72, time } = {}) {
  const meta = variableMeta(variableId);
  const z = Number(depth) || 0;
  const bay = bayBlend(lon);
  const latShift = ((lat ?? 15) - 15) / 20; // south warmer / slightly fresher
  const ti = timeIndex(time);
  const mixed = Math.exp(-z / 160); // temporal jitter lives in the mixed layer
  const band = Math.floor(z / 50);
  const jitter = hash(seed * 0.017 + band * 2.31 + (variableId.length + 1) * 0.4) - 0.5;
  const dayWave = Math.sin(ti * 0.42 + seed * 0.01);

  let value;
  switch (variableId) {
    case "temperature": {
      const profile = interpCurve(z, [
        [0, 29.1],
        [40, 28.7],
        [80, 26.0],
        [120, 20.6],
        [200, 15.2],
        [400, 11.0],
        [700, 8.0],
        [1000, 6.1],
        [1500, 4.3],
        [2000, 3.2],
      ]);
      value =
        profile +
        (1 - bay) * 0.35 * mixed -
        bay * 0.55 * mixed -
        latShift * 0.9 * mixed +
        mixed * (0.28 * dayWave + jitter * 0.18) +
        jitter * 0.08;
      break;
    }
    case "salinity": {
      const arabian = interpCurve(z, [
        [0, 36.25],
        [50, 36.45],
        [150, 36.05],
        [400, 35.35],
        [1000, 34.88],
        [2000, 34.72],
      ]);
      const bengal = interpCurve(z, [
        [0, 32.35],
        [40, 33.05],
        [120, 34.15],
        [400, 34.78],
        [1000, 34.88],
        [2000, 34.72],
      ]);
      value =
        lerp(arabian, bengal, bay) -
        latShift * 0.12 * mixed +
        mixed * (0.04 * dayWave + jitter * 0.05) +
        jitter * 0.02;
      break;
    }
    case "dissolved_o2": {
      const omz = interpCurve(z, [
        [0, 204],
        [40, 192],
        [80, 118],
        [150, 28],
        [250, 9],
        [500, 6],
        [800, 16],
        [1200, 52],
        [1600, 96],
        [2000, 128],
      ]);
      value =
        omz +
        bay * 22 * (z > 80 && z < 1000 ? 1 : mixed) +
        mixed * (3.2 * dayWave + jitter * 2.4) +
        jitter * 1.6;
      break;
    }
    case "nitrate": {
      const profile = interpCurve(z, [
        [0, 0.35],
        [40, 0.8],
        [80, 4.5],
        [150, 14.2],
        [300, 22.5],
        [600, 29.0],
        [1000, 32.4],
        [2000, 35.8],
      ]);
      value = profile - bay * 0.25 * mixed + jitter * 0.45 + mixed * jitter * 0.3;
      break;
    }
    case "phosphate": {
      const profile = interpCurve(z, [
        [0, 0.11],
        [50, 0.22],
        [150, 0.95],
        [400, 1.85],
        [1000, 2.38],
        [2000, 2.62],
      ]);
      value = profile + jitter * 0.035 + mixed * jitter * 0.02;
      break;
    }
    case "silicate": {
      const profile = interpCurve(z, [
        [0, 2.8],
        [50, 6.0],
        [150, 22],
        [400, 54],
        [800, 86],
        [1500, 118],
        [2000, 132],
      ]);
      value = profile + jitter * 1.4;
      break;
    }
    default: {
      const t = Math.min(z / 2000, 1);
      value = lerp(meta.max * 0.85, meta.min + (meta.max - meta.min) * 0.15, t) + jitter * (meta.max - meta.min) * 0.02;
    }
  }

  const decimals = variableId === "salinity" || variableId === "phosphate" ? 3 : 2;
  return Number(clamp(value, meta.min, meta.max).toFixed(decimals));
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
  const loc = { lat: instrument.lat, lon: instrument.lon, time: instrument.timestamp };

  const profile = {
    depths,
    temperature: depths.map((d) => sampleValue("temperature", d, seed, loc)),
    salinity: depths.map((d) => sampleValue("salinity", d, seed + 1, loc)),
    dissolved_o2: depths.map((d) => sampleValue("dissolved_o2", d, seed + 2, loc)),
    nitrate: depths.map((d) => sampleValue("nitrate", d, seed + 3, loc)),
    phosphate: depths.map((d) => sampleValue("phosphate", d, seed + 4, loc)),
    silicate: depths.map((d) => sampleValue("silicate", d, seed + 5, loc)),
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
  const loc = { lat: lat ?? 15, lon: lon ?? 72, time: time ?? TIME_STEPS[2] };

  const values = {
    temperature: depths.map((d) => sampleValue("temperature", d, seed, loc)),
    salinity: depths.map((d) => sampleValue("salinity", d, seed + 1, loc)),
    dissolved_o2: depths.map((d) => sampleValue("dissolved_o2", d, seed + 2, loc)),
    nitrate: depths.map((d) => sampleValue("nitrate", d, seed + 3, loc)),
    phosphate: depths.map((d) => sampleValue("phosphate", d, seed + 4, loc)),
    silicate: depths.map((d) => sampleValue("silicate", d, seed + 5, loc)),
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
  const locTime = { time: time ?? TIME_STEPS[2] };
  const values = latitude.map((lat) =>
    longitude.map((lon) => {
      const spatial = hash(lat * 3 + lon * 5 + seed) - 0.5;
      const eddy = spatial * (meta.max - meta.min) * 0.035;
      return Number(
        (sampleValue(variable, depth, seed, { lat, lon, ...locTime }) + eddy).toFixed(3),
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
            sampleValue(variable, depth, di * 17 + i + j, {
              lat,
              lon,
              time: time ?? TIME_STEPS[2],
            }) +
            (hash(lat + lon + di) - 0.5) * (meta.max - meta.min) * 0.03
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
// mockTimeseries — selected variable at one depth over TIME_STEPS
// (client helper; no dedicated backend route in the brief)
// ---------------------------------------------------------------------------

export function mockTimeseries(variable, { depth = 0, lat = 15, lon = 72, seed = 0 } = {}) {
  const meta = variableMeta(variable);
  const locBase = { lat, lon };
  return {
    variable: meta.id,
    units: meta.units,
    long_name: meta.display_name,
    depth,
    lat,
    lon,
    times: TIME_STEPS,
    values: TIME_STEPS.map((t) => sampleValue(variable, depth, seed, { ...locBase, time: t })),
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
    `${API_BASE}/analysis/column?lat=${lat}&lon=${lon}&time=${encodeURIComponent(time ?? "")}`,
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

/** Time series at a point + depth (mock-backed; samples model field if live) */
export async function fetchTimeseries(variable, { depth, lat, lon, seed } = {}) {
  if (USE_MOCK) return mockTimeseries(variable, { depth, lat, lon, seed });
  const catalog = await fetchVariables();
  const meta = catalog.variables.find((v) => v.id === variable) ?? catalog.variables[0];
  const times = meta.available_times?.length ? meta.available_times : TIME_STEPS;
  const fields = await Promise.all(times.map((t) => fetchModel(variable, { depth, time: t })));
  const nearest = (field) => {
    const lats = field.latitude ?? [];
    const lons = field.longitude ?? [];
    let best = field.values?.[0]?.[0];
    let bestDist = Infinity;
    lats.forEach((la, i) => {
      lons.forEach((lo, j) => {
        const dist = (la - lat) ** 2 + (lo - lon) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = field.values?.[i]?.[j];
        }
      });
    });
    return best;
  };
  return {
    variable: meta.id ?? variable,
    units: meta.units,
    long_name: meta.display_name,
    depth,
    lat,
    lon,
    times,
    values: fields.map(nearest),
  };
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
