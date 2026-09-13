import {
  BoxGeometry,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  Matrix4,
  PerInstanceColorAppearance,
  Primitive,
} from "cesium";

export const COLUMN_VARIABLES = [
  "temperature",
  "salinity",
  "dissolved_o2",
  "nitrate",
  "phosphate",
  "silicate",
];

const BOX_WIDTH = 30_000;
const BOX_HEIGHT = 80;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function colorRamp(value, min, max, highlighted) {
  const normalized = clamp((value - min) / Math.max(max - min, 1e-9), 0, 1);
  const color = Color.fromHsl(0.66 - normalized * 0.66, 0.82, 0.5, highlighted ? 1 : 0.35);
  return highlighted ? color.brighten(0.45, new Color()).withAlpha(1) : color;
}

function getSteps(column) {
  if (Array.isArray(column?.steps)) return column.steps;

  const depths = column?.depths ?? [];
  return depths.map((depth, index) => ({
    depth,
    ...Object.fromEntries(
      COLUMN_VARIABLES.map((variable) => [variable, column?.values?.[variable]?.[index]]),
    ),
  }));
}

function getRange(steps, variable, meta) {
  const values = steps.map((step) => Number(step[variable])).filter(Number.isFinite);
  const min = Number.isFinite(meta?.min) ? meta.min : Math.min(...values);
  const max = Number.isFinite(meta?.max) ? meta.max : Math.max(...values);
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 1,
  };
}

/** Mount one colored box primitive per depth sample and return its cleanup. */
export function mountDepthColumn(
  viewer,
  column,
  anchorPoint,
  variable,
  variableMeta,
  selectedDepth,
  verticalExaggeration = 1,
) {
  if (!viewer || viewer.isDestroyed() || !column || !anchorPoint) return () => {};

  const steps = getSteps(column);
  const range = getRange(steps, variable, variableMeta);
  // Keep the depth readout physical while making the 2 km drill core visible
  // at the anchored camera distance. The scale is intentionally bounded.
  const visualDepthScale = clamp(Number(verticalExaggeration) || 1, 1, 20);
  const geometryInstances = steps
    .filter((step) => Number.isFinite(Number(step.depth)))
    .map((step) => {
      const depth = Number(step.depth);
      const value = Number(step[variable]);
      const highlighted = depth === Number(selectedDepth);
      const color = colorRamp(
        Number.isFinite(value) ? value : range.min,
        range.min,
        range.max,
        highlighted,
      );

      return new GeometryInstance({
        id: `column-${depth}`,
        geometry: BoxGeometry.fromDimensions({
          dimensions: new Cartesian3(
            BOX_WIDTH,
            BOX_WIDTH,
            BOX_HEIGHT * visualDepthScale,
          ),
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        modelMatrix: Matrix4.fromTranslation(
          Cartesian3.fromDegrees(
            anchorPoint.lon,
            anchorPoint.lat,
            -depth * visualDepthScale,
          ),
        ),
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(color),
        },
      });
    });

  if (geometryInstances.length === 0) return () => {};

  const primitive = viewer.scene.primitives.add(
    new Primitive({
      appearance: new PerInstanceColorAppearance({
        flat: true,
        translucent: true,
      }),
      asynchronous: false,
      geometryInstances,
    }),
  );

  const cleanup = () => {
    if (!viewer.isDestroyed()) viewer.scene.primitives.remove(primitive);
  };
  cleanup.primitive = primitive;
  return cleanup;
}
