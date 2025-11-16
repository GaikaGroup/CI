-- Update embedding dimensions from 1536 to 384 for Sentence-Transformers

-- Drop existing index
DROP INDEX IF EXISTS idx_kg_nodes_embedding;

-- Alter column type
ALTER TABLE knowledge_graph_nodes 
ALTER COLUMN embedding TYPE vector(384);

-- Recreate index with new dimensions
CREATE INDEX idx_kg_nodes_embedding 
ON knowledge_graph_nodes 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
