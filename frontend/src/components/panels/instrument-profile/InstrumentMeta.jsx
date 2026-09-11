import useInstrumentData from "../../../hooks/useInstrumentData";
import usePanelState from "../../../hooks/usePanelState";
import "./InstrumentMeta.css";

function formatCoord(value, positive, negative) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const hemi = n >= 0 ? positive : negative;
  return `${Math.abs(n).toFixed(4)}° ${hemi}`;
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

/**
 * Instrument ID, type, lat/lon, timestamp for the store's selectedInstrumentId.
 * ProfileChart (Day 3) will sit beside this; keep the data shape identical.
 */
export default function InstrumentMeta() {
  const { instrumentPanelOpen, clearSelectedInstrument } = usePanelState();
  const { selectedInstrument, profile, profileLoading, error } = useInstrumentData();

  if (!instrumentPanelOpen) {
    return (
      <aside className="instrument-meta instrument-meta--empty">
        <p>Select an Argo float or glider marker to see its metadata.</p>
      </aside>
    );
  }

  if (profileLoading && !profile && !selectedInstrument) {
    return (
      <aside className="instrument-meta">
        <p>Loading instrument…</p>
      </aside>
    );
  }

  if (error && !profile && !selectedInstrument) {
    return (
      <aside className="instrument-meta">
        <p>Could not load this instrument.</p>
      </aside>
    );
  }

  const meta = profile ?? selectedInstrument;
  const typeLabel = meta?.type === "glider" ? "Glider" : "Argo float";

  return (
    <aside className="instrument-meta">
      <header className="instrument-meta__header">
        <div>
          <p className="instrument-meta__kicker">{typeLabel}</p>
          <h2 className="instrument-meta__title">{meta?.id ?? "Unknown"}</h2>
        </div>
        <button type="button" onClick={clearSelectedInstrument}>
          Close
        </button>
      </header>
      <dl className="instrument-meta__grid">
        <div>
          <dt>Platform</dt>
          <dd>{meta?.platform_number ?? "—"}</dd>
        </div>
        <div>
          <dt>Latitude</dt>
          <dd>{formatCoord(meta?.lat, "N", "S")}</dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>{formatCoord(meta?.lon, "E", "W")}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd>{formatTimestamp(meta?.timestamp)}</dd>
        </div>
      </dl>
    </aside>
  );
}
