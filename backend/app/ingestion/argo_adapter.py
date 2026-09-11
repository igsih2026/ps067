# Wraps a single Argo profile NetCDF file. Extracts the point-based
# profile data (pressure/depth vs temp/salinity) plus float metadata.

import xarray as xr
import numpy as np
from pathlib import Path


class ArgoProfileAdapter:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        if not self.filepath.exists():
            raise FileNotFoundError(f"Argo file not found: {filepath}")
        self.ds = xr.open_dataset(self.filepath)

    def _scalar(self, var_name):
        # Most Argo scalar fields are shaped (N_PROF,) with N_PROF=1
        val = self.ds[var_name].values
        return val[0] if val.ndim > 0 else val

    def _decode_str(self, val):
        if isinstance(val, bytes):
            return val.decode("utf-8").strip()
        return str(val).strip()

    def get_summary(self) -> dict:
        """Lightweight info for a map marker -- lat/lon/float id/time."""
        lat = float(self._scalar("LATITUDE"))
        lon = float(self._scalar("LONGITUDE"))
        platform = self._decode_str(self._scalar("PLATFORM_NUMBER"))
        juld = self.ds["JULD"].values[0]  # datetime64 already decoded by xarray via REFERENCE_DATE_TIME
        cycle = int(self._scalar("CYCLE_NUMBER"))

        return {
            "platform_number": platform,
            "cycle_number": cycle,
            "latitude": lat,
            "longitude": lon,
            "time": str(juld),
            "file": self.filepath.name,
        }

    def get_profile(self) -> dict:
        """Full depth-profile: pressure/temp/salinity arrays for this cast."""
        # shape is (N_PROF, N_LEVELS); N_PROF is always 1 per file here
        pres = self.ds["PRES"].values[0]
        temp = self.ds["TEMP"].values[0]
        psal = self.ds["PSAL"].values[0]

        def clean(arr):
            # Argo fill value is usually 99999.0; xarray may already show NaN
            return [None if (np.isnan(v) or v > 90000) else float(v) for v in arr]

        summary = self.get_summary()
        summary.update({
            "pressure": clean(pres),   # dbar, proxy for depth
            "temperature": clean(temp),  # degC
            "salinity": clean(psal),     # PSU
        })
        return summary

    def close(self):
        self.ds.close()