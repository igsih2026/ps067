from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.route_metadata import router as metadata_router
from app.api.route_model import router as model_router

app = FastAPI(
    title="TRITON Ocean Platform API",
    description="Backend API for 3D Ocean Visualization",
    version="1.0.0"
)

# Configure CORS so the React frontend (e.g. running on port 5173) can communicate without issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from app.api import route_instruments, route_analysis
# Register API Routers
app.include_router(metadata_router, prefix="/api", tags=["Metadata"])
app.include_router(model_router, prefix="/api/model", tags=["Model Visualization"])
app.include_router(route_instruments.router, prefix="/api/instruments", tags=["Instruments"])
app.include_router(route_analysis.router, prefix="/api/analysis", tags=["Ocean Analysis"])



@app.on_event("shutdown")
def shutdown_event():
    import logging
    from app.cache.dataset_cache import dataset_cache
    logging.info("Shutting down... closing all open xarray file handles.")
    dataset_cache.close_all()

@app.get("/")
def root():
    return {"status": "ok", "message": "TRITON API is running. Check /docs for documentation."}
