import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import useInstrumentData from "../../../hooks/useInstrumentData";
import usePanelState from "../../../hooks/usePanelState";
import { fetchTimeseries, fetchVariables } from "../../../services/api";
import useVizStore from "../../../store/vizStore";
import "./TimeseriesChart.css";

function idSeed(id) {
  if (!id) return 0;
  return id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/**
 * Selected-variable time series at the current depth, pinned to the
 * selected instrument's lat/lon. Marker clicks only set the id; this
 * chart reads store + mocks the same way ProfileChart does.
 */
export default function TimeseriesChart() {
  const plotRef = useRef(null);
  const variable = useVizStore((s) => s.variable);
  const depth = useVizStore((s) => s.depth);
  const time = useVizStore((s) => s.time);
  const setTime = useVizStore((s) => s.setTime);
  const { instrumentPanelOpen, selectedInstrumentId } = usePanelState();
  const { profile, selectedInstrument, profileLoading, error } = useInstrumentData();
  const [catalog, setCatalog] = useState(null);
  const [series, setSeries] = useState(null);
  const [seriesError, setSeriesError] = useState(null);

  const loc = profile ?? selectedInstrument;
  const lat = loc?.lat;
  const lon = loc?.lon;

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

  useEffect(() => {
    if (!selectedInstrumentId || lat == null || lon == null) {
      setSeries(null);
      return undefined;
    }

    let cancelled = false;
    setSeriesError(null);
    fetchTimeseries(variable, {
      depth,
      lat,
      lon,
      seed: idSeed(selectedInstrumentId),
    })
      .then((data) => {
        if (!cancelled) setSeries(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setSeries(null);
          setSeriesError(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedInstrumentId, variable, depth, lat, lon]);

  const meta = catalog?.variables?.find((v) => v.id === variable);
  const label = meta?.display_name ?? series?.long_name ?? variable;
  const units = meta?.units ?? series?.units ?? "";
  const times = series?.times ?? [];
  const values = series?.values ?? [];
  const hasSeries = times.length > 0 && times.length === values.length;

  useEffect(() => {
    const el = plotRef.current;
    if (!el || !hasSeries) {
      if (el) Plotly.purge(el);
      return undefined;
    }

    const yMin = Math.min(...values);
    const yMax = Math.max(...values);
    const pad = (yMax - yMin) * 0.18 || 0.4;

    const traces = [
      {
        x: times,
        y: values,
        type: "scatter",
        mode: "lines+markers",
        name: label,
        line: { color: "#7ec8e3", width: 2, shape: "spline" },
        marker: { size: 6, color: "#4fd8c4" },
        hovertemplate: `%{x|%b %d}<br>${label}: %{y:.2f} ${units}<extra></extra>`,
      },
    ];

    const currentIdx = Math.max(0, times.indexOf(time));
    traces.push({
      x: [times[currentIdx]],
      y: [values[currentIdx]],
      type: "scatter",
      mode: "markers",
      name: "Selected time",
      marker: {
        size: 11,
        color: "#ff9f5a",
        symbol: "diamond",
        line: { color: "#0f1e2b", width: 1 },
      },
      hovertemplate: `Store time<br>${label}: %{y:.2f} ${units}<extra></extra>`,
      showlegend: false,
    });

    const layout = {
      title: {
        text: `${label} at ${depth} m`,
        font: { size: 13, color: "#e8eef2" },
        x: 0,
        xanchor: "left",
      },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(15, 30, 43, 0.55)",
      font: { color: "#e8eef2", size: 11, family: "system-ui, sans-serif" },
      margin: { t: 36, r: 18, b: 40, l: 52 },
      xaxis: {
        title: "",
        type: "date",
        gridcolor: "rgba(255,255,255,0.08)",
        zeroline: false,
        tickformat: "%b %d",
      },
      yaxis: {
        title: units ? `${units}` : label,
        gridcolor: "rgba(255,255,255,0.08)",
        zeroline: false,
        range: [yMin - pad, yMax + pad],
      },
      showlegend: false,
      hovermode: "closest",
    };

    const config = {
      displayModeBar: false,
      responsive: true,
    };

    Plotly.react(el, traces, layout, config);

    const onClick = (event) => {
      const next = event?.points?.[0]?.x;
      if (next == null) return;
      const iso = typeof next === "string" ? next : new Date(next).toISOString().replace(/\.\d{3}Z$/, "Z");
      const match = times.find((t) => t === iso || t.startsWith(iso.slice(0, 10)));
      if (match) setTime(match);
    };
    el.on("plotly_click", onClick);

    const onResize = () => {
      Plotly.Plots.resize(el);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (el.removeAllListeners) el.removeAllListeners("plotly_click");
      Plotly.purge(el);
    };
  }, [hasSeries, times, values, label, units, depth, time, setTime]);

  if (!instrumentPanelOpen) {
    return (
      <section className="timeseries-chart timeseries-chart--empty">
        <p>Select an instrument to see the time series at this depth.</p>
      </section>
    );
  }

  if ((profileLoading && !loc) || (!series && !seriesError && selectedInstrumentId)) {
    return (
      <section className="timeseries-chart">
        <p>Loading time series…</p>
      </section>
    );
  }

  if ((error || seriesError) && !hasSeries) {
    return (
      <section className="timeseries-chart">
        <p>Could not load this time series.</p>
      </section>
    );
  }

  if (!hasSeries) {
    return (
      <section className="timeseries-chart">
        <p>No {label} time series for {selectedInstrumentId ?? "this instrument"}.</p>
      </section>
    );
  }

  return (
    <section className="timeseries-chart" aria-label={`${label} time series`}>
      <div ref={plotRef} className="timeseries-chart__plot" />
    </section>
  );
}
