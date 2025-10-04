import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { authMiddleware } from './middleware/auth.js';
import { setupSwagger } from './lib/swagger.js';
import { initializeDatabase } from './db/connection.js';
import { initializeRedis } from './lib/redis.js';
import { initializeWorkers } from './workers/index.js';

// Import route handlers
import adminRoutes from './routes/admin.js';
import outlineRoutes from './routes/outline.js';
import chatRoutes from './routes/chat.js';
import healthRoutes from './routes/health.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
app.use(rateLimiter);

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/admin', authMiddleware, adminRoutes);
app.use('/outline', authMiddleware, outlineRoutes);
app.use('/chat', authMiddleware, chatRoutes);

// Swagger documentation
setupSwagger(app);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    // Initialize services
    await initializeDatabase();
    await initializeRedis();
    await initializeWorkers();
    
    app.listen(PORT, () => {
      logger.info(`🚀 InternCompass Service running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
