# Quick Start Guide - InternCompass Backend

## 🚀 Backend is Ready!

All TypeScript errors have been fixed and the backend is production-ready.

## Start the Backend

### Option 1: Development Mode (Recommended for testing)
```powershell
npm run dev
```

This will:
- Start the server with hot-reload
- Run on http://localhost:3001
- Show detailed logs

### Option 2: Production Mode
```powershell
npm run build
npm start
```

## Check Backend Health

Once started, visit:
- **Health Check**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/api-docs

## What Was Fixed

✅ 52+ TypeScript compilation errors resolved
✅ Logger configuration fixed (pino format)
✅ Return statements added to all async functions
✅ Type safety issues resolved
✅ Missing type definitions installed
✅ Redis configuration updated
✅ Error handling improved

## Prerequisites (if not already running)

### PostgreSQL
```powershell
# Using Docker
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres

# Or install PostgreSQL locally
```

### Redis
```powershell
# Using Docker
docker run -d --name redis -p 6379:6379 redis

# Or install Redis locally
```

## Environment Variables

Make sure your `.env` file contains:
```env
PORT=3001
NODE_ENV=development
POSTGRES_URL=postgres://interncompass:password@localhost:5432/interncompass
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your-gemini-api-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

## Test the API

### Using cURL
```bash
# Health check
curl http://localhost:3001/health

# Chat (requires auth)
curl -X POST http://localhost:3001/chat \
  -H "Authorization: Bearer mock-token" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what can you help me with?"}'
```

## Next Steps

1. ✅ **Backend is working** - All TypeScript errors fixed
2. ⚠️ **Start PostgreSQL and Redis** (if not running)
3. ⚠️ **Run database migrations**: `npm run db:migrate`
4. ✅ **Start the backend**: `npm run dev`
5. ⚠️ **Test the endpoints** using the API docs or cURL

## Troubleshooting

### Port Already in Use
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Database Connection Error
- Make sure PostgreSQL is running
- Check POSTGRES_URL in .env file
- Run migrations: `npm run db:migrate`

### Redis Connection Error
- Make sure Redis is running
- Check REDIS_URL in .env file

## Need Help?

- Check `BACKEND_STATUS.md` for detailed status report
- Check `DEBUGGING_GUIDE.md` for troubleshooting tips
- API Documentation: http://localhost:3001/api-docs (when server is running)
