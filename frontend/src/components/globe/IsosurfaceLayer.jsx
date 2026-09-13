import {
  BoundingSphere,
  Cartesian3,
  Color,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryInstance,
  IndexDatatype,
  Material,
  MaterialAppearance,
  Primitive,
  PrimitiveType,
} from "cesium";

const MIN_VISUAL_SCALE = 1;
const MAX_VISUAL_SCALE = 20;

const VARIABLE_COLORS = {
  temperature: "#ff7a59",
  salinity: "#48cae4",
  dissolved_o2: "#80ed99",
  nitrate: "#ffd166",
  phosphate: "#c77dff",
  silicate: "#f4a261",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toCartesianVertices(vertices, visualScale) {
  if (!Array.isArray(vertices)) return [];

  return vertices.flatMap((vertex) => {
    if (!Array.isArray(vertex) || vertex.length < 3) return [];
    const [lon, lat, depth] = vertex.map(Number);
    if (![lon, lat, depth].every(Number.isFinite)) return [];
    const point = Cartesian3.fromDegrees(lon, lat, -depth * visualScale);
    return [point.x, point.y, point.z];
  });
}

function flattenFaces(mesh) {
  const faces = mesh?.faces ?? mesh?.indices ?? [];
  if (!Array.isArray(faces)) return [];
  return faces.flatMap((face) => (Array.isArray(face) ? face : [face]));
}

function computeVertexNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let index = 0; index + 2 < indices.length; index += 3) {
    const a = indices[index] * 3;
    const b = indices[index + 1] * 3;
    const c = indices[index + 2] * 3;
    if ([a, b, c].some((offset) => offset < 0 || offset + 2 >= positions.length)) {
      continue;
    }

    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    [a, b, c].forEach((offset) => {
      normals[offset] += nx;
      normals[offset + 1] += ny;
      normals[offset + 2] += nz;
    });
  }

  for (let index = 0; index < normals.length; index += 3) {
    const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]);
    if (length > 0) {
      normals[index] /= length;
      normals[index + 1] /= length;
      normals[index + 2] /= length;
    } else {
      normals[index + 2] = 1;
    }
  }
  return normals;
}

/** Mount a backend-generated indexed isosurface mesh and return its cleanup. */
export function mountIsosurface(
  viewer,
  mesh,
  variable,
  verticalExaggeration = 1,
) {
  if (!viewer || viewer.isDestroyed() || !mesh?.vertices?.length) return () => {};

  const visualScale = clamp(
    Number(verticalExaggeration) || 1,
    MIN_VISUAL_SCALE,
    MAX_VISUAL_SCALE,
  );
  const positions = toCartesianVertices(mesh.vertices, visualScale);
  const indices = flattenFaces(mesh).map(Number);
  if (positions.length === 0 || indices.length < 3) return () => {};

  const cartesianPositions = [];
  for (let index = 0; index < positions.length; index += 3) {
    cartesianPositions.push(
      new Cartesian3(positions[index], positions[index + 1], positions[index + 2]),
    );
  }

  const geometry = new Geometry({
    attributes: {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array(positions),
      }),
      normal: new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: computeVertexNormals(positions, indices),
      }),
    },
    boundingSphere: BoundingSphere.fromPoints(cartesianPositions),
    indices: IndexDatatype.createTypedArray(cartesianPositions.length, indices),
    primitiveType: PrimitiveType.TRIANGLES,
  });
  const color = Color.fromCssColorString(
    VARIABLE_COLORS[variable] ?? "#f4c95d",
  ).withAlpha(0.78);
  const primitive = viewer.scene.primitives.add(
    new Primitive({
      appearance: new MaterialAppearance({
        flat: true,
        material: Material.fromType("Color", { color }),
        translucent: true,
        vertexFormat: MaterialAppearance.MaterialSupport.BASIC.vertexFormat,
      }),
      asynchronous: false,
      geometryInstances: new GeometryInstance({
        id: `isosurface-${variable}-${mesh.isoValue ?? "default"}`,
        geometry,
      }),
    }),
  );

  const cleanup = () => {
    if (!viewer.isDestroyed()) viewer.scene.primitives.remove(primitive);
  };
  cleanup.primitives = [primitive];
  cleanup.primitive = primitive;
  return cleanup;
}
