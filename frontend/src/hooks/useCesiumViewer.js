import { useEffect, useRef } from "react";
import {
  Color,
  createWorldTerrainAsync,
  Ion,
  Viewer,
} from "cesium";

export default function useCesiumViewer() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

    let viewer;
    let cancelled = false;

    const initializeViewer = async () => {
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

      viewer.scene.globe.baseColor = Color.fromCssColorString("#1769aa");
      viewer.scene.globe.enableLighting = true;
    };

    initializeViewer();

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  return containerRef;
}
