# InternCompass Backend Service

A production-ready Node.js/TypeScript backend service with Gemini RAG (Retrieval-Augmented Generation) capabilities for InternCompass.

## Features

- **Document Management**: Upload, review, and manage PDF documents
- **RAG Pipeline**: Extract, chunk, embed, and index documents using Google Gemini
- **Intelligent Chat**: Role-aware chat system with grounded responses and citations
- **Structured Outlines**: Generate personalized onboarding outlines based on role and team
- **Vector Search**: PostgreSQL with pgvector for semantic similarity search
- **Queue Processing**: BullMQ for background document ingestion
- **API Documentation**: OpenAPI/Swagger documentation
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Health Monitoring**: Health check endpoints for service monitoring

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   RAG Pipeline  │
│   (React)       │◄──►│   (Express)     │◄──►│   (Gemini)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   + pgvector    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis         │
                       │   (BullMQ)      │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   S3/MinIO      │
                       │   (File Storage)│
                       └─────────────────┘
```

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with pgvector extension
- **Cache/Queue**: Redis with BullMQ
- **Storage**: AWS S3 or MinIO
- **AI/ML**: Google Gemini (text generation + embeddings)
- **PDF Processing**: pdf-parse + Tesseract.js (OCR)
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI
- **Testing**: Vitest
- **Logging**: Pino

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+ with pgvector extension
- Redis 6+
- AWS S3 or MinIO
- Google Gemini API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd Inter-Compass-Service
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database:**
   ```bash
   # Install pgvector extension
   psql -d your_database -c "CREATE EXTENSION IF NOT EXISTS vector;"
   
   # Run migrations
   npm run db:migrate
   ```

4. **Start the service:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

5. **Start the worker (in another terminal):**
   ```bash
   npm run worker
   ```

## Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
POSTGRES_URL=postgres://username:password@localhost:5432/interncompass
POSTGRES_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here
EMBEDDING_MODEL=text-embedding-004
GEN_MODEL=gemini-1.5-pro

# RAG Configuration
RAG_TOP_K=8
CHUNK_TOKENS=900
CHUNK_OVERLAP_TOKENS=180

# AWS S3 (or MinIO)
S3_BUCKET=interncompass
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your_access_key_here
S3_SECRET_KEY=your_secret_key_here

# MinIO (if using instead of AWS S3)
# S3_ENDPOINT=http://localhost:9000
# S3_FORCE_PATH_STYLE=true

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Document Management (Admin)
- `POST /admin/documents/upload` - Upload PDF document
- `POST /admin/documents/:id/ingest` - Ingest approved document
- `GET /admin/documents/:id` - Get document details
- `GET /admin/documents` - List documents with pagination

### Outline Generation
- `POST /outline` - Generate structured onboarding outline
- `GET /outline/history` - Get outline history

### Chat System
- `POST /chat` - Chat with RAG system
- `GET /chat/sessions` - Get user's chat sessions
- `GET /chat/sessions/:sessionId` - Get chat history

## Testing the API

### Using the Swagger UI (Recommended for Beginners)

1. **Start the backend server:**
   ```bash
   npm run dev
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:3001/api-docs
   ```

3. **You'll see the interactive API documentation where you can:**
   - Browse all available endpoints
   - View request/response schemas
   - Try out API calls directly from the browser
   - See example responses

### Using cURL

#### Health Check
```bash
curl http://localhost:3001/health
```

#### Upload a Document (Admin)
```bash
curl -X POST http://localhost:3001/admin/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/document.pdf" \
  -F "role_tags=[\"software-intern\",\"data-analyst\"]" \
  -F "team_ids=[1,2]" \
  -F "sensitivity_tags=[\"internal\"]"
```

#### Ingest a Document
```bash
curl -X POST http://localhost:3001/admin/documents/DOCUMENT_ID/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reingest": false}'
```

#### Generate an Outline
```bash
curl -X POST http://localhost:3001/outline \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "software-intern",
    "teamId": 1,
    "level": "intern",
    "locale": "en-US",
    "sections": ["dos", "donts", "policies", "timeline", "acknowledgements"]
  }'
```

#### Chat with the System
```bash
curl -X POST http://localhost:3001/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I get VPN access?",
    "maxTokens": 600
  }'
```

#### Get Chat History
```bash
curl http://localhost:3001/chat/sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman

1. **Import the API:**
   - Open Postman
   - Create a new collection named "InternCompass API"
   - Add base URL as a collection variable: `http://localhost:3001`

2. **Set up authentication:**
   - Go to the collection's Authorization tab
   - Type: Bearer Token
   - Token: `YOUR_TOKEN`

3. **Create requests for each endpoint listed above**

4. **Alternative:** Import from Swagger
   - Visit `http://localhost:3001/api-docs`
   - Look for the "Download" or "Export" option
   - Import the OpenAPI spec into Postman

### Using the Example Script

We provide a ready-to-use example script in the `examples/` folder:

1. **Make sure the backend is running:**
   ```bash
   npm run dev
   ```

2. **In another terminal, run the example script:**
   ```bash
   node examples/api-usage.js
   ```

3. **The script demonstrates:**
   - Health check
   - Document upload (requires multipart form data setup)
   - Document ingestion
   - Outline generation
   - Chat interaction
   - Chat history retrieval

4. **Customize the script:**
   - Update `AUTH_TOKEN` with a valid token
   - Modify the example data to match your use case
   - Add or remove API calls as needed

### Using Thunder Client (VS Code Extension)

1. **Install Thunder Client extension in VS Code**

2. **Create a new request:**
   - Click the Thunder Client icon in the sidebar
   - Click "New Request"
   - Set the method (GET, POST, etc.)
   - Enter the URL: `http://localhost:3001/endpoint`

3. **Add headers:**
   - Click the "Headers" tab
   - Add: `Authorization: Bearer YOUR_TOKEN`
   - Add: `Content-Type: application/json`

4. **Add request body (for POST requests):**
   - Click the "Body" tab
   - Select "JSON"
   - Enter your JSON payload

### Using HTTPie

HTTPie is a user-friendly command-line HTTP client:

#### Install HTTPie
```bash
# Windows (using pip)
pip install httpie

# Or using Scoop
scoop install httpie
```

#### Example Requests
```bash
# Health check
http GET http://localhost:3001/health

# Chat
http POST http://localhost:3001/chat \
  Authorization:"Bearer YOUR_TOKEN" \
  message="How do I get VPN access?" \
  maxTokens:=600

# Generate outline
http POST http://localhost:3001/outline \
  Authorization:"Bearer YOUR_TOKEN" \
  role="software-intern" \
  teamId:=1 \
  level="intern" \
  locale="en-US" \
  sections:='["dos","donts","policies","timeline","acknowledgements"]'
```

### Common Testing Tips

1. **Start with the health endpoint** to verify the service is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check the logs** for detailed error messages:
   - The backend logs will show request details and any errors
   - Look for structured JSON logs with request IDs

3. **Authentication:** Most endpoints require authentication. Replace `YOUR_TOKEN` with:
   - A valid JWT token from your auth system
   - For development, check if mock tokens are enabled

4. **Rate limiting:** Be aware that endpoints have rate limits:
   - 100 requests per 15 minutes for most endpoints
   - 10 requests per 15 minutes for resource-intensive operations

5. **Test data:** Use the sample PDF in `test/data/` folder:
   ```
   test/data/05-versions-space.pdf
   ```

6. **Workflow testing:** Follow this sequence for complete testing:
   - ✅ Health check
   - ✅ Upload document (admin)
   - ✅ Review and approve document
   - ✅ Ingest document
   - ✅ Generate outline
   - ✅ Chat with the system
   - ✅ Get chat history

### Troubleshooting API Tests

- **Connection refused:** Make sure the backend is running on port 3001
- **401 Unauthorized:** Check your authentication token
- **500 Internal Server Error:** Check backend logs and ensure all services (PostgreSQL, Redis, S3) are running
- **Rate limit exceeded:** Wait 15 minutes or restart the server to reset rate limits
- **Document ingestion stuck:** Make sure the worker process is running (`npm run worker`)

## How RAG Works Here

### 1. Document Upload & Review
1. Admin uploads PDF via `/admin/documents/upload`
2. Document stored in S3 with metadata in PostgreSQL
3. Document status set to `pending_review`
4. Admin reviews and approves document

### 2. Document Ingestion
1. Approved document queued for ingestion via `/admin/documents/:id/ingest`
2. PDF downloaded from S3
3. Text extracted using pdf-parse (with OCR fallback)
4. Text chunked into overlapping segments
5. Chunks embedded using Gemini Embeddings API
6. Chunks indexed in PostgreSQL with pgvector

### 3. Query Processing
1. User query received via `/chat` or `/outline`
2. Query embedded using Gemini Embeddings API
3. Similar chunks retrieved using vector similarity search
4. Context filtered by role/team permissions
5. Response generated using Gemini with retrieved context
6. Citations extracted and included in response

### 4. Guardrails
- Only approved documents are indexed
- Role/team-based access control
- Sensitivity tag filtering
- Grounded responses with citations
- Rate limiting on all endpoints

## Development

### Running Tests
```bash
# Unit tests
npm test

# With coverage
npm run test:coverage
```

### Database Migrations
```bash
# Run migrations
npm run db:migrate

# Create new migration
# Add SQL file to src/db/migrations/
```

### Code Structure
```
src/
├── controllers/          # API controllers
├── db/                  # Database connection & migrations
├── lib/                 # Shared utilities
├── middleware/          # Express middleware
├── rag/                 # RAG pipeline services
│   ├── services/        # Core RAG services
│   └── types.ts         # TypeScript types
├── routes/              # API routes
├── tests/               # Test files
└── workers/             # BullMQ workers
```

## Production Deployment

### Docker
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Environment Setup
1. Set up PostgreSQL with pgvector
2. Configure Redis instance
3. Set up S3/MinIO bucket
4. Configure environment variables
5. Run database migrations
6. Deploy application and workers

### Monitoring
- Health check endpoint: `GET /health`
- API documentation: `GET /api-docs`
- Logs via Pino (structured JSON)
- Database connection monitoring
- Redis connection monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.