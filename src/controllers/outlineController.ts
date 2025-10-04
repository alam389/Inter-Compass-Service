import { Request, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { EmbeddingService } from '../rag/services/embed.js';
import { RetrievalService } from '../rag/services/index.js';
import { PromptingService } from '../rag/services/prompt.js';
import { logger } from '../lib/logger.js';

// Validation schema
const outlineRequestSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  teamId: z.number().int().positive('Team ID must be a positive integer'),
  level: z.string().optional().default('intern'),
  locale: z.string().optional().default('en-US'),
  sections: z.array(z.string()).optional().default(['dos', 'donts', 'policies', 'timeline', 'acknowledgements']),
});

/**
 * Generate structured onboarding outline
 */
export async function generateOutline(req: Request, res: Response) {
  try {
    // Validate request body
    const requestData = outlineRequestSchema.parse(req.body);
    
    // Create seed query for retrieval
    const seedQuery = `onboarding ${requestData.role} team ${requestData.teamId} policies dos donts timeline acknowledgements ${requestData.locale}`;
    
    // Generate query embedding
    const queryEmbedding = await EmbeddingService.embedSingle(seedQuery);
    
    // Retrieve relevant chunks
    const filter = {
      roleTags: [requestData.role],
      teamIds: [requestData.teamId],
      sensitivityExclude: ['secrets', 'pii', 'confidential'],
    };
    
    const context = await RetrievalService.retrieveSimilar(
      seedQuery,
      queryEmbedding,
      filter,
      parseInt(process.env.RAG_TOP_K || '8')
    );
    
    if (context.length === 0) {
      return res.json({
        outline: {
          dos: [],
          donts: [],
          policies: [],
          timeline: [],
          acknowledgements: [],
        },
        citations: [],
        message: 'No relevant documents found for this role and team. Please ensure documents are uploaded and approved.',
      });
    }
    
    // Generate outline using Gemini
    const outline = await PromptingService.generateOutline(context, requestData);
    
    // Save outline to database
    const pool = getPool();
    await pool.query(`
      INSERT INTO outlines (role, team_id, request_payload, outline_json, citations, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      requestData.role,
      requestData.teamId,
      JSON.stringify(requestData),
      JSON.stringify(outline.outline),
      JSON.stringify(outline.citations),
      req.user?.id || 'unknown'
    ]);
    
    logger.info(`Outline generated for role: ${requestData.role}, team: ${requestData.teamId}`);
    
    return res.json(outline);
  } catch (error) {
    logger.error({ error }, 'Outline generation failed');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    return res.status(500).json({ error: 'Failed to generate outline' });
  }
}

/**
 * Get outline history for a role and team
 */
export async function getOutlineHistory(req: Request, res: Response) {
  try {
    const { role, teamId } = req.query;
    
    if (!role || !teamId) {
      return res.status(400).json({ error: 'Role and teamId are required' });
    }
    
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, role, team_id, request_payload, outline_json, citations, created_at
      FROM outlines
      WHERE role = $1 AND team_id = $2
      ORDER BY created_at DESC
      LIMIT 10
    `, [role, teamId]);
    
    return res.json({
      outlines: result.rows.map(row => ({
        id: row.id,
        role: row.role,
        teamId: row.team_id,
        requestPayload: row.request_payload,
        outline: row.outline_json,
        citations: row.citations,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get outline history');
    return res.status(500).json({ error: 'Failed to get outline history' });
  }
}
