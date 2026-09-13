import React, { useEffect, useState } from "react";
import useVizStore from "../../../store/vizStore";
import { fetchVariables } from "../../../services/api";
import Loader from "../../common/Loader";

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TimeSlider() {
  const time = useVizStore((s) => s.time);
  const variable = useVizStore((s) => s.variable);
  const setTime = useVizStore((s) => s.setTime);
  const [times, setTimes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchVariables()
      .then((res) => {
        if (cancelled) return;
        const meta = res.variables.find((v) => v.id === variable) ?? res.variables[0];
        setTimes(meta.available_times);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [variable]);

  if (error) {
    return <p className="control__error">Couldn't load timesteps: {error}</p>;
  }

  if (!times) {
    return <Loader label="Loading timesteps…" size="sm" />;
  }

  const currentIndex = Math.max(0, times.indexOf(time));

  return (
    <div className="control control--slider">
      <div className="control__header">
        <label className="control__label" htmlFor="time-slider">
          Time
        </label>
        <span className="control__value">{formatTime(times[currentIndex])}</span>
      </div>
      <input
        id="time-slider"
        type="range"
        className="control__range"
        min={0}
        max={times.length - 1}
        step={1}
        value={currentIndex}
        onChange={(e) => setTime(times[Number(e.target.value)])}
      />
      <div className="control__range-labels">
        <span>{formatTime(times[0])}</span>
        <span>{formatTime(times[times.length - 1])}</span>
      </div>
    </div>
  );
}
