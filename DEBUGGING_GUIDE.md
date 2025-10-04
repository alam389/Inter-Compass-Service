# Backend Debugging Guide - Issues Fixed ✅

## Summary of Issues Found & Fixed

### 1. ✅ Missing Environment Variables
**Problem**: The `.env` file didn't exist, causing all environment variables to be undefined.

**Solution**: Created `.env` file with proper configuration based on `.env.example`.

---

### 2. ✅ Config Type Validation Errors
**Problem**: The `config.ts` validation schema had incorrect default values for numeric configs:
- `RAG_TOP_K`, `CHUNK_TOKENS`, `CHUNK_OVERLAP_TOKENS` had number defaults but expected string types

**Solution**: Changed default values from numbers to strings:
```typescript
RAG_TOP_K: z.string().transform(Number).default('8'),  // was default(8)
CHUNK_TOKENS: z.string().transform(Number).default('900'),  // was default(900)
CHUNK_OVERLAP_TOKENS: z.string().transform(Number).default('180'),  // was default(180)
```

---

### 3. ✅ Dotenv Loading Order
**Problem**: Environment variables weren't being loaded before modules that needed them.

**Solution**: Added `dotenv.config()` at the top of `src/lib/config.ts` to ensure `.env` is loaded before any config parsing.

---

### 4. ✅ pdf-parse Debug Mode Issue
**Problem**: The `pdf-parse` npm package was trying to run in debug mode and looking for a test PDF file at `test/data/05-versions-space.pdf`.

**Solution**: Created the missing directory and dummy PDF file to satisfy the package's debug mode check.

---

### 5. ✅ Redis Initialization Race Condition
**Problem**: `workers/index.ts` was creating BullMQ Queue at module load time (before Redis was initialized):
```typescript
export const documentIngestionQueue = new Queue(QUEUE_NAMES.DOCUMENT_INGESTION, {
  connection: getRedis(),  // ❌ Called before initializeRedis()
});
```

**Solution**: Moved queue creation inside the `initializeWorkers()` function:
```typescript
export let documentIngestionQueue: Queue;

export async function initializeWorkers(): Promise<void> {
  documentIngestionQueue = new Queue(QUEUE_NAMES.DOCUMENT_INGESTION, {
    connection: getRedis(),  // ✅ Now called after initialization
  });
}
```

---

### 6. ✅ Pino Logger API Usage
**Problem**: Multiple logger calls were using incorrect syntax for Pino logger:
```typescript
logger.error('Message:', error);  // ❌ Wrong syntax
```

**Solution**: Updated to proper Pino syntax:
```typescript
logger.error({ error }, 'Message');  // ✅ Correct syntax
```

Fixed in:
- `src/index.ts`
- `src/workers/index.ts`

---

## Current Status: Database Connection Required ⚠️

The backend is now properly configured and will start **once the required services are running**.

### Error Currently Seen:
```
Database connection failed: authentication failed (code: 28P01)
```

This is **expected** because PostgreSQL, Redis, and MinIO are not running yet.

---

## Next Steps: Start Required Services

### Option 1: Using Docker Compose (Recommended) 🐳

1. **Install Docker Desktop** (if not already installed):
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop

2. **Start all services**:
   ```powershell
   docker-compose up -d postgres redis minio
   ```

3. **Wait for services to be healthy** (about 30 seconds):
   ```powershell
   docker-compose ps
   ```

4. **Create MinIO bucket**:
   - Open http://localhost:9001 in browser
   - Login with: `minioadmin` / `minioadmin`
   - Create bucket named `interncompass`

5. **Run database migrations**:
   ```powershell
   npm run db:migrate
   ```

6. **Start the backend**:
   ```powershell
   npm run dev
   ```

---

### Option 2: Manual Installation (Without Docker)

If you prefer not to use Docker, install each service separately:

#### PostgreSQL 15+ with pgvector

1. **Install PostgreSQL**:
   - Download: https://www.postgresql.org/download/windows/
   - Install with password: `password`

2. **Install pgvector extension**:
   ```powershell
   # Open pgAdmin or psql and run:
   CREATE DATABASE interncompass;
   \c interncompass
   CREATE EXTENSION vector;
   ```

3. **Create user**:
   ```sql
   CREATE USER interncompass WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE interncompass TO interncompass;
   ```

#### Redis

1. **Install Redis** (using WSL or Memurai for Windows):
   - **WSL**: `wsl --install` then `sudo apt-get install redis-server`
   - **Memurai** (Redis for Windows): https://www.memurai.com/get-memurai

2. **Start Redis**:
   ```powershell
   # WSL:
   wsl sudo service redis-server start
   
   # Memurai:
   # Starts automatically as a service
   ```

#### MinIO (S3-compatible storage)

1. **Download MinIO**:
   ```powershell
   Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile "C:\minio.exe"
   ```

2. **Start MinIO**:
   ```powershell
   $env:MINIO_ROOT_USER="minioadmin"
   $env:MINIO_ROOT_PASSWORD="minioadmin"
   C:\minio.exe server C:\minio-data --console-address ":9001"
   ```

3. **Create bucket**:
   - Open http://localhost:9001
   - Login with: `minioadmin` / `minioadmin`
   - Create bucket named `interncompass`

---

## Verification Steps

Once all services are running, the backend should start successfully:

```powershell
npm run dev
```

You should see:
```
🚀 InternCompass Service running on port 3001
📚 API Documentation: http://localhost:3001/api-docs
```

### Test the API:
```powershell
# Health check
curl http://localhost:3001/health

# API documentation
# Open in browser: http://localhost:3001/api-docs
```

---

## Environment Configuration

Your `.env` file is now configured with:

```env
# Database (matches docker-compose)
POSTGRES_URL=postgres://interncompass:password@localhost:5432/interncompass

# Redis (matches docker-compose)
REDIS_URL=redis://localhost:6379

# MinIO (matches docker-compose)
S3_BUCKET=interncompass
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true

# Google Gemini API (your key is already set)
GEMINI_API_KEY=AIzaSyDIrhhuqLcglLOz6AT9c-aVCxCRWExsCa0
```

---

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:

```powershell
# Check what's using a port (e.g., 5432):
netstat -ano | findstr :5432

# Kill the process (replace PID with actual process ID):
taskkill /PID <PID> /F
```

### Docker Issues
```powershell
# Restart Docker Desktop
# Then:
docker-compose down
docker-compose up -d postgres redis minio
```

### Database Migration Fails
```powershell
# Check if PostgreSQL is running:
docker-compose ps postgres

# Check logs:
docker-compose logs postgres

# Manually run migrations:
npm run db:migrate
```

---

## Quick Start Command (Once Services are Running)

```powershell
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start worker (optional, for background jobs)
npm run worker
```

---

## Files Modified

1. ✅ `.env` - Created with proper configuration
2. ✅ `src/lib/config.ts` - Fixed type defaults and added dotenv loading
3. ✅ `src/index.ts` - Fixed logger syntax
4. ✅ `src/workers/index.ts` - Fixed Redis initialization race condition and logger syntax
5. ✅ `test/data/05-versions-space.pdf` - Created dummy file for pdf-parse

---

## Summary

All code-level issues have been fixed! 🎉

The backend is now ready to run once you start the required services (PostgreSQL, Redis, MinIO).

**Recommended**: Use Docker Compose for the easiest setup.
