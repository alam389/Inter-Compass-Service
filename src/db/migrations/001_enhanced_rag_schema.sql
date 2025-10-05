-- Enhanced database schema for RAG system with PDF processing
-- Run this to update your existing database

-- Drop existing tables if needed (be careful in production!)
-- DROP TABLE IF EXISTS document_chunks CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;

-- Update documents table with new fields
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS author VARCHAR(255),
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create or update document_chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
    chunkid SERIAL PRIMARY KEY,
    documentid INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    embedding JSONB,  -- Store embeddings as JSON (768-dimensional vectors)
    metadata JSONB,   -- Store chunk metadata (start/end positions, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (documentid) REFERENCES documents(documentid) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chunks_documentid ON document_chunks(documentid);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(documentid, chunk_index);
CREATE INDEX IF NOT EXISTS idx_documents_tagid ON documents(tagid);
CREATE INDEX IF NOT EXISTS idx_documents_uploadedat ON documents(uploadedat);

-- Add full-text search index for fallback text search
CREATE INDEX IF NOT EXISTS idx_documents_content_fts ON documents USING GIN (to_tsvector('english', documentcontent));
CREATE INDEX IF NOT EXISTS idx_chunks_text_fts ON document_chunks USING GIN (to_tsvector('english', chunk_text));

-- Create a view for easy querying of documents with chunk counts
CREATE OR REPLACE VIEW documents_with_stats AS
SELECT 
    d.documentid,
    d.documenttitle,
    d.author,
    d.tagid,
    d.page_count,
    d.word_count,
    d.uploadedat,
    d.metadata,
    COUNT(dc.chunkid) as chunk_count,
    t.tagtype
FROM documents d
LEFT JOIN document_chunks dc ON d.documentid = dc.documentid
LEFT JOIN tags t ON d.tagid = t.tagid
GROUP BY d.documentid, d.documenttitle, d.author, d.tagid, d.page_count, d.word_count, d.uploadedat, d.metadata, t.tagtype;

-- Function to calculate cosine similarity (for potential PostgreSQL-native vector search)
-- Note: For production, consider using pgvector extension for better performance
CREATE OR REPLACE FUNCTION cosine_similarity(vec1 float[], vec2 float[])
RETURNS float AS $$
DECLARE
    dot_product float := 0;
    norm1 float := 0;
    norm2 float := 0;
    i int;
BEGIN
    FOR i IN 1..array_length(vec1, 1) LOOP
        dot_product := dot_product + (vec1[i] * vec2[i]);
        norm1 := norm1 + (vec1[i] * vec1[i]);
        norm2 := norm2 + (vec2[i] * vec2[i]);
    END LOOP;
    
    IF norm1 = 0 OR norm2 = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN dot_product / (sqrt(norm1) * sqrt(norm2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comments for documentation
COMMENT ON TABLE document_chunks IS 'Stores text chunks and embeddings for semantic search';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding for semantic search (stored as JSONB)';
COMMENT ON COLUMN document_chunks.token_count IS 'Approximate token count for the chunk';
COMMENT ON COLUMN documents.metadata IS 'PDF metadata including title, author, creation date, etc.';
COMMENT ON COLUMN documents.word_count IS 'Total word count extracted from PDF';
COMMENT ON COLUMN documents.page_count IS 'Number of pages in the PDF document';
