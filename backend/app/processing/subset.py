# Slices an already-opened xarray Dataset down to what the frontend actually asked for:
# one variable, a specific depth, a specific time, a bounding box.

import xarray as xr


def subset_by_bbox(ds, lat_min, lat_max, lon_min, lon_max):
    lat_name = "latitude" if "latitude" in ds.coords else "lat"
    lon_name = "longitude" if "longitude" in ds.coords else "lon"
    return ds.sel({lat_name: slice(lat_min, lat_max), lon_name: slice(lon_min, lon_max)})


def subset_by_depth(ds, depth=None, depth_min=None, depth_max=None):
    depth_name = "depth" if "depth" in ds.coords else "elevation"
    if depth_name not in ds.coords:
        return ds  # surface-only dataset, nothing to slice
    if depth is not None:
        # "nearest" because exact depth values rarely match a slider value exactly
        return ds.sel({depth_name: depth}, method="nearest")
    if depth_min is not None and depth_max is not None:
        return ds.sel({depth_name: slice(depth_min, depth_max)})
    return ds


def subset_by_time(ds, time=None, time_start=None, time_end=None):
    if "time" not in ds.coords:
        return ds
    if time is not None:
        return ds.sel(time=time, method="nearest")
    if time_start is not None and time_end is not None:
        return ds.sel(time=slice(time_start, time_end))
    return ds


def subset_variable(ds, variable):
    if variable not in ds.data_vars:
        raise KeyError(f"'{variable}' not found. Available: {list(ds.data_vars.keys())}")
    return ds[[variable]]


def full_subset(ds, variable, depth=None, time=None, bbox=None):
    # convenience wrapper -- mirrors what GET /api/model/{variable}?depth=&time=&bbox= will need later
    result = subset_variable(ds, variable)
    if bbox is not None:
        result = subset_by_bbox(result, *bbox)
    if depth is not None:
        result = subset_by_depth(result, depth=depth)
    if time is not None:
        result = subset_by_time(result, time=time)
    return result