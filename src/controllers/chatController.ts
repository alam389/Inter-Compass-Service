import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/connection.js';
import { EmbeddingService } from '../rag/services/embed.js';
import { RetrievalService } from '../rag/services/index.js';
import { PromptingService } from '../rag/services/prompt.js';
import { logger } from '../lib/logger.js';

// Validation schema
const chatRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  maxTokens: z.number().int().min(100).max(2000).optional().default(600),
});

/**
 * Chat with the RAG system
 */
export async function chat(req: Request, res: Response) {
  try {
    // Validate request body
    const requestData = chatRequestSchema.parse(req.body);
    
    // Get or create session
    let sessionId = requestData.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
    }
    
    const pool = getPool();
    
    // Ensure session exists
    await pool.query(`
      INSERT INTO chat_sessions (id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `, [sessionId, req.user?.id || 'unknown']);
    
    // Generate query embedding
    const queryEmbedding = await EmbeddingService.embedSingle(requestData.message);
    
    // Determine user scope (in production, this would come from auth context)
    const userRole = req.user?.role || 'intern';
    const userTeamId = req.user?.teamId || 1;
    
    // Retrieve relevant chunks
    const filter = {
      roleTags: [userRole],
      teamIds: [userTeamId],
      sensitivityExclude: ['secrets', 'pii', 'confidential'],
    };
    
    const context = await RetrievalService.retrieveSimilar(
      requestData.message,
      queryEmbedding,
      filter,
      parseInt(process.env.RAG_TOP_K || '8')
    );
    
    if (context.length === 0) {
      const response = {
        sessionId,
        answer: "I don't have any approved materials that can help with your question. Please contact your manager or HR for assistance.",
        citations: [],
        guardrails: {
          grounded: false,
          refused: true,
        },
      };
      
      // Log the interaction
      await pool.query(`
        INSERT INTO chat_messages (session_id, user_id, role, content, citations)
        VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, req.user?.id || 'unknown', 'user', requestData.message, '[]']);
      
      await pool.query(`
        INSERT INTO chat_messages (session_id, role, content, citations)
        VALUES ($1, $2, $3, $4)
      `, [sessionId, 'assistant', response.answer, '[]']);
      
      return res.json(response);
    }
    
    // Generate response using Gemini
    const response = await PromptingService.generateChatResponse(
      requestData.message,
      context,
      sessionId,
      userRole,
      userTeamId
    );
    
    // Log the interaction
    await pool.query(`
      INSERT INTO chat_messages (session_id, user_id, role, content, citations)
      VALUES ($1, $2, $3, $4, $5)
    `, [sessionId, req.user?.id || 'unknown', 'user', requestData.message, '[]']);
    
    await pool.query(`
      INSERT INTO chat_messages (session_id, role, content, citations)
      VALUES ($1, $2, $3, $4)
    `, [sessionId, 'assistant', response.answer, JSON.stringify(response.citations)]);
    
    logger.info(`Chat response generated for session: ${sessionId}`);
    
    return res.json(response);
  } catch (error) {
    logger.error({ error }, 'Chat failed');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    return res.status(500).json({ error: 'Chat failed' });
  }
}

/**
 * Get chat history for a session
 */
export async function getChatHistory(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, role, content, citations, created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId]);
    
    return res.json({
      sessionId,
      messages: result.rows.map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        citations: row.citations,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get chat history');
    return res.status(500).json({ error: 'Failed to get chat history' });
  }
}

/**
 * Get user's chat sessions
 */
export async function getChatSessions(req: Request, res: Response) {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT cs.id, cs.created_at, cs.updated_at,
             COUNT(cm.id) as message_count
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      WHERE cs.user_id = $1
      GROUP BY cs.id, cs.created_at, cs.updated_at
      ORDER BY cs.updated_at DESC
      LIMIT 20
    `, [req.user?.id || 'unknown']);
    
    return res.json({
      sessions: result.rows.map(row => ({
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: parseInt(row.message_count),
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get chat sessions');
    return res.status(500).json({ error: 'Failed to get chat sessions' });
  }
}
