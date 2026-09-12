import numpy as np
from typing import Dict, Any, Optional
import xarray as xr
from app.processing.subset import full_subset


def process_vector_field(
    ds: xr.Dataset,
    u_variable: str = "uo",
    v_variable: str = "vo",
    depth: Optional[float] = None,
    time: Optional[str] = None,
    bbox: Optional[tuple] = None,
    stride: int = 2
) -> Dict[str, Any]:
    """
    Extracts and computes ocean velocity vector field (U, V, Magnitude, Direction)
    from dataset at a specified depth, time, and spatial bounding box.
    """
    if u_variable not in ds.data_vars or v_variable not in ds.data_vars:
        # Fallback search for common velocity variable names
        u_candidates = [v for v in ds.data_vars if v in ["uo", "u", "eastward_velocity", "u_curr"]]
        v_candidates = [v for v in ds.data_vars if v in ["vo", "v", "northward_velocity", "v_curr"]]
        if u_candidates and v_candidates:
            u_variable, v_variable = u_candidates[0], v_candidates[0]
        else:
            raise ValueError(f"Velocity variables '{u_variable}' and '{v_variable}' not found in dataset.")

    # Subset U and V datasets
    u_ds = full_subset(ds, u_variable, depth=depth, time=time, bbox=bbox)
    v_ds = full_subset(ds, v_variable, depth=depth, time=time, bbox=bbox)

    u_vals = u_ds[u_variable].values
    v_vals = v_ds[v_variable].values

    # Latitude / Longitude coordinates
    lat_name = "latitude" if "latitude" in u_ds.coords else "lat"
    lon_name = "longitude" if "longitude" in u_ds.coords else "lon"
    lats = u_ds.coords[lat_name].values.tolist()
    lons = u_ds.coords[lon_name].values.tolist()

    # Calculate magnitude and direction (degrees from North)
    u_arr = np.array(u_vals, dtype=float)
    v_arr = np.array(v_vals, dtype=float)

    magnitude = np.sqrt(u_arr**2 + v_arr**2)
    direction = np.degrees(np.arctan2(v_arr, u_arr)) % 360.0

    # Apply spatial downsampling stride for vector arrow display
    strided_lats = lats[::stride]
    strided_lons = lons[::stride]
    strided_u = u_arr[::stride, ::stride] if u_arr.ndim == 2 else u_arr
    strided_v = v_arr[::stride, ::stride] if v_arr.ndim == 2 else v_arr
    strided_mag = magnitude[::stride, ::stride] if magnitude.ndim == 2 else magnitude
    strided_dir = direction[::stride, ::stride] if direction.ndim == 2 else direction

    # Flatten and clean NaNs for API response
    vectors = []
    for i, lat in enumerate(strided_lats):
        for j, lon in enumerate(strided_lons):
            u_val = float(strided_u[i, j]) if not np.isnan(strided_u[i, j]) else None
            v_val = float(strided_v[i, j]) if not np.isnan(strided_v[i, j]) else None
            mag_val = float(strided_mag[i, j]) if not np.isnan(strided_mag[i, j]) else None
            dir_val = float(strided_dir[i, j]) if not np.isnan(strided_dir[i, j]) else None

            if mag_val is not None:
                vectors.append({
                    "lat": float(lat),
                    "lon": float(lon),
                    "u": u_val,
                    "v": v_val,
                    "magnitude": mag_val,
                    "direction": dir_val
                })

    return {
        "variables": {"u": u_variable, "v": v_variable},
        "depth": depth,
        "time": time,
        "stride": stride,
        "vector_count": len(vectors),
        "vectors": vectors
    }
