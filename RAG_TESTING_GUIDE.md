# RAG Analyzer - Quick Testing Guide

## 🚀 Quick Start

### 1. Start the Backend
```powershell
cd Inter-Compass-Service
npm run dev
```

### 2. Verify System Status
```powershell
# Check if Gemini is configured
curl http://localhost:3000/api/gemini/test

# Check knowledge base stats
curl http://localhost:3000/api/admin/stats
```

---

## 📤 Upload a Test Document

### Using cURL (Windows PowerShell)
```powershell
# Upload a PDF document
curl.exe -X POST http://localhost:3000/api/admin/documents/upload `
  -F "file=@C:\path\to\document.pdf" `
  -F "title=Employee Handbook" `
  -F "tagid=1"
```

### Using Postman
1. Create new POST request
2. URL: `http://localhost:3000/api/admin/documents/upload`
3. Body → form-data:
   - `file`: [Select PDF file]
   - `title`: "Employee Handbook"
   - `tagid`: 1 (optional)
4. Send

### Expected Response
```json
{
  "success": true,
  "data": {
    "documentId": 1,
    "title": "Employee Handbook",
    "author": "HR Department",
    "tags": ["policy", "handbook"],
    "pageCount": 42,
    "wordCount": 8543
  },
  "message": "Document uploaded and processed successfully in 8.45s",
  "stats": {
    "processingTimeSeconds": 8.45,
    "pagesProcessed": 42,
    "wordsExtracted": 8543
  }
}
```

---

## 💬 Test Chat Queries

### Basic Question
```powershell
curl.exe -X POST http://localhost:3000/api/chat/ask `
  -H "Content-Type: application/json" `
  -d '{\"question\": \"What are the company holidays?\", \"userId\": 1}'
```

### Sample Questions to Test

1. **General Information**
   - "What are the company holidays?"
   - "What is the dress code policy?"
   - "What are the office hours?"

2. **Benefits & Policies**
   - "Tell me about health insurance benefits"
   - "What is the vacation policy?"
   - "How does the 401k plan work?"

3. **Onboarding Procedures**
   - "What do I need to do on my first day?"
   - "Who should I contact for IT support?"
   - "What training is required for new employees?"

4. **Testing Grounding** (Should return "not available")
   - "What is the weather today?"
   - "Who won the Super Bowl?"
   - "What is Python?"

### Expected Response Format
```json
{
  "success": true,
  "answer": "According to the Employee Handbook [SOURCE 1], the company observes the following holidays: New Year's Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, and Christmas. All full-time employees are entitled to these paid holidays [SOURCE 2].",
  "confidence": 0.87,
  "responseTimeSeconds": 2.34,
  "sources": [
    {
      "chunkId": 23,
      "documentId": 1,
      "documentTitle": "Employee Handbook",
      "chunkIndex": 5,
      "relevanceScore": 0.92,
      "excerpt": "The company observes the following federal holidays: New Year's Day, Memorial Day, Independence Day...",
      "metadata": {
        "author": "HR Department",
        "documentType": "handbook"
      }
    }
  ],
  "metadata": {
    "sourceCount": 2,
    "avgRelevanceScore": 0.875,
    "topRelevanceScore": 0.92
  }
}
```

---

## 📊 Monitor System Performance

### Check Knowledge Base Stats
```powershell
curl http://localhost:3000/api/admin/stats
```

Response includes:
- Total documents
- Total chunks
- Documents with embeddings
- Document type distribution
- Recent uploads
- System readiness

### View All Documents
```powershell
curl http://localhost:3000/api/admin/documents
```

### Search Documents
```powershell
curl "http://localhost:3000/api/admin/documents/search?q=employee"
```

---

## 🔧 Administrative Operations

### Reprocess a Single Document
```powershell
curl.exe -X POST http://localhost:3000/api/admin/documents/1/reprocess
```

### Reprocess All Documents
```powershell
curl.exe -X POST http://localhost:3000/api/admin/documents/reprocess-all
```

### Delete a Document
```powershell
curl.exe -X DELETE http://localhost:3000/api/admin/documents/1
```

---

## 🧪 Test Scenarios

### Scenario 1: Upload & Query
1. Upload "Employee Handbook.pdf"
2. Wait for processing to complete (~10s)
3. Check stats to verify embeddings created
4. Ask question: "What are the company holidays?"
5. Verify response includes [SOURCE X] citations
6. Check confidence score (should be >0.7)

### Scenario 2: Multiple Documents
1. Upload "Employee Handbook.pdf"
2. Upload "Benefits Guide.pdf"
3. Upload "Onboarding Checklist.pdf"
4. Ask: "Tell me about health insurance"
5. Verify response synthesizes info from multiple sources

### Scenario 3: Grounding Test
1. Upload onboarding documents
2. Ask question NOT in documents: "What is the capital of France?"
3. Expected response: "This information is not available in the current onboarding materials..."
4. Confidence should be 0

### Scenario 4: Relevance Scoring
1. Upload multiple documents
2. Ask specific question
3. Check source relevance scores
4. Top source should be >0.8
5. All sources should be >0.3 (MIN_RELEVANCE_SCORE)

---

## 🎯 Success Criteria

### Upload Success
✅ Processing completes without errors  
✅ Chunks created (~20-40 per document)  
✅ Embeddings generated for all chunks  
✅ Processing time <30s for typical document  

### Query Success
✅ Response time <5 seconds  
✅ Answer includes [SOURCE X] citations  
✅ Confidence score >0.7 for good matches  
✅ Sources are relevant to question  
✅ Answer is factually accurate  

### Grounding Success
✅ Answers only from uploaded documents  
✅ No external knowledge used  
✅ "Not available" response for out-of-scope questions  
✅ All claims have source citations  

---

## 📝 Console Output Examples

### During Upload
```
============================================================
📤 DOCUMENT UPLOAD STARTED
============================================================
   Title: Employee Handbook
   Filename: employee-handbook-2025.pdf
   Size: 2543.21 KB
   Tag ID: 1
============================================================

📄 Processing document: Employee Handbook
🔪 Chunking document with semantic awareness...
📦 Created 38 chunks
🧮 Generating embeddings...
   Progress: 5/38 chunks processed
   Progress: 10/38 chunks processed
   ...
✅ Generated 38 embeddings
💾 Storing chunks and embeddings in vector database...
✅ Document processing complete: Employee Handbook
   📊 Stats: 38 chunks, 8543 words, 42 pages

============================================================
✅ DOCUMENT UPLOAD COMPLETED
============================================================
   Document ID: 1
   Processing Time: 8.45s
   Pages: 42
   Words: 8543
   Tags: policy, handbook
============================================================
```

### During Query
```
────────────────────────────────────────────────────────────
📨 Chat Request Received
   User ID: 1
   Question: "What are the company holidays?"
────────────────────────────────────────────────────────────
💬 Answering question: "What are the company holidays?"
🔍 Retrieving relevant chunks for query: "What are the company holidays?"
✅ Found 5 relevant chunks
✅ Question answered with confidence: 87.3%
   📊 Top relevance: 92.1%, Avg: 82.5%
   🔗 Sources used: 5, Citations: Yes
✅ Response Generated
   Response Time: 2.34s
   Confidence: 87.3%
   Sources: 5
   Answer Length: 287 chars
────────────────────────────────────────────────────────────
```

---

## 🐛 Common Issues

### Issue: "Gemini service not configured"
**Fix**: Set `GEMINI_API_KEY` in `.env` file

### Issue: "No chunks found in database"
**Fix**: Upload documents first, wait for processing

### Issue: Low confidence scores
**Possible Causes**:
- Question is vague or unclear
- Information not in uploaded documents
- Documents need reprocessing

### Issue: Slow processing
**Possible Causes**:
- Large PDF file
- Rate limiting from Gemini API
- Database connection slow

---

## 📊 Performance Benchmarks

### Small Document (10 pages)
- Upload & Process: 3-5 seconds
- Query Response: 1-2 seconds

### Medium Document (50 pages)
- Upload & Process: 10-15 seconds
- Query Response: 2-3 seconds

### Large Document (200 pages)
- Upload & Process: 45-60 seconds
- Query Response: 3-4 seconds

### Multiple Documents (10 total)
- Query Response: 3-5 seconds
- (Time increases slightly with corpus size)

---

## ✅ Validation Checklist

Before deploying to production:

- [ ] Upload sample documents successfully
- [ ] Verify embeddings generated
- [ ] Test basic questions
- [ ] Verify source citations present
- [ ] Test grounding (out-of-scope questions)
- [ ] Check confidence scores are reasonable
- [ ] Verify response times are acceptable
- [ ] Test document deletion
- [ ] Test document reprocessing
- [ ] Check stats endpoint
- [ ] Review server logs for errors
- [ ] Test with multiple concurrent users

---

## 🎓 Next Steps

1. **Production Setup**
   - Configure environment variables
   - Set up proper database backups
   - Configure monitoring/logging
   - Set up rate limiting

2. **Content Population**
   - Upload all onboarding documents
   - Verify processing success
   - Test with real questions
   - Gather user feedback

3. **Optimization**
   - Monitor performance metrics
   - Adjust chunk sizes if needed
   - Tune relevance thresholds
   - Optimize database queries

---

**Happy Testing! 🚀**
