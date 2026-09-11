# Run from backend/: python test_vector.py

from app.config import SAMPLE_CURRENTS_PATH
from app.ingestion.netcdf_model_adapter import NetCDFModelAdapter
from app.processing.subset import full_subset
from app.normalization.vector_field import to_common_vector_field

adapter = NetCDFModelAdapter(SAMPLE_CURRENTS_PATH)
ds = adapter.get_dataset()

# subset each component separately, same depth/time so they line up
uo_subset = full_subset(ds, variable="uo", depth=10, time="2026-08-03")
vo_subset = full_subset(ds, variable="vo", depth=10, time="2026-08-03")

vector_field = to_common_vector_field(uo_subset, vo_subset)

print("Keys:", list(vector_field.keys()))
print("Depth used:", vector_field["depth"])
print("Time used:", vector_field["time"])
print("Sample u values (row 0, first 5):", vector_field["u"][0][:5])
print("Sample v values (row 0, first 5):", vector_field["v"][0][:5])
print("Sample magnitude (row 0, first 5):", vector_field["magnitude"][0][:5])
print("Sample direction (row 0, first 5):", vector_field["direction"][0][:5])