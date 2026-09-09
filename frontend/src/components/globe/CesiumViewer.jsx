import useCesiumViewer from "../../hooks/useCesiumViewer";

export default function CesiumViewer() {
  const { containerRef, clickMessage } = useCesiumViewer();

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {clickMessage && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.6rem 0.9rem",
            color: "#fff",
            background: "rgba(0, 0, 0, 0.72)",
            borderRadius: "0.25rem",
            pointerEvents: "none",
          }}
        >
          {clickMessage}
        </div>
      )}
    </div>
  );
}
