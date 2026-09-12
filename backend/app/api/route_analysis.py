from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import numpy as np
from app.metadata.registry import registry
from app.ingestion.netcdf_model_adapter import NetCDFModelAdapter
from app.metadata.argo_registry import argo_registry
from app.models.schemas import WaterColumnResponse, ModelObsComparisonResponse, DepthValuePair

router = APIRouter()


@router.get("/column", response_model=WaterColumnResponse)
def get_water_column(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    variable: str = Query("thetao", description="Target variable name"),
    time: Optional[str] = Query(None, description="ISO timestamp")
):
    """
    Extracts a 1D vertical water column (depth vs variable value) 
    at a specific (lat, lon) location from the 3D model output.
    """
    if variable not in registry.list_variables():
        raise HTTPException(status_code=404, detail=f"Variable '{variable}' not found in registry.")

    filepath = registry.get_filepath(variable)
    adapter = NetCDFModelAdapter(filepath)
    ds = adapter.get_dataset()

    try:
        da = ds[variable]

        # Handle time
        if "time" in da.dims:
            da = da.isel(time=0) if not time else da.sel(time=time, method="nearest")

        # Select nearest lat/lon
        lat_name = "latitude" if "latitude" in da.coords else "lat"
        lon_name = "longitude" if "longitude" in da.coords else "lon"
        column_da = da.sel({lat_name: lat, lon_name: lon}, method="nearest")

        # Read depth levels
        depths = ds.coords["depth"].values.tolist() if "depth" in ds.coords else [0.0]
        raw_vals = column_da.values.tolist()

        profile_pairs = []
        if isinstance(raw_vals, list):
            for d, v in zip(depths, raw_vals):
                val = float(v) if pd_notnull(v) else None
                profile_pairs.append(DepthValuePair(depth=float(d), value=val))
        else:
            profile_pairs.append(DepthValuePair(depth=0.0, value=float(raw_vals) if pd_notnull(raw_vals) else None))

        var_meta = registry.get_variable_metadata(variable)
        adapter.close()

        return WaterColumnResponse(
            variable=variable,
            latitude=lat,
            longitude=lon,
            time=time,
            units=var_meta.get("units", ""),
            profile=profile_pairs
        )

    except Exception as e:
        adapter.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare", response_model=ModelObsComparisonResponse)
def compare_model_and_observation(
    instrument_file: str = Query(..., description="Argo float profile filename"),
    variable: str = Query("thetao", description="Model variable name (e.g. thetao, temperature)")
):
    """
    Compares 3D model field values against an in-situ Argo float profile at the float's coordinates.
    Returns calculated Root Mean Square Error (RMSE) and mean Bias.
    """
    try:
        float_profile = argo_registry.get_profile_by_file(instrument_file)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Instrument file '{instrument_file}' not found.")

    plat_lat = float_profile["latitude"]
    plat_lon = float_profile["longitude"]
    obs_depths = float_profile["pressure"]  # Pressure approx equals depth in meters
    obs_vals = float_profile["temperature"] if variable in ["thetao", "temperature"] else float_profile["salinity"]

    # Fetch corresponding model column
    filepath = registry.get_filepath(variable)
    adapter = NetCDFModelAdapter(filepath)
    ds = adapter.get_dataset()

    try:
        da = ds[variable]
        if "time" in da.dims:
            da = da.isel(time=0)

        lat_name = "latitude" if "latitude" in da.coords else "lat"
        lon_name = "longitude" if "longitude" in da.coords else "lon"
        column_da = da.sel({lat_name: plat_lat, lon_name: plat_lon}, method="nearest")

        model_depths = ds.coords["depth"].values if "depth" in ds.coords else np.array([0.0])
        model_vals = column_da.values

        # Interpolate model values to observation depth points
        interp_model_vals = []
        for d in obs_depths:
            if d is None:
                interp_model_vals.append(None)
            else:
                val = float(np.interp(d, model_depths, model_vals, left=np.nan, right=np.nan))
                interp_model_vals.append(val if not np.isnan(val) else None)

        # Compute RMSE and Bias for valid pairs
        valid_pairs = [
            (m, o) for m, o in zip(interp_model_vals, obs_vals)
            if m is not None and o is not None and not np.isnan(m) and not np.isnan(o)
        ]

        if valid_pairs:
            m_arr = np.array([p[0] for p in valid_pairs])
            o_arr = np.array([p[1] for p in valid_pairs])
            diffs = m_arr - o_arr
            bias = float(np.mean(diffs))
            rmse = float(np.sqrt(np.mean(diffs**2)))
        else:
            bias = 0.0
            rmse = 0.0

        adapter.close()

        return ModelObsComparisonResponse(
            instrument_id=float_profile["platform_number"],
            latitude=plat_lat,
            longitude=plat_lon,
            variable=variable,
            rmse=round(rmse, 4),
            bias=round(bias, 4),
            depths=[float(d) for d in obs_depths if d is not None],
            model_values=interp_model_vals,
            obs_values=obs_vals
        )

    except Exception as e:
        adapter.close()
        raise HTTPException(status_code=500, detail=str(e))


def pd_notnull(val) -> bool:
    return val is not None and not np.isnan(val)
