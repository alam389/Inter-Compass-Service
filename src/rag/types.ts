export interface Document {
  id: string;
  title: string;
  s3_key: string;
  mime: string;
  uploaded_by: string;
  status: 'pending_review' | 'approved' | 'rejected';
  role_tags: string[];
  team_ids: number[];
  sensitivity_tags: string[];
  hash?: string;
  created_at: Date;
  reviewed_by?: string;
  reviewed_at?: Date;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  tokens: number;
  embedding: number[];
  role_tags: string[];
  team_ids: number[];
  page_from?: number;
  page_to?: number;
  created_at: Date;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface Chunk {
  text: string;
  tokens: number;
  page_from?: number;
  page_to?: number;
  chunk_index: number;
}

export interface RetrievalFilter {
  roleTags?: string[];
  teamIds?: number[];
  sensitivityExclude?: string[];
}

export interface Citation {
  documentId: string;
  title: string;
  pages?: string | undefined;
}

export interface OutlineResponse {
  outline: {
    dos: string[];
    donts: string[];
    policies: Array<{
      title: string;
      must_acknowledge: boolean;
    }>;
    timeline: Array<{
      week: number;
      items: string[];
    }>;
    acknowledgements: Array<{
      docId: string;
      title: string;
    }>;
  };
  citations: Citation[];
}

export interface ChatResponse {
  sessionId: string;
  answer: string;
  citations: Citation[];
  guardrails: {
    grounded: boolean;
    refused: boolean;
  };
}

export interface OutlineRequest {
  role: string;
  teamId: number;
  level?: string;
  locale?: string;
  sections?: string[];
}

export interface ChatRequest {
  sessionId?: string;
  message: string;
  maxTokens?: number;
}
