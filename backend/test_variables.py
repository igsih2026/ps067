from app.config import SAMPLE_THETAO_PATH, SAMPLE_SO_PATH, SAMPLE_CURRENTS_PATH
import xarray as xr

for name, path in [("thetao", SAMPLE_THETAO_PATH), ("so", SAMPLE_SO_PATH), ("currents", SAMPLE_CURRENTS_PATH)]:
    ds = xr.open_dataset(path)
    print(name, "->", list(ds.data_vars.keys()), dict(ds.dims))
    ds.close()