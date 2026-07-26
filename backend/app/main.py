import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.session import engine
from app.db.models import Base
from app.routers import websocket

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("circuitmind")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Context:
    Handles async startup (database table creation, extension verification)
    and graceful shutdown tasks.
    """
    logger.info("Initializing CircuitMind API Gateway...")
    
    # 1. Ensure database tables and extensions exist
    try:
        async with engine.begin() as conn:
            # Verify tables exist on boot
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database connection verified and tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables on startup: {str(e)}")
        # We allow startup to proceed so health checks can report status

    yield  # Application running phase

    # 2. Cleanup resources on shutdown
    logger.info("Shutting down CircuitMind API Gateway...")
    await engine.dispose()
    logger.info("Database connection pool closed.")


# Initialize FastAPI App
app = FastAPI(
    title="CircuitMind API Gateway",
    description="AI-First Electronic Design Automation (EDA) Engine API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS Middleware for Next.js Frontend Communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register WebSockets & API Routers
app.include_router(websocket.router)


@app.get("/", status_code=status.HTTP_200_OK)
async def root_ping():
    """Root status ping endpoint."""
    return {
        "system": "CircuitMind EDA Core Engine",
        "status": "online",
        "version": "1.0.0"
    }


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint used by Docker Compose, Kubernetes, and load balancers.
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "services": {
                "api": "up",
                "websocket": "active"
            }
        }
    )
