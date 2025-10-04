import { Router } from 'express';
import { GeminiController } from '../controllers/geminiController';
import { validateRequest, aiRateLimit, asyncHandler } from '../middleware/validation';

/**
 * Gemini Routes
 * Defines API endpoints for Gemini AI operations
 */

const router = Router();

// Apply AI rate limiting to all routes
router.use(aiRateLimit);

// Base path: /api/gemini

/**
 * GET /api/gemini/status
 * Get Gemini service status and configuration
 */
router.get('/status', asyncHandler(GeminiController.getStatus));

/**
 * GET /api/gemini/test
 * Test Gemini connection
 */
router.get('/test', asyncHandler(GeminiController.testConnection));

/**
 * POST /api/gemini/generate
 * Generate text from a prompt
 * 
 * Body:
 * {
 *   "prompt": string (required),
 *   "model": "flash" | "pro" (optional, default: "flash"),
 *   "config": {
 *     "temperature": number (optional, 0-1),
 *     "topK": number (optional),
 *     "topP": number (optional, 0-1),
 *     "maxOutputTokens": number (optional)
 *   }
 * }
 */
router.post('/generate', 
  validateRequest([
    { field: 'prompt', required: true, type: 'string', minLength: 1, maxLength: 10000 }
  ]),
  asyncHandler(GeminiController.generateText)
);

/**
 * POST /api/gemini/chat/start
 * Start a new chat session
 * 
 * Body:
 * {
 *   "history": array (optional),
 *   "model": "flash" | "pro" (optional, default: "flash"),
 *   "config": object (optional)
 * }
 */
router.post('/chat/start', asyncHandler(GeminiController.startChat));

/**
 * POST /api/gemini/chat/message
 * Send a message in a chat conversation
 * 
 * Body:
 * {
 *   "message": string (required),
 *   "history": array (optional),
 *   "model": "flash" | "pro" (optional, default: "flash"),
 *   "config": object (optional)
 * }
 */
router.post('/chat/message',
  validateRequest([
    { field: 'message', required: true, type: 'string', minLength: 1, maxLength: 5000 }
  ]),
  asyncHandler(GeminiController.sendMessage)
);

/**
 * POST /api/gemini/analyze
 * Analyze content with specific instructions
 * 
 * Body:
 * {
 *   "content": string (required),
 *   "instruction": string (required),
 *   "model": "flash" | "pro" (optional, default: "flash"),
 *   "config": object (optional)
 * }
 */
router.post('/analyze',
  validateRequest([
    { field: 'content', required: true, type: 'string', minLength: 1, maxLength: 50000 },
    { field: 'instruction', required: true, type: 'string', minLength: 1, maxLength: 1000 }
  ]),
  asyncHandler(GeminiController.analyzeContent)
);

export default router;