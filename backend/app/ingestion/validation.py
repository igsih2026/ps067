# Checks a newly opened dataset actually has what we expect BEFORE
# anything downstream (subset, normalize, API) tries to use it.
# This is section 2.1 (structural validation) and 2.2 (missing-value handling).

import numpy as np

REQUIRED_COORDS = ["latitude", "longitude"]  # depth/time are optional (some datasets are surface-only)


class ValidationError(Exception):
    """Raised when a dataset fails a structural check."""
    pass


def validate_dataset(ds, variable: str):
    """
    Run all structural checks. Raises ValidationError with a clear message
    on the first thing that's wrong, instead of failing later with a
    confusing xarray/numpy error deep inside subset.py.
    """
    # 1. required coordinates exist
    for coord in REQUIRED_COORDS:
        alt = "lat" if coord == "latitude" else "lon"
        if coord not in ds.coords and alt not in ds.coords:
            raise ValidationError(f"Missing required coordinate: {coord}")

    # 2. the requested variable actually exists
    if variable not in ds.data_vars:
        raise ValidationError(
            f"Variable '{variable}' not found. Available: {list(ds.data_vars.keys())}"
        )

    # 3. latitude/longitude are within physically valid ranges
    lat_name = "latitude" if "latitude" in ds.coords else "lat"
    lon_name = "longitude" if "longitude" in ds.coords else "lon"
    lat_vals = ds[lat_name].values
    lon_vals = ds[lon_name].values

    if lat_vals.min() < -90 or lat_vals.max() > 90:
        raise ValidationError(f"Latitude out of range: {lat_vals.min()} to {lat_vals.max()}")
    if lon_vals.min() < -180 or lon_vals.max() > 360:
        raise ValidationError(f"Longitude out of range: {lon_vals.min()} to {lon_vals.max()}")

    # 4. depth values (if present) shouldn't be negative (depth is measured downward)
    if "depth" in ds.coords:
        depth_vals = ds["depth"].values
        if depth_vals.min() < 0:
            raise ValidationError(f"Negative depth found: {depth_vals.min()}")

    # 5. timestamps exist and aren't all-NaT (Not-a-Time / missing)
    if "time" in ds.coords:
        if np.all(np.isnat(ds["time"].values)):
            raise ValidationError("Time coordinate exists but all values are missing (NaT)")

    return True  # all checks passed


def check_missing_values(ds, variable: str) -> dict:
    """
    Reports how much of the data is missing/NaN, without failing --
    missing values (e.g. land points in ocean grids) are often expected,
    not an error. This just gives visibility, per section 2.2.
    """
    values = ds[variable].values
    total = values.size
    missing = int(np.isnan(values).sum())
    return {
        "total_points": total,
        "missing_points": missing,
        "missing_percent": round((missing / total) * 100, 2) if total > 0 else 0,
    }


def filter_by_qc(values: list, qc_flags: list, allowed_flags: tuple = (1, 2)) -> list:
    """
    Filters observation values based on standard oceanographic Quality Control (QC) flags.
    Default allowed flags are (1 = Good, 2 = Probably Good).
    Flags 3 (Bad) and 4 (Harmful/Corrupted) are replaced with None / NaN.
    """
    if not qc_flags or len(qc_flags) != len(values):
        return values

    filtered = []
    for v, qc in zip(values, qc_flags):
        if qc in allowed_flags:
            filtered.append(v)
        else:
            filtered.append(None)
    return filtered