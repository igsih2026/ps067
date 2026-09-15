# Central place for file paths so we don't hardcode them everywhere.
# When new variables are downloaded, add their paths here too.

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # points to backend/
DATA_RAW_MODEL = BASE_DIR / "data" / "raw" / "model"
ARGO_DATA_DIR = BASE_DIR / "data" / "raw" / "argo"