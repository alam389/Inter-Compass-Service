import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Inter-Compass Service API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Basic API routes
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    data: {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    }
  });
});

// Database test endpoint
app.get('/api/db/test', async (req, res) => {
  try {
    const isConnected = await db.testConnection();
    const poolStats = db.getPoolStats();
    
    res.json({
      message: 'Database connection test',
      connected: isConnected,
      poolStats: poolStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Database query endpoint
app.get('/api/db/query', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter is required',
        message: 'Please provide a valid SQL query as a query parameter'
      });
    }

    // Basic security check - only allow SELECT statements
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({
        error: 'Only SELECT queries are allowed',
        message: 'For security reasons, only SELECT statements are permitted'
      });
    }

    const result = await db.query(query);
    
    res.json({
      message: 'Query executed successfully',
      data: result.rows,
      rowCount: result.rowCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      error: 'Query execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST endpoint example
app.post('/api/test', (req, res) => {
  res.json({
    message: 'POST request received',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API test: http://localhost:${PORT}/api/test`);
  console.log(`🗄️  Database test: http://localhost:${PORT}/api/db/test`);
  
  // Test database connection on startup
  try {
    await db.testConnection();
  } catch (error) {
    console.error('❌ Failed to connect to database on startup:', error);
  }
});

export default app;
