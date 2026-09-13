import React, { useEffect, useState } from "react";
import useVizStore from "../../../store/vizStore";
import { fetchVariables } from "../../../services/api";
import Loader from "../../common/Loader";

export default function VariableSelector() {
  const variable = useVizStore((s) => s.variable);
  const setVariable = useVizStore((s) => s.setVariable);
  const [variables, setVariables] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchVariables()
      .then((res) => {
        if (!cancelled) setVariables(res.variables);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="control__error">Couldn't load variables: {error}</p>;
  }

  if (!variables) {
    return <Loader label="Loading variables…" size="sm" />;
  }

  const current = variables.find((v) => v.id === variable) ?? variables[0];

  return (
    <div className="control control--select">
      <label className="control__label" htmlFor="variable-selector">
        Variable
      </label>
      <select
        id="variable-selector"
        className="control__select"
        value={current.id}
        onChange={(e) => setVariable(e.target.value)}
      >
        {variables.map((v) => (
          <option key={v.id} value={v.id}>
            {v.display_name}
          </option>
        ))}
      </select>
      <span className="control__unit">{current.units}</span>
    </div>
  );
}
