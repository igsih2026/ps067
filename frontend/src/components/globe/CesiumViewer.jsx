import useCesiumViewer from "../../hooks/useCesiumViewer";

export default function CesiumViewer() {
  const containerRef = useCesiumViewer();

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
