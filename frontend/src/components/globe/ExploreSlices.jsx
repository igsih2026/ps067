import {
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  Material,
  MaterialAppearance,
  PolylineColorAppearance,
  PolylineGeometry,
  Primitive,
  Rectangle,
  RectangleGeometry,
} from "cesium";

const MIN_VISUAL_SCALE = 1;
const MAX_VISUAL_SCALE = 20;
const SLICE_ALPHA = 0.78;
const OUTLINE_COLOR = Color.fromCssColorString("#f4c95d").withAlpha(0.9);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRegion(slices) {
  return slices?.bbox ?? slices?.bands?.[0];
}

/** Mount textured depth bands and a box outline for Explore mode. */
export function mountExploreSlices(
  viewer,
  slices,
  verticalExaggeration = 1,
) {
  if (!viewer || viewer.isDestroyed() || !slices?.bands?.length) return () => {};

  const region = getRegion(slices);
  if (!region) return () => {};

  const visualScale = clamp(Number(verticalExaggeration) || 1, MIN_VISUAL_SCALE, MAX_VISUAL_SCALE);
  const bandPrimitives = slices.bands.map((band) => {
    const depth = Number(band.depth ?? band.depth_min ?? 0);
    const rectangle = Rectangle.fromDegrees(
      Number(band.west ?? region.west),
      Number(band.south ?? region.south),
      Number(band.east ?? region.east),
      Number(band.north ?? region.north),
    );
    const material = Material.fromType("Image", {
      image: band.imageUrl,
      color: Color.WHITE.withAlpha(SLICE_ALPHA),
    });
    return viewer.scene.primitives.add(
      new Primitive({
        appearance: new MaterialAppearance({
          faceForward: true,
          flat: true,
          material,
          translucent: true,
        }),
        asynchronous: false,
        geometryInstances: new GeometryInstance({
          id: `explore-slice-${depth}`,
          geometry: new RectangleGeometry({
            rectangle,
            height: -depth * visualScale,
            vertexFormat: MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
          }),
        }),
      }),
    );
  });

  const corners = [
    [Number(region.west), Number(region.south)],
    [Number(region.east), Number(region.south)],
    [Number(region.east), Number(region.north)],
    [Number(region.west), Number(region.north)],
  ];
  const maxDepth = Math.max(
    ...slices.bands.map((band) => Number(band.depth_max ?? band.depth ?? 0)),
  );
  const bottom = -maxDepth * visualScale;
  const outlineEdges = [];
  const addEdge = (start, end, height) => {
    outlineEdges.push([start, end, height]);
  };
  for (let index = 0; index < corners.length; index += 1) {
    addEdge(corners[index], corners[(index + 1) % corners.length], 0);
    addEdge(corners[index], corners[(index + 1) % corners.length], bottom);
    addEdge(corners[index], corners[index], 0);
    addEdge(corners[index], corners[index], bottom);
  }

  const outline = viewer.scene.primitives.add(
    new Primitive({
      appearance: new PolylineColorAppearance({
        translucent: true,
      }),
      asynchronous: false,
      geometryInstances: outlineEdges.map(([start, end, height]) =>
        new GeometryInstance({
          geometry: new PolylineGeometry({
            positions: [
              Cartesian3.fromDegrees(start[0], start[1], height),
              Cartesian3.fromDegrees(end[0], end[1], height),
            ],
            width: 3,
          }),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(OUTLINE_COLOR),
          },
        }),
      ),
    }),
  );

  const primitives = [...bandPrimitives, outline];
  const cleanup = () => {
    if (viewer.isDestroyed()) return;
    primitives.forEach((primitive) => viewer.scene.primitives.remove(primitive));
  };
  cleanup.primitives = primitives;
  return cleanup;
}
