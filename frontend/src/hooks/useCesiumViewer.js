import { useEffect, useRef } from "react";
import {
  Cartesian3,
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
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(78.9629, 20.5937, 3_500_000),
        duration: 0,
      });
    };

    initializeViewer();

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  return containerRef;
}
