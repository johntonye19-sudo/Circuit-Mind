import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base
from pgvector.sqlalchemy import Vector

Base = declarative_base()


class Component(Base):
    """
    Electronic Component Library Model:
    Stores parametric specs (JSONB) and vector embeddings (pgvector) 
    for datasheet semantic search and automated BOM matching.
    """
    __tablename__ = "components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mpn = Column(String(100), unique=True, nullable=False, index=True)  # Manufacturer Part Number
    manufacturer = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)  # e.g., "GaN FET", "Inductor", "MCU"
    description = Column(Text, nullable=True)

    # Parametric electrical specifications (e.g., {"rds_on_mohm": 10, "vds_max_v": 650})
    parameters = Column(JSONB, nullable=False, default={})

    # 1536-dimensional vector embedding for Datasheet RAG Search
    embedding = Column(Vector(1536), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        # HNSW vector index for high-speed approximate nearest-neighbor search
        Index(
            "idx_component_embedding_hnsw",
            embedding,
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class DesignProject(Base):
    """
    Design Project Artifact Model:
    Stores high-level engineering intents, netlists, board layouts, and simulation runs.
    """
    __tablename__ = "design_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    prompt = Column(Text, nullable=False)

    # Generated circuit artifacts
    schematic_netlist = Column(Text, nullable=True)
    layout_data = Column(JSONB, nullable=True)  # Component x, y placement coordinates and layers
    simulation_results = Column(JSONB, nullable=True)  # SPICE transients, efficiency, and ripple metrics

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
