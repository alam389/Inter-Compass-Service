# RAG System Architecture - Visual Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTERNCOMPASS RAG ANALYZER                           │
│                        Dynamic PDF Processing System                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN WORKFLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

    👤 Admin
     │
     │ 1. Uploads PDF
     ↓
┌─────────────────┐
│  Admin Panel    │
│  (Frontend)     │
└────────┬────────┘
         │
         │ POST /api/admin/documents/upload
         │ multipart/form-data
         ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND PROCESSING                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. PDF PROCESSING (pdfProcessor.ts)                                  │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ • Extract text with pdf-parse                           │        │  │
│  │    │ • Extract metadata (title, author, dates)               │        │  │
│  │    │ • Detect document type (onboarding, policy, etc.)       │        │  │
│  │    │ • Extract tags from keywords                            │        │  │
│  │    │ • Detect language                                       │        │  │
│  │    │ • Parse document structure (sections)                   │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: 2-5 seconds                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 2. TEXT CHUNKING (chunkingService.ts)                                │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ • Split text into ~512 token chunks                     │        │  │
│  │    │ • Maintain 50-token overlap for context                │        │  │
│  │    │ • Respect paragraph boundaries                          │        │  │
│  │    │ • Track chunk metadata (position, index)               │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: 1-2 seconds                                              │  │
│  │    📦 Output: 20-40 chunks per document                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 3. EMBEDDING GENERATION (embeddingService.ts)                        │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ • Generate 768-dim vectors via Gemini API              │        │  │
│  │    │ • Process in batches (5 chunks at a time)              │        │  │
│  │    │ • Handle rate limits (500ms delay between batches)     │        │  │
│  │    │ • Error recovery for failed embeddings                 │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: 5-10 seconds                                             │  │
│  │    🧮 Output: Float[768] per chunk                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 4. STORAGE (database.ts)                                              │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ PostgreSQL Database:                                    │        │  │
│  │    │                                                         │        │  │
│  │    │ 📄 documents table:                                     │        │  │
│  │    │    • Full text content                                  │        │  │
│  │    │    • Metadata (title, author, tags, etc.)              │        │  │
│  │    │    • Document stats (pages, words)                     │        │  │
│  │    │                                                         │        │  │
│  │    │ 📦 document_chunks table:                               │        │  │
│  │    │    • Chunk text (~512 tokens)                           │        │  │
│  │    │    • Embedding vectors (768-dim)                       │        │  │
│  │    │    • Chunk metadata (index, position)                  │        │  │
│  │    │    • Document reference                                │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: 1-2 seconds                                              │  │
│  │    💾 Size: ~5KB per chunk                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ ✅ Success Response
         ↓
    👤 Admin sees confirmation
       "Document processed: 38 chunks, 8543 words, 42 pages"


┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER WORKFLOW                                    │
└──────────────────────────────────────────────────────────────────────────────┘

    👤 User (New Intern)
     │
     │ "What are the company holidays?"
     ↓
┌─────────────────┐
│   Chat Panel    │
│   (Frontend)    │
└────────┬────────┘
         │
         │ POST /api/chat/ask
         │ { question, userId }
         ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RETRIEVAL & GENERATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. QUERY EMBEDDING                                                    │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ Question → Gemini Embedding Model → Float[768]         │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: 200-500ms                                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 2. SIMILARITY SEARCH (ragService.ts)                                 │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ • Fetch all chunk embeddings from database              │        │  │
│  │    │ • Calculate cosine similarity with query                │        │  │
│  │    │ • Filter by threshold (min 0.3 = 30% similarity)        │        │  │
│  │    │ • Sort by relevance score                               │        │  │
│  │    │ • Return TOP 5 most relevant chunks                     │        │  │
│  │    │                                                         │        │  │
│  │    │ Formula:                                                │        │  │
│  │    │   similarity = dotProduct / (norm1 × norm2)             │        │  │
│  │    │   where dotProduct = Σ(vec1[i] × vec2[i])              │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: 100-300ms                                                │  │
│  │    📊 Output: 5 chunks with scores                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 3. CONTEXT PREPARATION                                                │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ Format context with source information:                 │        │  │
│  │    │                                                         │        │  │
│  │    │ [SOURCE 1: "Employee Handbook" - Section 5 (92.1%)]    │        │  │
│  │    │ Company holidays include: New Year's Day...            │        │  │
│  │    │                                                         │        │  │
│  │    │ [SOURCE 2: "Benefits Guide" - Section 3 (87.5%)]       │        │  │
│  │    │ All full-time employees are entitled to...             │        │  │
│  │    │                                                         │        │  │
│  │    │ [SOURCE 3-5: Additional relevant chunks...]            │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: <50ms                                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 4. ANSWER GENERATION (Gemini AI)                                     │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ PROMPT STRUCTURE:                                       │        │  │
│  │    │                                                         │        │  │
│  │    │ System Instructions:                                    │        │  │
│  │    │   • Answer ONLY from provided context                  │        │  │
│  │    │   • DO NOT use external knowledge                      │        │  │
│  │    │   • ALWAYS cite sources [SOURCE X]                     │        │  │
│  │    │   • If not in context: "Not available"                 │        │  │
│  │    │                                                         │        │  │
│  │    │ Context: [Formatted chunks with sources]               │        │  │
│  │    │                                                         │        │  │
│  │    │ Question: "What are the company holidays?"             │        │  │
│  │    │                                                         │        │  │
│  │    │ ↓                                                       │        │  │
│  │    │                                                         │        │  │
│  │    │ Gemini 1.5 Flash (temperature: 0.2)                    │        │  │
│  │    │                                                         │        │  │
│  │    │ ↓                                                       │        │  │
│  │    │                                                         │        │  │
│  │    │ Generated Answer:                                       │        │  │
│  │    │ "According to the Employee Handbook [SOURCE 1],        │        │  │
│  │    │  the company observes the following holidays:          │        │  │
│  │    │  New Year's Day, Memorial Day, Independence Day..."    │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: 1-3 seconds                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 5. VALIDATION & SCORING                                               │  │
│  │    ┌────────────────────────────────────────────────────────┐        │  │
│  │    │ • Check for [SOURCE X] citations ✅                     │        │  │
│  │    │ • Calculate confidence score:                           │        │  │
│  │    │   confidence = (avgRelevance×0.5 + topRelevance×0.5)   │        │  │
│  │    │   if (hasCitations) confidence × 1.1                    │        │  │
│  │    │                                                         │        │  │
│  │    │ • Compile metadata:                                     │        │  │
│  │    │   - Source count: 5                                     │        │  │
│  │    │   - Avg relevance: 82.5%                                │        │  │
│  │    │   - Top relevance: 92.1%                                │        │  │
│  │    │   - Response time: 2.34s                                │        │  │
│  │    └────────────────────────────────────────────────────────┘        │  │
│  │    ⏱️  Time: <10ms                                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ ✅ Response
         ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  {                                                                           │
│    "answer": "According to the Employee Handbook [SOURCE 1]...",            │
│    "confidence": 0.87,                                                       │
│    "sources": [                                                              │
│      {                                                                       │
│        "documentTitle": "Employee Handbook",                                │
│        "relevanceScore": 0.921,                                             │
│        "excerpt": "Company holidays include..."                             │
│      }                                                                       │
│    ],                                                                        │
│    "metadata": {                                                             │
│      "sourceCount": 5,                                                       │
│      "avgRelevanceScore": 0.825,                                            │
│      "responseTimeSeconds": 2.34                                            │
│    }                                                                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ↓
    👤 User sees answer with sources
       "According to the Employee Handbook [SOURCE 1], ..."


┌──────────────────────────────────────────────────────────────────────────────┐
│                            KEY COMPONENTS                                     │
└──────────────────────────────────────────────────────────────────────────────┘

📦 STORAGE LAYER
┌────────────────────────────────────────────┐
│ PostgreSQL Database                         │
├────────────────────────────────────────────┤
│ • documents (text + metadata)              │
│ • document_chunks (chunks + embeddings)    │
│ • Full-text search indexes                 │
│ • Foreign key relationships                │
└────────────────────────────────────────────┘

🧠 AI LAYER
┌────────────────────────────────────────────┐
│ Google Gemini API                           │
├────────────────────────────────────────────┤
│ • text-embedding-004 (embeddings)          │
│ • gemini-1.5-flash (generation)            │
│ • Rate limiting: 500ms between batches     │
│ • Error handling & retry logic             │
└────────────────────────────────────────────┘

🔍 SEARCH ALGORITHM
┌────────────────────────────────────────────┐
│ Cosine Similarity Search                    │
├────────────────────────────────────────────┤
│ similarity = Σ(A[i]×B[i]) / (‖A‖×‖B‖)      │
│                                            │
│ • Range: 0 to 1 (0% to 100%)               │
│ • Threshold: 0.3 (30% minimum)             │
│ • Top-K: 5 results                         │
└────────────────────────────────────────────┘

📊 PERFORMANCE METRICS
┌────────────────────────────────────────────┐
│ Upload Processing                           │
├────────────────────────────────────────────┤
│ • Small (10 pages):     3-5 seconds        │
│ • Medium (50 pages):    10-15 seconds      │
│ • Large (200 pages):    45-60 seconds      │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Query Processing                            │
├────────────────────────────────────────────┤
│ • Embedding:            200-500ms          │
│ • Search:               100-300ms          │
│ • Generation:           1-3 seconds        │
│ • Total:                2-4 seconds        │
└────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                            QUALITY ASSURANCE                                  │
└──────────────────────────────────────────────────────────────────────────────┘

✅ GROUNDING VALIDATION
┌────────────────────────────────────────────────────────────────────────────┐
│ Question in documents:      → Answer with [SOURCE X] citations             │
│ Question NOT in documents:  → "This information is not available..."       │
│ External knowledge:         → BLOCKED (not used)                            │
└────────────────────────────────────────────────────────────────────────────┘

✅ CONFIDENCE SCORING
┌────────────────────────────────────────────────────────────────────────────┐
│ High (>0.8):   Strong match, very relevant sources                         │
│ Medium (0.5-0.8): Good match, somewhat relevant                            │
│ Low (<0.5):    Weak match, questionable relevance                          │
│ Zero (0.0):    No relevant information found                               │
└────────────────────────────────────────────────────────────────────────────┘

✅ SOURCE TRACKING
┌────────────────────────────────────────────────────────────────────────────┐
│ Every answer includes:                                                      │
│ • Document title                                                            │
│ • Chunk index (section number)                                             │
│ • Relevance score                                                           │
│ • Text excerpt                                                              │
│ • Author & document type                                                    │
└────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                              SUCCESS CRITERIA                                 │
└──────────────────────────────────────────────────────────────────────────────┘

📤 UPLOAD SUCCESS
• Processing completes without errors
• Chunks created (typically 20-40 per document)
• Embeddings generated for all chunks
• Processing time < 30s for typical document

💬 QUERY SUCCESS
• Response time < 5 seconds
• Answer includes [SOURCE X] citations
• Confidence score > 0.7 for good matches
• Sources are relevant to question
• Answer is factually accurate

🎯 GROUNDING SUCCESS
• Answers only from uploaded documents
• No external knowledge used
• "Not available" response for out-of-scope questions
• All claims have source citations


┌──────────────────────────────────────────────────────────────────────────────┐
│                           🎉 SYSTEM READY                                     │
│                                                                               │
│  The InternCompass RAG Analyzer is fully operational and ready to provide    │
│  accurate, grounded answers to new interns based exclusively on your         │
│  organization's onboarding materials.                                        │
│                                                                               │
│  Next Steps:                                                                 │
│  1. Upload your onboarding documents via Admin panel                         │
│  2. Wait for processing to complete (~10-15s per document)                   │
│  3. Start asking questions in the chat interface                             │
│  4. Verify responses are accurate and well-cited                             │
│                                                                               │
│  Happy Onboarding! 🚀                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```
