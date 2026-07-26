import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)

logger = logging.getLogger("circuitmind")

# Default database connection string matching docker-compose network defaults
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://circuitmind:secret_password@db:5432/circuitmind_db",
)

# Initialize Async Engine with connection pool management
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for verbose SQL query logging during debugging
    future=True,
    pool_pre_ping=True,  # Test connections prior to usage to drop stale sockets
    pool_size=10,
    max_overflow=20,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Dependency that yields an async database session per request 
    and handles automatic cleanup on exit.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session transaction rolled back due to error: {str(e)}")
            raise
        finally:
            await session.close()
