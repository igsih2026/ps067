import { useEffect, useRef, useState } from "react";
import {
  Cartesian3,
  Cartographic,
  Color,
  createWorldTerrainAsync,
  Ion,
  sampleTerrainMostDetailed,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from "cesium";
import useVizStore from "../store/vizStore";
import { mountInstrumentMarkers } from "../components/globe/InstrumentMarkers";
import useInstrumentData from "./useInstrumentData";

// Cesium terrain heights are ellipsoidal, so use a small tolerance around sea level.
const LAND_HEIGHT_THRESHOLD = 10;

export default function useCesiumViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const markerCleanupRef = useRef(null);
  const instrumentsRef = useRef([]);
  const [clickMessage, setClickMessage] = useState(null);
  const setAnchorPoint = useVizStore((state) => state.setAnchorPoint);
  const setLandClickMessage = useVizStore((state) => state.setLandClickMessage);
  const { instruments } = useInstrumentData();
  const setSelectedInstrumentId = useVizStore(
    (state) => state.setSelectedInstrumentId,
  );
  instrumentsRef.current = instruments;

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
          baseLayer: false,
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
        viewerRef.current = viewer;
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
          if (pickedObject?.id) return;

          const pickedCartesian = viewer.scene.pickPosition(position);
          if (!pickedCartesian) {
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
                showMessage("Unable to validate this globe position.");
                return;
              }

              const coordinates = {
                lat: Number(latitude.toFixed(5)),
                lon: Number(longitude.toFixed(5)),
              };

              if (height > LAND_HEIGHT_THRESHOLD) {
                showMessage("No ocean data here.");
                return;
              }

              setAnchorPoint(coordinates);
              const message = `Ocean point accepted: ${coordinates.lat.toFixed(5)}°, ${coordinates.lon.toFixed(5)}°`;
              setClickMessage(message);
              setLandClickMessage(message);
              console.log("Accepted ocean point", coordinates);
            })
            .catch(() => {
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
      if (markerCleanupRef.current) markerCleanupRef.current();
      markerCleanupRef.current = null;
      viewerRef.current = null;
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

  return { containerRef, clickMessage };
}
