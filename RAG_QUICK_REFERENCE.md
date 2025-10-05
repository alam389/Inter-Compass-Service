# RAG Analyzer - Quick Reference Card

## 🎯 What It Does
Automatically processes PDFs uploaded by admins and provides accurate, cited answers to interns based ONLY on uploaded onboarding documents.

---

## 📤 Upload Document
```http
POST /api/admin/documents/upload
Content-Type: multipart/form-data

Fields:
- file: PDF file (max 50MB)
- title: "Document Title"
- tagid: 1 (optional)

Result: Document processed in 10-15s
```

---

## 💬 Ask Question
```http
POST /api/chat/ask
Content-Type: application/json

Body:
{
  "question": "What are the company holidays?",
  "userId": 1
}

Result: Answer in 2-4s with sources
```

---

## 📊 Check Status
```http
GET /api/admin/stats

Returns:
- Total documents
- Total chunks
- Documents with embeddings
- Document type distribution
- Recent uploads
- System readiness
```

---

## 🔑 Key Features

### Automatic Processing
✅ Upload PDF → Automatically extracted, chunked, embedded
✅ No manual intervention needed
✅ Real-time processing status in console

### Intelligent Search
✅ Vector-based semantic search (not keyword matching)
✅ Relevance scoring (0-100%)
✅ Top 5 most relevant chunks returned

### Grounded Responses
✅ Answers ONLY from uploaded documents
✅ NO external knowledge or assumptions
✅ Every answer includes [SOURCE X] citations
✅ "Not available" for out-of-scope questions

### Confidence Scoring
✅ 0.8-1.0: High confidence, very relevant
✅ 0.5-0.8: Medium confidence, somewhat relevant
✅ 0.0-0.5: Low confidence or not found

---

## ⚙️ Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_api_key_here
GEN_MODEL=gemini-1.5-flash
PGHOST=your_database_host
PGDATABASE=your_database_name
PGUSER=your_database_user
PGPASSWORD=your_database_password
```

### Tunable Parameters
| Parameter | Value | Location |
|-----------|-------|----------|
| Chunk Size | 512 tokens | `chunkingService.ts` |
| Chunk Overlap | 50 tokens | `chunkingService.ts` |
| Top-K Results | 5 chunks | `ragService.ts` |
| Min Relevance | 0.3 (30%) | `ragService.ts` |
| Temperature | 0.2 | `ragService.ts` |

---

## 📈 Performance

| Operation | Time |
|-----------|------|
| Upload Small (10 pages) | 3-5s |
| Upload Medium (50 pages) | 10-15s |
| Upload Large (200 pages) | 45-60s |
| Query Response | 2-4s |

---

## 🔍 How It Works

### Upload Flow
```
PDF → Extract Text → Chunk (~512 tokens) → Generate Embeddings 
  → Store in Database → Ready for Queries
```

### Query Flow
```
Question → Generate Embedding → Find Similar Chunks → Build Context 
  → Generate Answer with Gemini → Validate Citations → Return Response
```

---

## ✅ Success Indicators

### Upload Success
- ✅ "Document uploaded and processed successfully"
- ✅ Chunks created: ~20-40 per document
- ✅ Processing time: <30s for typical document
- ✅ Console shows: "✅ Document processing complete"

### Query Success
- ✅ Response time: <5s
- ✅ Answer includes [SOURCE X] citations
- ✅ Confidence score: >0.7
- ✅ Sources are relevant to question
- ✅ Console shows: "✅ Question answered with confidence: XX%"

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "No relevant results" | Upload documents first |
| "Gemini not configured" | Set GEMINI_API_KEY in .env |
| Low confidence (<0.5) | Question may not be in docs |
| Slow processing | Check Gemini API rate limits |
| Upload fails | Verify PDF is valid, <50MB |

---

## 📞 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/documents/upload` | POST | Upload PDF |
| `/api/admin/documents` | GET | List all docs |
| `/api/admin/stats` | GET | System stats |
| `/api/admin/documents/:id` | DELETE | Delete doc |
| `/api/chat/ask` | POST | Ask question |

---

## 🎓 Example Response

```json
{
  "success": true,
  "answer": "According to the Employee Handbook [SOURCE 1], the company observes 10 federal holidays...",
  "confidence": 0.87,
  "responseTimeSeconds": 2.34,
  "sources": [
    {
      "documentTitle": "Employee Handbook",
      "relevanceScore": 0.92,
      "excerpt": "Company holidays include: New Year's Day..."
    }
  ],
  "metadata": {
    "sourceCount": 5,
    "avgRelevanceScore": 0.825,
    "topRelevanceScore": 0.92
  }
}
```

---

## 📚 Documentation Files

- `RAG_ANALYZER_DOCUMENTATION.md` - Complete technical docs
- `RAG_TESTING_GUIDE.md` - Testing procedures
- `RAG_IMPLEMENTATION_SUMMARY.md` - Changes made
- `RAG_ARCHITECTURE_DIAGRAM.md` - Visual diagrams
- `RAG_QUICK_REFERENCE.md` - This file

---

## 🚀 Quick Start

1. **Start Backend**
   ```powershell
   cd Inter-Compass-Service
   npm run dev
   ```

2. **Upload Document** (via Admin panel or API)
   ```powershell
   curl -X POST http://localhost:3000/api/admin/documents/upload \
     -F "file=@document.pdf" \
     -F "title=Employee Handbook"
   ```

3. **Ask Question** (via Chat interface or API)
   ```powershell
   curl -X POST http://localhost:3000/api/chat/ask \
     -H "Content-Type: application/json" \
     -d '{"question":"What are the company holidays?","userId":1}'
   ```

4. **Verify Response**
   - Check for [SOURCE X] citations
   - Verify confidence score >0.7
   - Confirm answer accuracy

---

## 🎉 System Status

✅ **Implementation**: Complete  
✅ **Documentation**: Complete  
✅ **Testing**: Ready  
✅ **Deployment**: Awaiting QA  

**Next Step**: Upload your first onboarding document! 🚀

---

**Quick Help**: Check console logs for detailed processing information
**Support**: Refer to documentation files for troubleshooting
**Version**: 2.0 (January 2025)
