import { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { S3Service } from '../lib/s3.js';
import { logger } from '../lib/logger.js';

// Multer configuration for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Validation schemas
const uploadSchema = z.object({
  role_tags: z.array(z.string()).optional(),
  team_ids: z.array(z.number()).optional(),
  sensitivity_tags: z.array(z.string()).optional(),
});

const ingestSchema = z.object({
  reingest: z.boolean().optional().default(false),
});

/**
 * Upload document to S3 and create database record
 */
export async function uploadDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate request body
    const body = uploadSchema.parse(req.body);
    
    // Generate unique file key
    const fileId = uuidv4();
    const fileExtension = req.file.originalname.split('.').pop() || 'pdf';
    const s3Key = `documents/${fileId}.${fileExtension}`;
    
    // Calculate file hash
    const hash = createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Upload to S3
    await S3Service.uploadFile(
      s3Key,
      req.file.buffer,
      req.file.mimetype,
      {
        originalName: req.file.originalname,
        uploadedBy: req.user?.id || 'unknown',
      }
    );

    // Save to database
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO documents (
        title, s3_key, mime, uploaded_by, role_tags, team_ids, sensitivity_tags, hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, status
    `, [
      req.file.originalname,
      s3Key,
      req.file.mimetype,
      req.user?.id || 'unknown',
      body.role_tags || [],
      body.team_ids || [],
      body.sensitivity_tags || [],
      hash
    ]);

    const document = result.rows[0];
    
    logger.info(`Document uploaded: ${document.id} - ${req.file.originalname}`);
    
    return res.json({
      documentId: document.id,
      status: document.status,
    });
  } catch (error) {
    logger.error({ error }, 'Document upload failed');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    return res.status(500).json({ error: 'Upload failed' });
  }
}

/**
 * Ingest document (extract, chunk, embed, index)
 */
export async function ingestDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = ingestSchema.parse(req.body);
    
    const pool = getPool();
    
    // Get document details
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = docResult.rows[0];
    
    // Check if document is approved
    if (document.status !== 'approved') {
      return res.status(400).json({ error: 'Document must be approved before ingestion' });
    }
    
    // Download PDF from S3
    const pdfBuffer = await S3Service.downloadFile(document.s3_key);
    
    // Import services dynamically to avoid circular dependencies
    const { PDFExtractionService } = await import('../rag/services/extract.js');
    const { ChunkingService } = await import('../rag/services/chunk.js');
    const { EmbeddingService } = await import('../rag/services/embed.js');
    const { IndexingService } = await import('../rag/services/index.js');
    
    // Extract text from PDF
    const pages = await PDFExtractionService.extractText(pdfBuffer);
    
    // Chunk the text
    const chunks = ChunkingService.chunkPages(pages);
    
    // Generate embeddings
    const embeddings = await EmbeddingService.embedBatch(chunks.map(c => c.text));
    
    // Index chunks
    await IndexingService.indexChunks(
      document.id,
      chunks,
      embeddings,
      document.role_tags,
      document.team_ids
    );
    
    logger.info(`Document ingested: ${document.id} - ${chunks.length} chunks`);
    
    return res.json({
      ok: true,
      chunks: chunks.length,
    });
  } catch (error) {
    logger.error({ error }, 'Document ingestion failed');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    return res.status(500).json({ error: 'Ingestion failed' });
  }
}

/**
 * Get document details
 */
export async function getDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error({ error }, 'Failed to get document');
    return res.status(500).json({ error: 'Failed to get document' });
  }
}

/**
 * List documents with pagination
 */
export async function listDocuments(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    const pool = getPool();
    
    const result = await pool.query(`
      SELECT id, title, status, role_tags, team_ids, created_at, reviewed_at
      FROM documents
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const countResult = await pool.query('SELECT COUNT(*) FROM documents');
    const total = parseInt(countResult.rows[0].count);
    
    return res.json({
      documents: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list documents');
    return res.status(500).json({ error: 'Failed to list documents' });
  }
}
