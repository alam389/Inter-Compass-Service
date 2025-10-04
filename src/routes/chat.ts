import { Router } from 'express';
import { chat, getChatHistory, getChatSessions } from '../controllers/chatController.js';

const router = Router();

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Chat with the RAG system
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional session ID to continue conversation
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 description: User message
 *               maxTokens:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 2000
 *                 default: 600
 *                 description: Maximum tokens for response
 *     responses:
 *       200:
 *         description: Chat response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   format: uuid
 *                 answer:
 *                   type: string
 *                 citations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Citation'
 *                 guardrails:
 *                   type: object
 *                   properties:
 *                     grounded:
 *                       type: boolean
 *                     refused:
 *                       type: boolean
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Chat failed
 */
router.post('/', chat);

/**
 * @swagger
 * /chat/sessions:
 *   get:
 *     summary: Get user's chat sessions
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       messageCount:
 *                         type: integer
 *       500:
 *         description: Failed to get chat sessions
 */
router.get('/sessions', getChatSessions);

/**
 * @swagger
 * /chat/sessions/{sessionId}:
 *   get:
 *     summary: Get chat history for a session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   format: uuid
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       role:
 *                         type: string
 *                         enum: [user, assistant]
 *                       content:
 *                         type: string
 *                       citations:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Citation'
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Session ID is required
 *       500:
 *         description: Failed to get chat history
 */
router.get('/sessions/:sessionId', getChatHistory);

export default router;
