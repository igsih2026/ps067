from pydantic import BaseModel
from typing import List, Optional

# Section 4: Metadata Schemas
class VariableMetadata(BaseModel):
    variable: str
    display_name: str
    units: str
    is_vector: bool
    vector_pair: Optional[str] = None
    min: float
    max: float
    dataset_id: str
    time_range: Optional[dict] = None
    spatial_extent: Optional[dict] = None
    available_depths: List[float] = []
    available_times: List[str] = []

class VariablesResponse(BaseModel):
    variables: List[VariableMetadata]

class DatasetMetadata(BaseModel):
    dataset_id: str
    type: str
    source: str
    format: str
    variables: List[str]

class DatasetsResponse(BaseModel):
    datasets: List[DatasetMetadata]

# Section 3 & 6: Data Field Schemas
class Colorbar(BaseModel):
    min: float
    max: float
    colorScale: str
    units: str

class ScalarGrid(BaseModel):
    lat: List[float]
    lon: List[float]
    values: List[List[Optional[float]]]
    colors: Optional[List[List[Optional[str]]]] = None
    nanMask: Optional[List[List[bool]]] = None

class ScalarFieldResponse(BaseModel):
    variable: str
    units: str
    depth: Optional[float] = None
    time: Optional[str] = None
    bbox: dict
    grid: ScalarGrid
    colorbar: Colorbar
    metadata: dict

class InstrumentSummary(BaseModel):
    platform_number: str
    cycle_number: int
    latitude: float
    longitude: float
    time: str
    file: str

class InstrumentsResponse(BaseModel):
    instruments: List[InstrumentSummary]

class InstrumentProfile(InstrumentSummary):
    pressure: List[Optional[float]]
    temperature: List[Optional[float]]
    salinity: List[Optional[float]]