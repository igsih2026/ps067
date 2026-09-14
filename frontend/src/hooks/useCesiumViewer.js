import { useCallback, useEffect, useRef, useState } from "react";
import {
  BoundingSphere,
  Cartesian3,
  Cartographic,
  Color,
  createWorldImageryAsync,
  createWorldTerrainAsync,
  HeadingPitchRange,
  ImageryLayer,
  Ion,
  sampleTerrainMostDetailed,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from "cesium";
import useVizStore from "../store/vizStore";
import {
  getInstrumentIdFromPickedObject,
  mountInstrumentMarkers,
} from "../components/globe/InstrumentMarkers";
import { mountDepthColumn } from "../components/globe/DepthColumn";
import { mountExploreSlices } from "../components/globe/ExploreSlices";
import useInstrumentData from "./useInstrumentData";
import useModelData from "./useModelData";

// Cesium terrain heights are ellipsoidal, so use a small tolerance around sea level.
const LAND_HEIGHT_THRESHOLD = 10;

export default function useCesiumViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const markerCleanupRef = useRef(null);
  const columnCleanupRef = useRef(null);
  const exploreCleanupRef = useRef(null);
  const instrumentsRef = useRef([]);
  const [clickMessage, setClickMessage] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  const setLandClickMessage = useVizStore((state) => state.setLandClickMessage);
  const setDepth = useVizStore((state) => state.setDepth);
  const mode = useVizStore((state) => state.mode);
  const depth = useVizStore((state) => state.depth);
  const variable = useVizStore((state) => state.variable);
  const verticalExaggeration = useVizStore(
    (state) => state.verticalExaggeration,
  );
  const anchorPoint = useVizStore((state) => state.anchorPoint);
  const exploreRenderer = useVizStore((state) => state.exploreRenderer);
  const enterInspect = useVizStore((state) => state.enterInspect);
  const exitInspect = useVizStore((state) => state.exitInspect);
  const { instruments } = useInstrumentData();
  const setSelectedInstrumentId = useVizStore(
    (state) => state.setSelectedInstrumentId,
  );
  const {
    column,
    currentVariableMeta,
    loading: columnLoading,
    error: columnError,
    slices,
  } = useModelData();
  instrumentsRef.current = instruments;

  const releaseAnchor = useCallback(() => {
    const viewer = viewerRef.current;
    if (viewer && !viewer.isDestroyed()) {
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
    }
    setClickMessage(null);
    exitInspect();
  }, [exitInspect]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

    let viewer;
    let inputHandler;
    let cancelled = false;

    const showMessage = (message) => {
      if (cancelled) return;
      setClickMessage(message);
      setLandClickMessage(message);
    };

    const initializeViewer = async () => {
      try {
        const terrainProvider = await createWorldTerrainAsync({
          requestVertexNormals: true,
          requestWaterMask: true,
        });

        if (cancelled) return;

        viewer = new Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          terrainProvider,
          timeline: false,
        });

        const worldImageryLayer = await ImageryLayer.fromProviderAsync(
          createWorldImageryAsync(),
        );
        if (cancelled) {
          viewer.destroy();
          return;
        }
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.add(worldImageryLayer);

        viewerRef.current = viewer;
        setViewerReady(true);
        markerCleanupRef.current = mountInstrumentMarkers(
          viewer,
          instrumentsRef.current,
          setSelectedInstrumentId,
        );

        viewer.scene.globe.baseColor = Color.fromCssColorString("#1769aa");
        viewer.scene.globe.enableLighting = true;
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(78.9629, 20.5937, 3_500_000),
          duration: 0,
        });

        inputHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        inputHandler.setInputAction(({ position }) => {
          if (cancelled) return;

          const pickedObject = viewer.scene.pick(position);
          const pickedObjects = viewer.scene.drillPick(position);
          console.log("[marker-debug] globe click raw pick", {
            pickedObject,
            pickedType: pickedObject?.constructor?.name ?? null,
            pickedId: pickedObject?.id ?? null,
            pickedPrimitive: pickedObject?.primitive ?? null,
            drillPickResults: pickedObjects,
          });
          const instrumentId = pickedObjects
            .map(getInstrumentIdFromPickedObject)
            .find(Boolean);
          if (instrumentId) {
            console.log("[marker-debug] path: entity-selected", {
              instrumentId,
            });
            setSelectedInstrumentId(instrumentId);
            return;
          }
          if (pickedObject?.id) {
            console.log("[marker-debug] path: picked-object-without-instrument-id", {
              pickedObject,
            });
            return;
          }

          console.log("[marker-debug] path: land/sea-validated");

          const pickedCartesian = viewer.scene.pickPosition(position);
          if (!pickedCartesian) {
            console.log("[marker-debug] land/sea-validated result: no-cartesian");
            showMessage("Unable to determine a globe position.");
            return;
          }

          const cartographic = Cartographic.fromCartesian(pickedCartesian);
          const latitude = (cartographic.latitude * 180) / Math.PI;
          const longitude = (cartographic.longitude * 180) / Math.PI;

          sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic])
            .then(([sampledPoint]) => {
              if (cancelled) return;

              const height = sampledPoint?.height;
              if (!Number.isFinite(height)) {
                console.log("[marker-debug] land/sea-validated result: invalid-height", {
                  height,
                });
                showMessage("Unable to validate this globe position.");
                return;
              }

              const coordinates = {
                lat: Number(latitude.toFixed(5)),
                lon: Number(longitude.toFixed(5)),
              };

              if (height > LAND_HEIGHT_THRESHOLD) {
                console.log("[marker-debug] land/sea-validated result: land", {
                  height,
                  coordinates,
                });
                showMessage("No ocean data here.");
                return;
              }

              console.log("[marker-debug] land/sea-validated result: ocean", {
                height,
                coordinates,
              });

              enterInspect(coordinates.lat, coordinates.lon);
              const message = `Ocean point accepted: ${coordinates.lat.toFixed(5)}°, ${coordinates.lon.toFixed(5)}°`;
              setClickMessage(message);
              setLandClickMessage(message);
              console.log("Accepted ocean point", coordinates);

              viewer.camera.flyToBoundingSphere(
                new BoundingSphere(
                  Cartesian3.fromDegrees(coordinates.lon, coordinates.lat, 0),
                  30_000,
                ),
                {
                  offset: new HeadingPitchRange(0, -Math.PI / 5, 250_000),
                  duration: 1.5,
                  complete: () => {
                    if (!cancelled && !viewer.isDestroyed()) {
                      viewer.scene.screenSpaceCameraController.enableTranslate =
                        false;
                    }
                  },
                },
              );
            })
            .catch(() => {
              console.log("[marker-debug] land/sea-validated result: sampling-error");
              showMessage("Unable to validate this globe position.");
            });
        }, ScreenSpaceEventType.LEFT_CLICK);
      } catch {
        showMessage("Unable to load terrain for globe validation.");
      }
    };

    initializeViewer();

    return () => {
      cancelled = true;
      if (inputHandler && !inputHandler.isDestroyed()) inputHandler.destroy();
      if (viewer && !viewer.isDestroyed()) {
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
      }
      if (markerCleanupRef.current) markerCleanupRef.current();
      if (columnCleanupRef.current) columnCleanupRef.current();
      if (exploreCleanupRef.current) exploreCleanupRef.current();
      markerCleanupRef.current = null;
      columnCleanupRef.current = null;
      exploreCleanupRef.current = null;
      viewerRef.current = null;
      setViewerReady(false);
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return undefined;

    if (markerCleanupRef.current) markerCleanupRef.current();
    markerCleanupRef.current = mountInstrumentMarkers(
      viewer,
      instruments,
      setSelectedInstrumentId,
    );

    return () => {
      if (markerCleanupRef.current) markerCleanupRef.current();
      markerCleanupRef.current = null;
    };
  }, [instruments, setSelectedInstrumentId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (columnCleanupRef.current) columnCleanupRef.current();
    columnCleanupRef.current = null;

    if (viewer && anchorPoint && column) {
      columnCleanupRef.current = mountDepthColumn(
        viewer,
        column,
        anchorPoint,
        variable,
        currentVariableMeta,
        depth,
        verticalExaggeration,
      );
    }

    return () => {
      if (columnCleanupRef.current) columnCleanupRef.current();
      columnCleanupRef.current = null;
    };
  }, [
    anchorPoint,
    column,
    currentVariableMeta,
    depth,
    variable,
    verticalExaggeration,
  ]);

  useEffect(() => {
    const primitive = columnCleanupRef.current?.primitive;
    if (primitive && !primitive.isDestroyed()) {
      primitive.show = mode === "inspect";
    }
  }, [mode]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (exploreCleanupRef.current) exploreCleanupRef.current();
    exploreCleanupRef.current = null;

    if (viewer && mode === "explore" && exploreRenderer === "flat-slice" && slices) {
      exploreCleanupRef.current = mountExploreSlices(
        viewer,
        slices,
        verticalExaggeration,
      );
    }

    return () => {
      if (exploreCleanupRef.current) exploreCleanupRef.current();
      exploreCleanupRef.current = null;
    };
  }, [exploreRenderer, mode, slices, verticalExaggeration, viewerReady]);

  useEffect(() => {
    const primitives = exploreCleanupRef.current?.primitives ?? [];
    primitives.forEach((primitive) => {
      if (!primitive.isDestroyed()) primitive.show = mode === "explore";
    });
  }, [mode]);

  return {
    anchorPoint,
    clickMessage,
    column,
    columnError,
    columnLoading,
    containerRef,
    depth,
    mode,
    releaseAnchor,
    setDepth,
  };
}
