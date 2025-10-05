import { Request, Response } from 'express';
import { db } from '../database';
import { ragService } from '../services/ragService';
import multer from 'multer';

/**
 * Admin Controller
 * Handles admin operations including document management
 */

// Configure multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export class AdminController {
  /**
   * Get all tags
   */
  static async getTags(req: Request, res: Response) {
    try {
      const result = await db.query('SELECT * FROM tags ORDER BY tagtype');
      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tags',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all documents with statistics
   */
  static async getDocuments(req: Request, res: Response) {
    try {
      const result = await db.query(`
        SELECT * FROM documents_with_stats
        ORDER BY uploadedat DESC
      `);
      
      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a single document by ID
   */
  static async getDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await db.query(
        'SELECT * FROM documents WHERE documentid = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Upload and process a PDF document
   */
  static uploadMiddleware = upload.single('file');

  static async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { title, tagid } = req.body;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Document title is required'
        });
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📤 DOCUMENT UPLOAD STARTED`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   Title: ${title}`);
      console.log(`   Filename: ${req.file.originalname}`);
      console.log(`   Size: ${(req.file.size / 1024).toFixed(2)} KB`);
      console.log(`   Tag ID: ${tagid || 'None'}`);
      console.log(`${'='.repeat(60)}\n`);

      // Process the PDF using RAG service
      const startTime = Date.now();
      const metadata = await ragService.processDocument(
        req.file.buffer,
        title,
        tagid ? parseInt(tagid) : undefined,
        req.file.originalname
      );
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ DOCUMENT UPLOAD COMPLETED`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   Document ID: ${metadata.documentId}`);
      console.log(`   Processing Time: ${processingTime}s`);
      console.log(`   Pages: ${metadata.pageCount}`);
      console.log(`   Words: ${metadata.wordCount}`);
      console.log(`   Tags: ${metadata.tags?.join(', ') || 'None'}`);
      console.log(`${'='.repeat(60)}\n`);

      res.status(201).json({
        success: true,
        data: metadata,
        message: `Document uploaded and processed successfully in ${processingTime}s`,
        stats: {
          processingTimeSeconds: parseFloat(processingTime),
          pagesProcessed: metadata.pageCount,
          wordsExtracted: metadata.wordCount
        }
      });
    } catch (error) {
      console.error('\n❌ ERROR DURING DOCUMENT UPLOAD:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a text document (legacy support)
   */
  static async createDocument(req: Request, res: Response) {
    try {
      const { documenttitle, documentcontent, tagid } = req.body;
      
      if (!documenttitle || !documentcontent) {
        return res.status(400).json({
          success: false,
          error: 'Document title and content are required'
        });
      }

      const result = await db.query(
        `INSERT INTO documents (documenttitle, documentcontent, tagid)
         VALUES ($1, $2, $3) RETURNING *`,
        [documenttitle, documentcontent, tagid]
      );
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Use RAG service to delete (handles chunks too)
      await ragService.deleteDocument(parseInt(id));
      
      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get knowledge base statistics
   */
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await ragService.getKnowledgeBaseStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reprocess a single document (regenerate chunks and embeddings)
   */
  static async reprocessDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await ragService.reprocessDocument(parseInt(id));
      
      res.json({
        success: true,
        message: 'Document reprocessed successfully'
      });
    } catch (error) {
      console.error('Error reprocessing document:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reprocess document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reprocess all documents (batch operation)
   */
  static async reprocessAllDocuments(req: Request, res: Response) {
    try {
      const result = await ragService.reprocessAllDocuments();
      
      res.json({
        success: true,
        data: result,
        message: `Reprocessed ${result.processed} documents with ${result.errors} errors`
      });
    } catch (error) {
      console.error('Error reprocessing all documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reprocess documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search documents by metadata
   */
  static async searchDocuments(req: Request, res: Response) {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required'
        });
      }

      const results = await ragService.searchDocumentsByMetadata(q);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error searching documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
