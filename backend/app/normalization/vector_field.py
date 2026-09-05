# Section 3.2: Common Vector Field Representation.
# Currents come as two separate variables (uo = eastward, vo = northward).
# This combines them into ONE standard vector structure with magnitude
# and direction, so downstream code (API, frontend) doesn't have to deal
# with u/v components separately.

import numpy as np


def to_common_vector_field(ds_uo, ds_vo, variable_name: str = "currents") -> dict:
    """
    ds_uo, ds_vo: already-subsetted xarray Datasets (same depth/time/bbox)
    containing 'uo' and 'vo' respectively -- i.e. what full_subset() returns
    when called separately for each component.
    """
    lat_name = "latitude" if "latitude" in ds_uo.coords else "lat"
    lon_name = "longitude" if "longitude" in ds_uo.coords else "lon"

    u_values = ds_uo["uo"].values  # eastward component (m/s)
    v_values = ds_vo["vo"].values  # northward component (m/s)

    # magnitude: how fast the current is moving, regardless of direction
    magnitude = np.sqrt(u_values**2 + v_values**2)

    # direction: compass bearing the current flows TOWARD, in degrees (0=North, 90=East)
    # arctan2 handles all four quadrants correctly, unlike plain arctan
    direction = (np.degrees(np.arctan2(u_values, v_values))) % 360

    def clean(arr):
        # NaN -> None, so this is safe to JSON-serialize
        return np.where(np.isnan(arr), None, arr).tolist()

    return {
        "variable": variable_name,
        "units": "m s-1",
        "time": str(ds_uo["time"].values) if "time" in ds_uo.coords else None,
        "depth": float(ds_uo["depth"].values) if "depth" in ds_uo.coords else None,
        "latitude": ds_uo[lat_name].values.tolist(),
        "longitude": ds_uo[lon_name].values.tolist(),
        "u": clean(u_values),           # eastward component
        "v": clean(v_values),           # northward component
        "magnitude": clean(magnitude),  # speed
        "direction": clean(direction),  # compass bearing, degrees
        "metadata": {
            "source": ds_uo.attrs.get("source", "unknown"),
            "institution": ds_uo.attrs.get("institution", "unknown"),
            "conventions": ds_uo.attrs.get("Conventions", "unknown"),
        },
    }