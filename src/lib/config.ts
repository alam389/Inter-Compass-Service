import { z } from 'zod';

const configSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  POSTGRES_URL: z.string().min(1, 'POSTGRES_URL is required'),
  POSTGRES_SSL: z.string().transform(val => val === 'true').default('false'),
  
  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  
  // Google Gemini
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  GEN_MODEL: z.string().default('gemini-1.5-pro'),
  
  // RAG Configuration
  RAG_TOP_K: z.string().transform(Number).default(8),
  CHUNK_TOKENS: z.string().transform(Number).default(900),
  CHUNK_OVERLAP_TOKENS: z.string().transform(Number).default(180),
  
  // AWS S3
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_REGION: z.string().min(1, 'S3_REGION is required'),
  S3_ENDPOINT: z.string().url().default('https://s3.amazonaws.com'),
  S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY is required'),
  S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY is required'),
  S3_FORCE_PATH_STYLE: z.string().transform(val => val === 'true').default('false'),
  
  // Logging
  LOG_LEVEL: z.string().default('info'),
  
  // Frontend
  FRONTEND_URL: z.string().url().optional()
});

export const config = configSchema.parse(process.env);
