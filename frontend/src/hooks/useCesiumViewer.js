import { useEffect, useRef } from "react";
import {
  Color,
  EllipsoidTerrainProvider,
  Viewer,
} from "cesium";

export default function useCesiumViewer() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const viewer = new Viewer(containerRef.current, {
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
      terrainProvider: new EllipsoidTerrainProvider(),
      timeline: false,
    });

    viewer.scene.globe.baseColor = Color.fromCssColorString("#1769aa");

    return () => viewer.destroy();
  }, []);

  return containerRef;
}
