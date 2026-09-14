import {
  Cartesian3,
  Color,
  CustomDataSource,
  HeightReference,
  JulianDate,
  NearFarScalar,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";

const DATA_SOURCE_NAME = "instrument-markers";
const MARKER_ID_PREFIX = "instrument-marker-";
const ARGO_COLOR = Color.fromCssColorString("#1f78b4");
const GLIDER_COLOR = Color.fromCssColorString("#ef6c5b");

export function getInstrumentId(entity) {
  if (typeof entity === "string") {
    return entity.startsWith(MARKER_ID_PREFIX)
      ? entity.slice(MARKER_ID_PREFIX.length)
      : entity;
  }

  const property = entity?.properties?.instrumentId;
  const instrumentId =
    property?.getValue?.(JulianDate.now()) ?? property ?? entity?.id ?? null;
  return typeof instrumentId === "string" && instrumentId.startsWith(MARKER_ID_PREFIX)
    ? instrumentId.slice(MARKER_ID_PREFIX.length)
    : instrumentId;
}

export function getInstrumentIdFromPickedObject(pickedObject) {
  return getInstrumentId(pickedObject?.id);
}

/**
 * Mounts instrument point entities and their click handler on a Cesium viewer.
 * The returned cleanup function removes everything created by this mount.
 */
export function mountInstrumentMarkers(viewer, instruments, onSelect) {
  if (!viewer || viewer.isDestroyed()) return () => {};

  const dataSource = new CustomDataSource(DATA_SOURCE_NAME);
  const inputHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

  instruments.forEach((instrument) => {
    const isGlider = instrument.type?.toLowerCase() === "glider";
    const color = isGlider ? GLIDER_COLOR : ARGO_COLOR;

    dataSource.entities.add({
      id: `instrument-marker-${instrument.id}`,
      name: instrument.name ?? instrument.id,
      position: Cartesian3.fromDegrees(instrument.lon, instrument.lat),
      properties: {
        instrumentId: instrument.id,
      },
      point: {
        color,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        pixelSize: isGlider ? 12 : 10,
        scaleByDistance: new NearFarScalar(1.5e6, 1.4, 1.5e7, 0.7),
      },
    });
  });

  viewer.dataSources.add(dataSource);
  inputHandler.setInputAction(({ position }) => {
    const rawPickedObject = viewer.scene.pick(position);
    const pickedObjects = viewer.scene.drillPick(position);
    console.log("[marker-debug] marker handler raw pick", {
      pickedObject: rawPickedObject,
      pickedType: rawPickedObject?.constructor?.name ?? null,
      pickedId: rawPickedObject?.id ?? null,
      pickedPrimitive: rawPickedObject?.primitive ?? null,
      drillPickResults: pickedObjects,
    });
    const instrumentId = pickedObjects
      .map(getInstrumentIdFromPickedObject)
      .find(Boolean);
    if (instrumentId) {
      console.log("[marker-debug] marker handler path: entity-selected", {
        instrumentId,
      });
      onSelect(instrumentId);
      return;
    }

    console.log("[marker-debug] marker handler path: no-instrument-entity");
  }, ScreenSpaceEventType.LEFT_CLICK);

  return () => {
    if (!inputHandler.isDestroyed()) inputHandler.destroy();
    if (!viewer.isDestroyed()) viewer.dataSources.remove(dataSource, true);
  };
}
