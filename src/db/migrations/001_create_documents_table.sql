-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected')) DEFAULT 'pending_review',
  role_tags TEXT[] DEFAULT '{}',
  team_ids INT[] DEFAULT '{}',
  sensitivity_tags TEXT[] DEFAULT '{}',
  hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ
);

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_role_tags ON documents USING GIN(role_tags);
CREATE INDEX IF NOT EXISTS idx_documents_team_ids ON documents USING GIN(team_ids);
