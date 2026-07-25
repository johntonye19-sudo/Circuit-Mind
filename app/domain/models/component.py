import uuid
from sqlalchemy import Column, String, Numeric, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class ComponentModel(Base):
    __tablename__ = "components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mpn = Column(String(100), unique=True, nullable=False, index=True)
    manufacturer = Column(String(100), nullable=False)
    description = Column(String, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    footprint_name = Column(String(100), nullable=True)
    specs = Column(JSON, nullable=False, default={})
    embedding = Column(Vector(1536), nullable=True)
    stock_count = Column(Integer, default=0)
    price_usd = Column(Numeric(10, 4), nullable=True)
    lifecycle_status = Column(String(50), default="Active")
