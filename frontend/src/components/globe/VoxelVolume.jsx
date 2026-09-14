import {
  Cartesian3,
  CustomShader,
  CustomShaderMode,
  CustomShaderTranslucencyMode,
  Ellipsoid,
  Matrix4,
  MetadataComponentType,
  MetadataType,
  Transforms,
  UniformType,
  VoxelContent,
  VoxelPrimitive,
  VoxelShapeType,
} from "cesium";

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1;
const DEFAULT_DEPTH = 2000;
const MAX_VISUAL_EXAGGERATION = 100;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getSourceGrid(grid) {
  return grid?.grid && !Array.isArray(grid.values)
    ? { ...grid, ...grid.grid }
    : grid ?? {};
}

function getRegion(grid) {
  const source = getSourceGrid(grid);
  const bbox = source.bbox ?? {};
  const latitude = source.latitude ?? source.lat ?? [];
  const longitude = source.longitude ?? source.lon ?? [];

  return {
    west: Number(bbox.west ?? bbox.minLon ?? longitude[0] ?? 65),
    south: Number(bbox.south ?? bbox.minLat ?? latitude[0] ?? 5),
    east: Number(
      bbox.east ?? bbox.maxLon ?? longitude[longitude.length - 1] ?? 95,
    ),
    north: Number(
      bbox.north ?? bbox.maxLat ?? latitude[latitude.length - 1] ?? 25,
    ),
  };
}

function getSliceValues(slice) {
  const source = getSourceGrid(slice);
  return source.values ?? source.grid?.values ?? [];
}

function getSliceMask(slice) {
  const source = getSourceGrid(slice);
  if (source.validMask) return source.validMask;
  if (source.nanMask) {
    return source.nanMask.map((row) =>
      row.map((value) => !Boolean(value)),
    );
  }
  return null;
}

/**
 * Normalizes the current mock grid and a future array of backend scalar
 * slices into one renderer-facing volume shape.
 */
export function normalizeVoxelGrid(grid) {
  if (!grid) return null;

  if (Array.isArray(grid)) {
    return normalizeVoxelGrid({ slices: grid });
  }

  if (grid.grid && grid.depth != null && !Array.isArray(grid.depths)) {
    return normalizeVoxelGrid({
      variable: grid.variable,
      units: grid.units,
      bbox: grid.bbox,
      min: grid.min ?? grid.colorbar?.min,
      max: grid.max ?? grid.colorbar?.max,
      slices: [grid],
    });
  }

  if (Array.isArray(grid.slices)) {
    const first = getSourceGrid(grid.slices[0]);
    const depths = grid.slices.map((slice) =>
      Number(slice.depth ?? slice.grid?.depth),
    );
    return {
      ...grid,
      depths,
      latitude: first.lat ?? first.latitude ?? [],
      longitude: first.lon ?? first.longitude ?? [],
      values: grid.slices.map(getSliceValues),
      validMask: grid.slices.map(getSliceMask),
      bbox: grid.bbox ?? grid.slices[0]?.bbox,
      min: grid.min ?? grid.slices[0]?.colorbar?.min,
      max: grid.max ?? grid.slices[0]?.colorbar?.max,
    };
  }

  const source = getSourceGrid(grid);
  return {
    ...grid,
    depths: source.depths ?? [],
    latitude: source.latitude ?? source.lat ?? [],
    longitude: source.longitude ?? source.lon ?? [],
    values: source.values ?? [],
    validMask: source.validMask ?? null,
    bbox: source.bbox,
    min: source.min ?? source.colorbar?.min,
    max: source.max ?? source.colorbar?.max,
  };
}

function getDataShape(grid) {
  const normalized = normalizeVoxelGrid(grid);
  const values = normalized?.values;
  const depths = normalized?.depths ?? [];
  const latitude = normalized?.latitude ?? [];
  const longitude = normalized?.longitude ?? [];
  const validMask = normalized?.validMask;

  if (
    !Array.isArray(values) ||
    !depths.length ||
    !latitude.length ||
    !longitude.length
  ) {
    return null;
  }

  const depthCount = depths.length;
  const latitudeCount = latitude.length;
  const longitudeCount = longitude.length;
  const flatValues = new Float32Array(
    depthCount * latitudeCount * longitudeCount,
  );
  const flatValidity = new Float32Array(flatValues.length);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  for (let depthIndex = 0; depthIndex < depthCount; depthIndex += 1) {
    for (let latitudeIndex = 0; latitudeIndex < latitudeCount; latitudeIndex += 1) {
      for (let longitudeIndex = 0; longitudeIndex < longitudeCount; longitudeIndex += 1) {
        const rawValue = finiteNumber(
          values[depthIndex]?.[latitudeIndex]?.[longitudeIndex],
        );
        const maskValue = validMask?.[depthIndex]?.[latitudeIndex]?.[
          longitudeIndex
        ];
        const isValid =
          maskValue == null ? rawValue != null : Boolean(maskValue);
        const value = isValid && rawValue != null ? rawValue : 0;
        const index =
          longitudeIndex +
          longitudeCount *
            (latitudeIndex + latitudeCount * depthIndex);
        flatValues[index] = value;
        flatValidity[index] = isValid ? 1 : 0;
        if (isValid && rawValue != null) {
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
      }
    }
  }

  const metadataMin = finiteNumber(normalized.min);
  const metadataMax = finiteNumber(normalized.max);

  return {
    depthCount,
    latitudeCount,
    longitudeCount,
    flatValues,
    flatValidity,
    minimum: metadataMin ?? (Number.isFinite(minimum) ? minimum : DEFAULT_MIN),
    maximum: metadataMax ?? (Number.isFinite(maximum) ? maximum : DEFAULT_MAX),
  };
}

function createVoxelProvider(grid, dataShape) {
  return {
    shape: VoxelShapeType.BOX,
    dimensions: new Cartesian3(
      dataShape.longitudeCount,
      dataShape.latitudeCount,
      dataShape.depthCount,
    ),
    paddingBefore: Cartesian3.ZERO,
    paddingAfter: Cartesian3.ZERO,
    names: ["data", "valid"],
    types: [MetadataType.SCALAR, MetadataType.SCALAR],
    componentTypes: [
      MetadataComponentType.FLOAT32,
      MetadataComponentType.FLOAT32,
    ],
    minimumValues: [[dataShape.minimum], [0]],
    maximumValues: [[dataShape.maximum], [1]],
    maximumTileCount: 1,
    availableLevels: 1,
    requestData({ tileLevel = 0 } = {}) {
      if (tileLevel > 0) return undefined;
      return Promise.resolve(
        VoxelContent.fromMetadataArray([
          dataShape.flatValues,
          dataShape.flatValidity,
        ]),
      );
    },
    grid,
  };
}

function createModelMatrix(grid, verticalExaggeration = 1) {
  const region = getRegion(grid);
  const depths = (grid?.depths ?? []).map(Number).filter(Number.isFinite);
  const maxDepth = Math.max(...depths, DEFAULT_DEPTH);
  const depthScale = Math.min(
    Math.max(Number(verticalExaggeration) || 1, 1),
    MAX_VISUAL_EXAGGERATION,
  );
  const visualDepth = maxDepth * depthScale;
  const centerLat = (region.south + region.north) / 2;
  const centerLon = (region.west + region.east) / 2;
  const center = Cartesian3.fromDegrees(centerLon, centerLat, -visualDepth / 2);
  const modelMatrix = Transforms.eastNorthUpToFixedFrame(center, Ellipsoid.WGS84);
  const latitudeMeters = Math.abs(region.north - region.south) * 111_320;
  const longitudeMeters =
    Math.abs(region.east - region.west) *
    111_320 *
    Math.max(Math.cos((centerLat * Math.PI) / 180), 0.1);

  return Matrix4.multiplyByScale(
    modelMatrix,
    new Cartesian3(longitudeMeters, latitudeMeters, visualDepth),
    new Matrix4(),
  );
}

function createCustomShader(dataShape, threshold, opacity) {
  const customShader = new CustomShader({
    mode: CustomShaderMode.REPLACE_MATERIAL,
    translucencyMode: CustomShaderTranslucencyMode.TRANSLUCENT,
    uniforms: {
      u_threshold: {
        type: UniformType.FLOAT,
        value: threshold,
      },
      u_minValue: {
        type: UniformType.FLOAT,
        value: dataShape.minimum,
      },
      u_maxValue: {
        type: UniformType.FLOAT,
        value: dataShape.maximum,
      },
      u_opacity: {
        type: UniformType.FLOAT,
        value: opacity,
      },
    },
    fragmentShaderText: `
      vec3 oceanRamp(float value) {
        vec3 blue = vec3(0.05, 0.20, 0.85);
        vec3 cyan = vec3(0.00, 0.78, 0.86);
        vec3 yellow = vec3(1.00, 0.82, 0.08);
        vec3 red = vec3(0.88, 0.12, 0.04);

        if (value < 0.3333) {
          return mix(blue, cyan, value * 3.0);
        }
        if (value < 0.6666) {
          return mix(cyan, yellow, (value - 0.3333) * 3.0);
        }
        return mix(yellow, red, (value - 0.6666) * 3.0);
      }

      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        if (fsInput.metadata.valid < 0.5) {
          material.alpha = 0.0;
          return;
        }

        float value = fsInput.metadata.data;
        float range = max(u_maxValue - u_minValue, 0.0001);
        float normalized = clamp((value - u_minValue) / range, 0.0, 1.0);

        material.diffuse = oceanRamp(normalized);
        material.alpha = value >= u_threshold ? u_opacity : 0.0;
      }
    `,
  });

  return customShader;
}

/** Mounts an in-memory VoxelPrimitive backed by the current voxel payload. */
export function mountVoxelVolume(
  viewer,
  grid,
  threshold,
  verticalExaggeration = 1,
  opacity = 0.85,
) {
  if (!viewer || viewer.isDestroyed()) return () => {};

  const normalizedGrid = normalizeVoxelGrid(grid);
  const dataShape = getDataShape(normalizedGrid);
  if (!dataShape) return () => {};

  const minimum = dataShape.minimum;
  const maximum = dataShape.maximum;
  const initialThreshold = Number.isFinite(threshold)
    ? threshold
    : minimum;
  const shader = createCustomShader(
    dataShape,
    initialThreshold,
    Math.min(Math.max(Number(opacity) || 0, 0), 1),
  );
  const provider = createVoxelProvider(normalizedGrid, dataShape);
  const voxelPrimitive = viewer.scene.primitives.add(
    new VoxelPrimitive({
      provider,
      modelMatrix: createModelMatrix(normalizedGrid, verticalExaggeration),
      customShader: shader,
    }),
  );

  const cleanup = () => {
    if (viewer.isDestroyed()) return;
    viewer.scene.primitives.remove(voxelPrimitive);
    if (!shader.isDestroyed()) shader.destroy();
  };
  cleanup.primitive = voxelPrimitive;
  cleanup.minimum = minimum;
  cleanup.maximum = maximum;
  cleanup.boundingSphere = voxelPrimitive.boundingSphere;
  cleanup.setThreshold = (nextThreshold) => {
    const value = Math.min(Math.max(Number(nextThreshold), minimum), maximum);
    shader.setUniform("u_threshold", value);
  };
  cleanup.setOpacity = (nextOpacity) => {
    shader.setUniform(
      "u_opacity",
      Math.min(Math.max(Number(nextOpacity) || 0, 0), 1),
    );
  };
  return cleanup;
}
