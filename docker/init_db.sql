-- Enable vector search and UUID generation extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Component datasheet table with 1536-dim embeddings for RAG
CREATE TABLE IF NOT EXISTS components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mpn VARCHAR(100) UNIQUE NOT NULL,
    manufacturer VARCHAR(100),
    category VARCHAR(50),
    specifications JSONB DEFAULT '{}'::jsonb,
    datasheet_url TEXT,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast HNSW cosine similarity vector index
CREATE INDEX IF NOT EXISTS idx_components_embedding 
ON components 
USING hnsw (embedding vector_cosine_ops);

-- Design projects persistence table
CREATE TABLE IF NOT EXISTS design_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    netlist TEXT,
    layout_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
