from fastapi import APIRouter
from app.metadata.registry import registry
from app.models.schemas import VariablesResponse, DatasetsResponse

router = APIRouter()

@router.get("/variables", response_model=VariablesResponse)
def get_variables():
    """Returns all available ocean variables and their metadata (min, max, depths available)."""
    vars_list = registry.list_variables()
    meta_list = [registry.get_variable_metadata(v) for v in vars_list]
    return VariablesResponse(variables=meta_list)

@router.get("/datasets", response_model=DatasetsResponse)
def get_datasets():
    """Returns all registered datasets and which variables they provide."""
    return DatasetsResponse(**registry.get_dataset_metadata())
