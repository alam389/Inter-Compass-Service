import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../lib/config.js';
import { logger } from '../../lib/logger.js';

export class EmbeddingService {
  private static genAI: GoogleGenerativeAI | null = null;

  /**
   * Initialize the Gemini AI client
   */
  private static initializeClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Generate embeddings for a batch of texts
   */
  static async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const genAI = this.initializeClient();
      const model = genAI.getGenerativeModel({ model: config.EMBEDDING_MODEL });

      const embeddings: number[][] = [];

      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const promises = batch.map(async (text) => {
          try {
            const result = await model.embedContent(text);
            return result.embedding.values;
          } catch (error) {
            logger.error({ error, textPreview: text.substring(0, 100) }, 'Failed to embed text');
            // Return zero vector as fallback
            return new Array(1536).fill(0);
          }
        });

        const batchEmbeddings = await Promise.all(promises);
        embeddings.push(...batchEmbeddings);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(`Generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      logger.error({ error }, 'Embedding generation failed');
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  static async embedSingle(text: string): Promise<number[]> {
    const embeddings = await this.embedBatch([text]);
    return embeddings[0] || new Array(1536).fill(0);
  }

  /**
   * Validate embedding dimensions
   */
  static validateEmbedding(embedding: number[]): boolean {
    return Array.isArray(embedding) && embedding.length === 1536 && embedding.every(val => typeof val === 'number');
  }
}
