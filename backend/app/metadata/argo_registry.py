# Scans the local argo data folder and keeps a lightweight index of
# available profile files, so route_instruments doesn't re-scan disk
# or re-open files on every request.

from pathlib import Path
from app.ingestion.argo_adapter import ArgoProfileAdapter
from app.config import ARGO_DATA_DIR


class ArgoRegistry:
    def __init__(self):
        self._index = None  # list of summary dicts, built lazily

    def _build_index(self):
        index = []
        if not ARGO_DATA_DIR.exists():
            self._index = []
            return
        for nc_file in ARGO_DATA_DIR.glob("*.nc"):
            try:
                adapter = ArgoProfileAdapter(str(nc_file))
                index.append(adapter.get_summary())
                adapter.close()
            except Exception:
                continue  # skip unreadable/corrupt files
        self._index = index

    def list_profiles(self) -> list[dict]:
        if self._index is None:
            self._build_index()
        return self._index

    def get_profile_by_file(self, filename: str) -> dict:
        target = ARGO_DATA_DIR / filename
        if not target.exists():
            raise KeyError(f"Argo file '{filename}' not found")
        adapter = ArgoProfileAdapter(str(target))
        data = adapter.get_profile()
        adapter.close()
        return data


argo_registry = ArgoRegistry()