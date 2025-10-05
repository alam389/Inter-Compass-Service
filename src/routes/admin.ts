import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

const router = Router();

// Get all tags
router.get('/tags', AdminController.getTags);

// Get all documents
router.get('/documents', AdminController.getDocuments);

// Search documents by metadata
router.get('/documents/search', AdminController.searchDocuments);

// Get a single document
router.get('/documents/:id', AdminController.getDocument);

// Upload and process a PDF document
router.post('/documents/upload', AdminController.uploadMiddleware, AdminController.uploadDocument);

// Create a text document (legacy support)
router.post('/documents', AdminController.createDocument);

// Delete a document
router.delete('/documents/:id', AdminController.deleteDocument);

// Get knowledge base statistics
router.get('/stats', AdminController.getStats);

// Reprocess a single document
router.post('/documents/:id/reprocess', AdminController.reprocessDocument);

// Reprocess all documents
router.post('/documents/reprocess-all', AdminController.reprocessAllDocuments);

export default router;

