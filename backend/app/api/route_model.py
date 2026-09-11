from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.metadata.registry import registry
from app.ingestion.netcdf_model_adapter import NetCDFModelAdapter
from app.processing.subset import full_subset
from app.normalization.scalar_field import to_common_scalar_field
from app.processing.colormap import apply_colormap
from app.cache.memory_cache import get_from_cache, set_in_cache, generate_cache_key
from app.models.schemas import ScalarFieldResponse

router = APIRouter()

@router.get("/{variable}", response_model=ScalarFieldResponse)
def get_model_slice(
    variable: str,
    depth: Optional[float] = Query(None, description="Target depth in meters"),
    time: Optional[str] = Query(None, description="ISO timestamp"),
    minLat: Optional[float] = -90.0,
    maxLat: Optional[float] = 90.0,
    minLon: Optional[float] = -180.0,
    maxLon: Optional[float] = 180.0
):
    """
    Core endpoint for depth-slice visualization. Returns a 2D grid of values and colors.
    """
    if variable not in registry.list_variables():
        raise HTTPException(status_code=404, detail=f"Variable '{variable}' not found.")
        
    bbox = (minLat, maxLat, minLon, maxLon)
    cache_key = generate_cache_key(variable, depth, time, bbox)
    cached_data = get_from_cache(cache_key)
    
    if cached_data:
        return cached_data

    # 1. Open dataset
    filepath = registry.get_filepath(variable)
    adapter = NetCDFModelAdapter(filepath)
    ds = adapter.get_dataset()
    
    # 2. Extract metadata
    var_meta = registry.get_variable_metadata(variable)
    vmin = var_meta["min"]
    vmax = var_meta["max"]
    
    try:
        # 3. Subset data (Slice by depth, time, bbox)
        sliced_ds = full_subset(ds, variable, depth=depth, time=time, bbox=bbox)
        
        # 4. Normalize to dict
        scalar_dict = to_common_scalar_field(sliced_ds, variable)
        
        # 5. Apply colormap
        cmap_name = "turbo" if variable in ["thetao", "temperature"] else "viridis"
        colors = apply_colormap(scalar_dict["values"], vmin, vmax, cmap_name)
        
        # 6. Format response
        response_data = {
            "variable": variable,
            "units": scalar_dict["units"],
            "depth": scalar_dict["depth"],
            "time": scalar_dict["time"],
            "bbox": {"minLat": minLat, "maxLat": maxLat, "minLon": minLon, "maxLon": maxLon},
            "grid": {
                "lat": scalar_dict["latitude"],
                "lon": scalar_dict["longitude"],
                "values": scalar_dict["values"],
                "colors": colors,
                "nanMask": [[v is None for v in row] for row in scalar_dict["values"]]
            },
            "colorbar": {
                "min": vmin,
                "max": vmax,
                "colorScale": cmap_name,
                "units": scalar_dict["units"]
            },
            "metadata": scalar_dict["metadata"]
        }
        
        # Cache and close
        set_in_cache(cache_key, response_data)
        adapter.close()
        
        return response_data
        
    except Exception as e:
        adapter.close()
        raise HTTPException(status_code=500, detail=str(e))
