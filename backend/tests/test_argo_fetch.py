import xarray as xr
ds = xr.open_dataset(r"backend\data\raw\argo\D1902669_001.nc")
print(list(ds.data_vars.keys()))