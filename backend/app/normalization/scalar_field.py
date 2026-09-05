# Converts a raw xarray Dataset (whatever internal shape it has) into ONE
# standard, plain-Python structure. This is section 3.1 -- everything
# downstream (API, frontend, caching) works with THIS shape, and never
# needs to know or care that the data came from xarray/NetCDF.

import numpy as np


def to_common_scalar_field(ds, variable: str) -> dict:
    """
    Takes a subsetted xarray Dataset (already sliced to one variable,
    depth, and time -- i.e. what subset.py's full_subset() returns)
    and turns it into the common scalar field representation.
    """
    lat_name = "latitude" if "latitude" in ds.coords else "lat"
    lon_name = "longitude" if "longitude" in ds.coords else "lon"

    da = ds[variable]

    values = da.values
    # replace NaN with None so this is safe to JSON-serialize later
    values = np.where(np.isnan(values), None, values).tolist()

    return {
        "variable": variable,
        "units": da.attrs.get("units", "unknown"),
        "long_name": da.attrs.get("long_name", variable),
        "time": str(ds["time"].values) if "time" in ds.coords else None,
        "depth": float(ds["depth"].values) if "depth" in ds.coords else None,
        "latitude": ds[lat_name].values.tolist(),
        "longitude": ds[lon_name].values.tolist(),
        "values": values,          # 2D list: values[lat_index][lon_index]
        "metadata": {
            "source": ds.attrs.get("source", "unknown"),
            "institution": ds.attrs.get("institution", "unknown"),
            "conventions": ds.attrs.get("Conventions", "unknown"),
        },
    }