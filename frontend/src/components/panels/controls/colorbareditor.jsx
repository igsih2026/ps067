import React, { useEffect, useState } from "react";
import useVizStore from "../../../store/vizStore";
import { fetchVariables } from "../../../services/api";

export default function ColorbarEditor() {
  const colorbar = useVizStore((s) => s.colorbar);
  const setColorbar = useVizStore((s) => s.setColorbar);
  const variable = useVizStore((s) => s.variable);
  const [defaults, setDefaults] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchVariables().then((res) => {
      if (cancelled) return;
      const meta = res.variables.find((v) => v.id === variable) ?? res.variables[0];
      setDefaults({ min: meta.min, max: meta.max });
    });
    return () => {
      cancelled = true;
    };
  }, [variable]);

  const displayMin = colorbar.min ?? defaults?.min ?? 0;
  const displayMax = colorbar.max ?? defaults?.max ?? 1;
  const isOverridden = colorbar.min != null || colorbar.max != null;

  return (
    <div className="control control--colorbar">
      <div className="control__header">
        <span className="control__label">Colorbar</span>
        {isOverridden && (
          <button
            type="button"
            className="control__reset"
            onClick={() => setColorbar({ min: null, max: null })}
          >
            Reset
          </button>
        )}
      </div>

      <div className="colorbar__preview" aria-hidden="true" />

      <div className="colorbar__row">
        <label className="colorbar__field">
          <span>Min</span>
          <input
            type="number"
            className="control__number"
            value={displayMin}
            onChange={(e) => setColorbar({ ...colorbar, min: Number(e.target.value) })}
          />
        </label>
        <label className="colorbar__field">
          <span>Max</span>
          <input
            type="number"
            className="control__number"
            value={displayMax}
            onChange={(e) => setColorbar({ ...colorbar, max: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
