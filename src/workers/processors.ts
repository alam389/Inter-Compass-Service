import { Job } from 'bullmq';
import { getPool } from '../db/connection.js';
import { S3Service } from '../lib/s3.js';
import { PDFExtractionService } from '../rag/services/extract.js';
import { ChunkingService } from '../rag/services/chunk.js';
import { EmbeddingService } from '../rag/services/embed.js';
import { IndexingService } from '../rag/services/index.js';
import { logger } from '../lib/logger.js';

interface DocumentIngestionJobData {
  documentId: string;
}

export async function processDocumentIngestion(job: Job<DocumentIngestionJobData>) {
  const { documentId } = job.data;
  
  try {
    logger.info(`Starting document ingestion for: ${documentId}`);
    
    // Update job progress
    await job.updateProgress(10);
    
    // Get document details from database
    const pool = getPool();
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    
    if (docResult.rows.length === 0) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    const document = docResult.rows[0];
    
    // Check if document is approved
    if (document.status !== 'approved') {
      throw new Error(`Document ${documentId} is not approved for ingestion`);
    }
    
    await job.updateProgress(20);
    
    // Download PDF from S3
    logger.info(`Downloading PDF from S3: ${document.s3_key}`);
    const pdfBuffer = await S3Service.downloadFile(document.s3_key);
    
    await job.updateProgress(30);
    
    // Extract text from PDF
    logger.info(`Extracting text from PDF: ${documentId}`);
    const pages = await PDFExtractionService.extractText(pdfBuffer);
    
    if (pages.length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }
    
    await job.updateProgress(50);
    
    // Chunk the text
    logger.info(`Chunking text: ${documentId}`);
    const chunks = ChunkingService.chunkPages(pages);
    
    if (chunks.length === 0) {
      throw new Error('No chunks could be created from the extracted text');
    }
    
    await job.updateProgress(60);
    
    // Generate embeddings
    logger.info(`Generating embeddings: ${documentId} (${chunks.length} chunks)`);
    const embeddings = await EmbeddingService.embedBatch(chunks.map(c => c.text));
    
    if (embeddings.length !== chunks.length) {
      throw new Error('Embedding count does not match chunk count');
    }
    
    await job.updateProgress(80);
    
    // Index chunks in database
    logger.info(`Indexing chunks: ${documentId}`);
    await IndexingService.indexChunks(
      document.id,
      chunks,
      embeddings,
      document.role_tags,
      document.team_ids
    );
    
    await job.updateProgress(100);
    
    logger.info(`Document ingestion completed successfully: ${documentId} (${chunks.length} chunks)`);
    
    return {
      documentId,
      chunksCreated: chunks.length,
      pagesProcessed: pages.length,
    };
    
  } catch (error) {
    logger.error(`Document ingestion failed for ${documentId}:`, error);
    
    // Update document status to indicate ingestion failure
    try {
      const pool = getPool();
      await pool.query(
        'UPDATE documents SET status = $1 WHERE id = $2',
        ['rejected', documentId]
      );
    } catch (dbError) {
      logger.error('Failed to update document status after ingestion failure:', dbError);
    }
    
    throw error;
  }
}
