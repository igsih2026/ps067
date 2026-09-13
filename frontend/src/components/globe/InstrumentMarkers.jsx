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
const ARGO_COLOR = Color.fromCssColorString("#1f78b4");
const GLIDER_COLOR = Color.fromCssColorString("#ef6c5b");

function getInstrumentId(entity) {
  const property = entity?.properties?.instrumentId;
  return property?.getValue?.(JulianDate.now()) ?? entity?.id ?? null;
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
    const pickedObject = viewer.scene.pick(position);
    const instrumentId = getInstrumentId(pickedObject?.id);
    if (instrumentId) onSelect(instrumentId);
  }, ScreenSpaceEventType.LEFT_CLICK);

  return () => {
    if (!inputHandler.isDestroyed()) inputHandler.destroy();
    if (!viewer.isDestroyed()) viewer.dataSources.remove(dataSource, true);
  };
}
