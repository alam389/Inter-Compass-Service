import { Router } from 'express';
import { uploadDocument, ingestDocument, getDocument, listDocuments } from '../controllers/documentController.js';
import { upload } from '../controllers/documentController.js';

const router = Router();

/**
 * @swagger
 * /admin/documents/upload:
 *   post:
 *     summary: Upload a document for review
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload
 *               role_tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Role tags for the document
 *               team_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Team IDs this document applies to
 *               sensitivity_tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Sensitivity tags for the document
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documentId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [pending_review, approved, rejected]
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Upload failed
 */
router.post('/documents/upload', upload.single('file'), uploadDocument);

/**
 * @swagger
 * /admin/documents/{id}/ingest:
 *   post:
 *     summary: Ingest an approved document
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reingest:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to reingest existing chunks
 *     responses:
 *       200:
 *         description: Document ingested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 chunks:
 *                   type: integer
 *       400:
 *         description: Document not approved or invalid request
 *       404:
 *         description: Document not found
 *       500:
 *         description: Ingestion failed
 */
router.post('/documents/:id/ingest', ingestDocument);

/**
 * @swagger
 * /admin/documents/{id}:
 *   get:
 *     summary: Get document details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to get document
 */
router.get('/documents/:id', getDocument);

/**
 * @swagger
 * /admin/documents:
 *   get:
 *     summary: List documents with pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of documents per page
 *     responses:
 *       200:
 *         description: List of documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Failed to list documents
 */
router.get('/documents', listDocuments);

export default router;
