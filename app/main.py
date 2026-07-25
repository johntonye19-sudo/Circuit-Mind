from fastapi import FastAPI
from app.core.config import settings
from app.api.v1.endpoints.netlists import router as netlist_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.include_router(netlist_router, prefix=f"{settings.API_V1_STR}/netlists", tags=["Netlists"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "milestone": "1 - Core Infrastructure & Netlist Generator"}
