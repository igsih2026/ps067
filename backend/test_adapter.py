# Run from inside backend/:  python test_adapter.py

from app.config import SAMPLE_THETAO_PATH
from app.ingestion.netcdf_model_adapter import NetCDFModelAdapter
from app.ingestion.validation import validate_dataset, check_missing_values
from app.processing.subset import full_subset
from app.normalization.scalar_field import to_common_scalar_field

adapter = NetCDFModelAdapter(SAMPLE_THETAO_PATH)
ds = adapter.get_dataset()

# 1. validate BEFORE doing anything else with the data
validate_dataset(ds, variable="thetao")
print("Validation passed.")

missing_report = check_missing_values(ds, variable="thetao")
print("Missing values report:", missing_report)

# 2. subset (same as before)
subset = full_subset(ds, variable="thetao", depth=10, time="2026-08-03")

# 3. normalize into the common structure
common = to_common_scalar_field(subset, variable="thetao")
print("\nCommon scalar field keys:", list(common.keys()))
print("Sample values row 0:", common["values"][0][:5])   # first 5 values of first row
print("Metadata:", common["metadata"])

adapter.close()