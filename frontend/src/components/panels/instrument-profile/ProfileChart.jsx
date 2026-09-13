import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import useInstrumentData from "../../../hooks/useInstrumentData";
import usePanelState from "../../../hooks/usePanelState";
import { fetchVariables } from "../../../services/api";
import useVizStore from "../../../store/vizStore";
import "./ProfileChart.css";

/**
 * Depth-vs-variable Plotly chart for the store's selectedInstrumentId.
 * Marker clicks (globe) write the id; this component only reads it + profile data.
 */
export default function ProfileChart() {
  const plotRef = useRef(null);
  const variable = useVizStore((s) => s.variable);
  const depth = useVizStore((s) => s.depth);
  const { instrumentPanelOpen, selectedInstrumentId } = usePanelState();
  const { profile, profileLoading, error } = useInstrumentData();
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchVariables()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const meta = catalog?.variables?.find((v) => v.id === variable);
  const label = meta?.display_name ?? variable;
  const units = meta?.units ?? "";
  const depths = profile?.profile?.depths ?? [];
  const values = profile?.profile?.[variable] ?? null;
  const hasSeries = Array.isArray(values) && Array.isArray(depths) && values.length === depths.length && values.length > 0;

  useEffect(() => {
    const el = plotRef.current;
    if (!el || !hasSeries) {
      if (el) Plotly.purge(el);
      return undefined;
    }

    const xMin = Math.min(...values);
    const xMax = Math.max(...values);
    const pad = (xMax - xMin) * 0.08 || 1;

    const traces = [
      {
        x: values,
        y: depths,
        type: "scatter",
        mode: "lines+markers",
        name: label,
        line: { color: "#4fd8c4", width: 2 },
        marker: { size: 6, color: "#7ec8e3" },
        hovertemplate: `${label}: %{x:.2f} ${units}<br>Depth: %{y} m<extra></extra>`,
      },
    ];

    const nearestIdx = depths.reduce((best, d, i) =>
      Math.abs(d - depth) < Math.abs(depths[best] - depth) ? i : best,
    0);

    traces.push({
      x: [values[nearestIdx]],
      y: [depths[nearestIdx]],
      type: "scatter",
      mode: "markers",
      name: "Selected depth",
      marker: {
        size: 11,
        color: "#ff9f5a",
        symbol: "diamond",
        line: { color: "#0f1e2b", width: 1 },
      },
      hovertemplate: `Store depth ${depth} m<br>${label}: %{x:.2f} ${units}<extra></extra>`,
      showlegend: false,
    });

    const layout = {
      title: {
        text: `${label} profile`,
        font: { size: 13, color: "#e8eef2" },
        x: 0,
        xanchor: "left",
      },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(15, 30, 43, 0.55)",
      font: { color: "#e8eef2", size: 11, family: "system-ui, sans-serif" },
      margin: { t: 36, r: 18, b: 44, l: 56 },
      xaxis: {
        title: units ? `${label} (${units})` : label,
        gridcolor: "rgba(255,255,255,0.08)",
        zeroline: false,
        range: [xMin - pad, xMax + pad],
      },
      yaxis: {
        title: "Depth (m)",
        autorange: "reversed",
        gridcolor: "rgba(255,255,255,0.08)",
        zeroline: false,
      },
      shapes: [
        {
          type: "line",
          xref: "paper",
          x0: 0,
          x1: 1,
          y0: depth,
          y1: depth,
          line: { color: "#ff9f5a", width: 1, dash: "dot" },
        },
      ],
      showlegend: false,
      hovermode: "closest",
    };

    const config = {
      displayModeBar: false,
      responsive: true,
    };

    Plotly.react(el, traces, layout, config);

    const onResize = () => {
      Plotly.Plots.resize(el);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      Plotly.purge(el);
    };
  }, [hasSeries, values, depths, label, units, depth, selectedInstrumentId]);

  if (!instrumentPanelOpen) {
    return (
      <section className="profile-chart profile-chart--empty">
        <p>Select an Argo float or glider marker to see its depth profile.</p>
      </section>
    );
  }

  if (profileLoading && !profile) {
    return (
      <section className="profile-chart">
        <p>Loading profile…</p>
      </section>
    );
  }

  if (error && !profile) {
    return (
      <section className="profile-chart">
        <p>Could not load this instrument profile.</p>
      </section>
    );
  }

  if (!hasSeries) {
    return (
      <section className="profile-chart">
        <p>No {label} profile for {selectedInstrumentId ?? "this instrument"}.</p>
      </section>
    );
  }

  return (
    <section className="profile-chart" aria-label={`${label} depth profile`}>
      <div ref={plotRef} className="profile-chart__plot" />
    </section>
  );
}
