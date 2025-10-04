import { getPool } from '../../db/connection.js';
import { logger } from '../../lib/logger.js';
import { DocumentChunk, RetrievalFilter } from '../types.js';

export class IndexingService {
  /**
   * Index document chunks with embeddings
   */
  static async indexChunks(
    documentId: string,
    chunks: Array<{
      text: string;
      tokens: number;
      page_from?: number;
      page_to?: number;
      chunk_index: number;
    }>,
    embeddings: number[][],
    roleTags: string[] = [],
    teamIds: number[] = []
  ): Promise<void> {
    const pool = getPool();
    
    try {
      await pool.query('BEGIN');

      // Delete existing chunks for this document
      await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);

      // Insert new chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        await pool.query(`
          INSERT INTO document_chunks (
            document_id, chunk_index, text, tokens, embedding,
            role_tags, team_ids, page_from, page_to
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          documentId,
          chunk.chunk_index,
          chunk.text,
          chunk.tokens,
          JSON.stringify(embedding),
          roleTags,
          teamIds,
          chunk.page_from || null,
          chunk.page_to || null
        ]);
      }

      await pool.query('COMMIT');
      logger.info(`Indexed ${chunks.length} chunks for document ${documentId}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      logger.error('Failed to index chunks:', error);
      throw error;
    }
  }

  /**
   * Remove chunks for a document
   */
  static async removeDocumentChunks(documentId: string): Promise<void> {
    const pool = getPool();
    
    try {
      await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
      logger.info(`Removed chunks for document ${documentId}`);
    } catch (error) {
      logger.error('Failed to remove document chunks:', error);
      throw error;
    }
  }
}

export class RetrievalService {
  /**
   * Retrieve similar chunks based on query embedding
   */
  static async retrieveSimilar(
    query: string,
    queryEmbedding: number[],
    filter: RetrievalFilter = {},
    k: number = 8
  ): Promise<DocumentChunk[]> {
    const pool = getPool();
    
    try {
      let whereConditions = ["d.status = 'approved'"];
      let params: any[] = [JSON.stringify(queryEmbedding), k];
      let paramIndex = 3;

      // Add role tags filter
      if (filter.roleTags && filter.roleTags.length > 0) {
        whereConditions.push(`dc.role_tags && $${paramIndex}`);
        params.push(filter.roleTags);
        paramIndex++;
      }

      // Add team IDs filter
      if (filter.teamIds && filter.teamIds.length > 0) {
        whereConditions.push(`dc.team_ids && $${paramIndex}`);
        params.push(filter.teamIds);
        paramIndex++;
      }

      // Exclude sensitivity tags
      if (filter.sensitivityExclude && filter.sensitivityExclude.length > 0) {
        whereConditions.push(`NOT (d.sensitivity_tags && $${paramIndex})`);
        params.push(filter.sensitivityExclude);
        paramIndex++;
      }

      const query = `
        SELECT 
          dc.id, dc.document_id, dc.chunk_index, dc.text, dc.tokens,
          dc.role_tags, dc.team_ids, dc.page_from, dc.page_to, dc.created_at,
          d.title as document_title
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY dc.embedding <=> $1
        LIMIT $2
      `;

      const result = await pool.query(query, params);
      
      const chunks: DocumentChunk[] = result.rows.map(row => ({
        id: row.id,
        document_id: row.document_id,
        chunk_index: row.chunk_index,
        text: row.text,
        tokens: row.tokens,
        embedding: [], // Not needed in response
        role_tags: row.role_tags,
        team_ids: row.team_ids,
        page_from: row.page_from,
        page_to: row.page_to,
        created_at: row.created_at
      }));

      logger.info(`Retrieved ${chunks.length} similar chunks for query: ${query.substring(0, 100)}...`);
      return chunks;
    } catch (error) {
      logger.error('Failed to retrieve similar chunks:', error);
      throw error;
    }
  }

  /**
   * Get document chunks by document ID
   */
  static async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const pool = getPool();
    
    try {
      const result = await pool.query(`
        SELECT 
          id, document_id, chunk_index, text, tokens,
          role_tags, team_ids, page_from, page_to, created_at
        FROM document_chunks
        WHERE document_id = $1
        ORDER BY chunk_index
      `, [documentId]);

      return result.rows.map(row => ({
        id: row.id,
        document_id: row.document_id,
        chunk_index: row.chunk_index,
        text: row.text,
        tokens: row.tokens,
        embedding: [], // Not needed in response
        role_tags: row.role_tags,
        team_ids: row.team_ids,
        page_from: row.page_from,
        page_to: row.page_to,
        created_at: row.created_at
      }));
    } catch (error) {
      logger.error('Failed to get document chunks:', error);
      throw error;
    }
  }
}
