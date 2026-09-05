# Wraps a single model NetCDF file. Doesn't care WHICH variable it holds
# (temperature, salinity, etc.) -- just opens it and exposes basic info + the raw dataset.

import xarray as xr
from pathlib import Path


class NetCDFModelAdapter:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        if not self.filepath.exists():
            raise FileNotFoundError(f"Model file not found: {filepath}")
        # lazy load -- doesn't pull whole file into memory yet
        self.ds = xr.open_dataset(self.filepath)

    def get_variables(self) -> list[str]:
        # e.g. ["thetao"] for a temperature file
        return list(self.ds.data_vars.keys())

    def get_metadata(self) -> dict:
        # quick summary: dimensions, variables, file-level attributes
        return {
            "filepath": str(self.filepath),
            "dimensions": dict(self.ds.dims),
            "variables": self.get_variables(),
            "global_attrs": dict(self.ds.attrs),
        }

    def get_variable_metadata(self, variable: str) -> dict:
        # units, min/max, shape for one specific variable
        if variable not in self.ds.data_vars:
            raise KeyError(f"'{variable}' not found. Available: {self.get_variables()}")
        da = self.ds[variable]
        return {
            "name": variable,
            "units": da.attrs.get("units", "unknown"),
            "long_name": da.attrs.get("long_name", variable),
            "dims": list(da.dims),
            "shape": list(da.shape),
            "min": float(da.min().values),
            "max": float(da.max().values),
        }

    def get_time_range(self):
        if "time" not in self.ds.coords:
            return None
        times = self.ds["time"].values
        return {"start": str(times.min()), "end": str(times.max())}

    def get_spatial_extent(self):
        # handles both "latitude"/"longitude" and "lat"/"lon" naming
        lat_name = "latitude" if "latitude" in self.ds.coords else "lat"
        lon_name = "longitude" if "longitude" in self.ds.coords else "lon"
        return {
            "lat_min": float(self.ds[lat_name].min()),
            "lat_max": float(self.ds[lat_name].max()),
            "lon_min": float(self.ds[lon_name].min()),
            "lon_max": float(self.ds[lon_name].max()),
        }

    def get_dataset(self) -> xr.Dataset:
        # hands off the raw xarray dataset for subset.py to work on
        return self.ds

    def close(self):
        self.ds.close()