import numpy as np
from typing import Dict, Any, Optional
import xarray as xr

try:
    from skimage.measure import marching_cubes
    SKIMAGE_AVAILABLE = True
except ImportError:
    SKIMAGE_AVAILABLE = False


def extract_isosurface(
    ds: xr.Dataset,
    variable: str,
    iso_value: float,
    depth_range: Optional[tuple] = None,
    bbox: Optional[tuple] = None
) -> Dict[str, Any]:
    """
    Extracts a 3D isosurface mesh for a given variable iso_value (e.g. 20.0°C isotherm)
    from a 3D ocean dataset using Marching Cubes.
    
    Returns:
    {
        "variable": str,
        "isoValue": float,
        "vertices": list of [x, y, z] / [lon, lat, depth],
        "faces": list of [i, j, k] triangle indices,
        "normals": list of [nx, ny, nz],
        "bbox": dict
    }
    """
    if variable not in ds.data_vars:
        raise ValueError(f"Variable '{variable}' not found in dataset.")

    da = ds[variable]

    # Handle time dimension if present
    if "time" in da.dims:
        da = da.isin(da["time"].values[0]) if hasattr(da["time"], "values") else da.isel(time=0)

    # Subset spatial BBox if provided
    if bbox:
        min_lat, max_lat, min_lon, max_lon = bbox
        lat_name = "latitude" if "latitude" in da.coords else "lat"
        lon_name = "longitude" if "longitude" in da.coords else "lon"
        da = da.sel({lat_name: slice(min_lat, max_lat), lon_name: slice(min_lon, max_lon)})

    # Subset depth if provided
    if depth_range and "depth" in da.coords:
        min_d, max_d = depth_range
        da = da.sel(depth=slice(min_d, max_d))

    values = da.values
    # Clean NaN values for marching cubes
    clean_values = np.nan_to_num(values, nan=np.nanmin(values) - 1.0)

    if not SKIMAGE_AVAILABLE:
        # Fallback if scikit-image is not installed
        return {
            "variable": variable,
            "isoValue": iso_value,
            "vertices": [],
            "faces": [],
            "normals": [],
            "message": "scikit-image is required for Marching Cubes 3D isosurface extraction."
        }

    try:
        # Run marching cubes
        verts, faces, normals, _ = marching_cubes(clean_values, level=iso_value)

        # Convert grid indices back to physical spatial coordinates (lon, lat, depth)
        depth_coords = da.coords["depth"].values if "depth" in da.coords else np.arange(clean_values.shape[0])
        lat_name = "latitude" if "latitude" in da.coords else "lat"
        lon_name = "longitude" if "longitude" in da.coords else "lon"
        lat_coords = da.coords[lat_name].values
        lon_coords = da.coords[lon_name].values

        # Map index to coordinates
        scaled_verts = []
        for v in verts:
            # Assuming ordering (depth_idx, lat_idx, lon_idx) or 3D grid
            d_idx = int(np.clip(v[0], 0, len(depth_coords) - 1))
            lat_idx = int(np.clip(v[1], 0, len(lat_coords) - 1))
            lon_idx = int(np.clip(v[2], 0, len(lon_coords) - 1))

            scaled_verts.append([
                float(lon_coords[lon_idx]),
                float(lat_coords[lat_idx]),
                float(depth_coords[d_idx])
            ])

        return {
            "variable": variable,
            "isoValue": iso_value,
            "vertices": scaled_verts,
            "faces": faces.tolist(),
            "normals": normals.tolist(),
            "count": {
                "vertices": len(scaled_verts),
                "faces": len(faces)
            }
        }

    except Exception as e:
        return {
            "variable": variable,
            "isoValue": iso_value,
            "vertices": [],
            "faces": [],
            "normals": [],
            "error": str(e)
        }
