# Central place for file paths so we don't hardcode them everywhere.
# When new variables are downloaded, add their paths here too.

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # points to backend/
DATA_RAW_MODEL = BASE_DIR / "data" / "raw" / "model"

# Actual .nc file lives INSIDE the folder copernicusmarine creates.
SAMPLE_THETAO_PATH = (
    DATA_RAW_MODEL
    / "sample_thetao.nc"
    / "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m_thetao_65.00E-95.00E_0.00N-25.00N_0.49-186.13m_2026-08-01-2026-08-07.nc"
)

SAMPLE_SO_PATH = (
    DATA_RAW_MODEL
    / "sample_so.nc"
    / "cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m_so_65.00E-95.00E_0.00N-25.00N_0.49-186.13m_2026-08-01-2026-08-07.nc"
)

SAMPLE_CURRENTS_PATH = (
    DATA_RAW_MODEL
    / "sample_currents.nc"
    / "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m_uo-vo_65.00E-95.00E_0.00N-25.00N_0.49-186.13m_2026-08-01-2026-08-07.nc"
)