# Section 4: Dataset & Variable Metadata Management.
# Instead of hardcoding "which variable lives in which file" wherever it's
# needed (like the API route currently does), this is ONE place that knows
# about every available dataset/variable. Other code asks the registry,
# it doesn't hold its own copy of this knowledge.

from app.ingestion.netcdf_model_adapter import NetCDFModelAdapter
from app.config import SAMPLE_THETAO_PATH, SAMPLE_SO_PATH, SAMPLE_CURRENTS_PATH


class VariableRegistry:
    def __init__(self):
        # variable_name -> {filepath, dataset_id, is_vector, ...}
        # This is the ONE place new variables get registered.
        self._registrations = {
            "thetao": {"filepath": SAMPLE_THETAO_PATH, "dataset_id": "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m", "is_vector": False},
            "so":     {"filepath": SAMPLE_SO_PATH,     "dataset_id": "cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m",     "is_vector": False},
            "uo":     {"filepath": SAMPLE_CURRENTS_PATH, "dataset_id": "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m", "is_vector": True, "vector_pair": "vo"},
            "vo":     {"filepath": SAMPLE_CURRENTS_PATH, "dataset_id": "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m", "is_vector": True, "vector_pair": "uo"},
        }
        self._cache = {}  # variable -> computed metadata, so we don't re-open files every call

    def list_variables(self) -> list[str]:
        return list(self._registrations.keys())

    def get_filepath(self, variable: str):
        if variable not in self._registrations:
            raise KeyError(f"Unknown variable '{variable}'. Available: {self.list_variables()}")
        return self._registrations[variable]["filepath"]

    def get_variable_metadata(self, variable: str) -> dict:
        """
        Section 4.2: full metadata for one variable -- units, min/max,
        scalar/vector, available depths/times. Computed once, then cached,
        since opening the file is the expensive part.
        """
        if variable in self._cache:
            return self._cache[variable]

        if variable not in self._registrations:
            raise KeyError(f"Unknown variable '{variable}'. Available: {self.list_variables()}")

        reg = self._registrations[variable]
        adapter = NetCDFModelAdapter(reg["filepath"])

        var_meta = adapter.get_variable_metadata(variable)
        time_range = adapter.get_time_range()
        spatial = adapter.get_spatial_extent()

        # available depth levels, as a plain list (for a depth-slider on the frontend)
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
        """
        Section 4.1: dataset-level summary -- what datasets exist, what
        they cover, and which variables belong to them.
        """
        datasets = {}
        for variable, reg in self._registrations.items():
            ds_id = reg["dataset_id"]
            if ds_id not in datasets:
                datasets[ds_id] = {
                    "dataset_id": ds_id,
                    "type": "numerical_model",
                    "source": "Copernicus Marine (Mercator Ocean)",
                    "format": "NetCDF",
                    "variables": [],
                }
            datasets[ds_id]["variables"].append(variable)
        return {"datasets": list(datasets.values())}


# Single shared instance -- import THIS wherever variable/dataset info is needed,
# instead of creating a new registry each time or hardcoding paths again.
registry = VariableRegistry()