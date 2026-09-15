from app.ingestion.netcdf_model_adapter import NetCDFModelAdapter
from app.config import DATA_RAW_MODEL
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class VariableRegistry:
    def __init__(self):
        self._registrations = {}
        self._cache = {}
        self.refresh()

    def refresh(self):
        logger.info(f"Scanning for NetCDF datasets in {DATA_RAW_MODEL}...")
        self._registrations.clear()
        self._cache.clear()
        
        if not DATA_RAW_MODEL.exists():
            logger.warning("DATA_RAW_MODEL directory does not exist.")
            return
            
        for filepath in DATA_RAW_MODEL.rglob("*.nc"):
            if not filepath.is_file():
                continue
            try:
                adapter = NetCDFModelAdapter(str(filepath))
                vars_in_file = adapter.get_variables()
                # filter out coord variables like lat, lon, depth, time
                vars_in_file = [v for v in vars_in_file if v not in ["lat", "lon", "latitude", "longitude", "depth", "time"]]
                
                for var in vars_in_file:
                    if var in self._registrations:
                        logger.warning(f"Collision: '{var}' found in {filepath}, keeping earlier occurrence.")
                        continue
                        
                    is_vector = var in ["uo", "vo", "u", "v"]
                    vector_pair = None
                    if is_vector:
                        vector_pair = "vo" if var in ["uo", "u"] else "uo"
                        
                    self._registrations[var] = {
                        "filepath": filepath,
                        "dataset_id": filepath.stem,
                        "is_vector": is_vector,
                        "vector_pair": vector_pair
                    }
                adapter.close()
            except Exception as e:
                logger.error(f"Failed to scan {filepath}: {e}")

    def list_variables(self) -> list[str]:
        return list(self._registrations.keys())

    def get_filepath(self, variable: str):
        if variable not in self._registrations:
            raise KeyError(f"Unknown variable '{variable}'. Available: {self.list_variables()}")
        return self._registrations[variable]["filepath"]

    def get_variable_metadata(self, variable: str) -> dict:
        if variable in self._cache:
            return self._cache[variable]

        if variable not in self._registrations:
            raise KeyError(f"Unknown variable '{variable}'. Available: {self.list_variables()}")

        reg = self._registrations[variable]
        adapter = NetCDFModelAdapter(reg["filepath"])

        var_meta = adapter.get_variable_metadata(variable)
        time_range = adapter.get_time_range()
        spatial = adapter.get_spatial_extent()

        depth_levels = adapter.get_dataset()["depth"].values.tolist() if "depth" in adapter.get_dataset().coords else []
        time_steps = [str(t) for t in adapter.get_dataset()["time"].values] if "time" in adapter.get_dataset().coords else []

        metadata = {
            "variable": variable,
            "display_name": var_meta["long_name"],
            "units": var_meta["units"],
            "is_vector": reg["is_vector"],
            "vector_pair": reg.get("vector_pair"),
            "min": var_meta["min"],
            "max": var_meta["max"],
            "dataset_id": reg["dataset_id"],
            "time_range": time_range,
            "spatial_extent": spatial,
            "available_depths": depth_levels,
            "available_times": time_steps,
        }

        adapter.close()
        self._cache[variable] = metadata
        return metadata

    def get_dataset_metadata(self) -> dict:
        datasets = {}
        for variable, reg in self._registrations.items():
            ds_id = reg["dataset_id"]
            if ds_id not in datasets:
                datasets[ds_id] = {
                    "dataset_id": ds_id,
                    "type": "numerical_model",
                    "source": "Copernicus Marine / Local Scan",
                    "format": "NetCDF",
                    "variables": [],
                }
            datasets[ds_id]["variables"].append(variable)
        return {"datasets": list(datasets.values())}

registry = VariableRegistry()
