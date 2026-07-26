import sys
from pathlib import Path

from fastapi import FastAPI

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

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
