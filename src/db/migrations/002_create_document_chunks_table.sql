-- Create document_chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  tokens INT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  role_tags TEXT[] DEFAULT '{}',
  team_ids INT[] DEFAULT '{}',
  page_from INT,
  page_to INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_role_tags ON document_chunks USING GIN(role_tags);
CREATE INDEX IF NOT EXISTS idx_document_chunks_team_ids ON document_chunks USING GIN(team_ids);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
