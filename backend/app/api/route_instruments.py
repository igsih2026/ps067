from fastapi import APIRouter, HTTPException
from app.metadata.argo_registry import argo_registry
from app.models.schemas import InstrumentsResponse, InstrumentProfile

router = APIRouter()


@router.get("/", response_model=InstrumentsResponse)
def list_instruments():
    """List all available Argo float profiles as map markers."""
    profiles = argo_registry.list_profiles()
    return {"instruments": profiles}


@router.get("/{filename}", response_model=InstrumentProfile)
def get_instrument_profile(filename: str):
    """Full depth profile (pressure/temp/salinity) for one Argo file."""
    try:
        return argo_registry.get_profile_by_file(filename)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))