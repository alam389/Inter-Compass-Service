import { geminiConfig } from '../config/gemini';

/**
 * Embedding Service
 * Generates embeddings for text chunks using Gemini's embedding model
 */

export interface Embedding {
  values: number[];
  dimension: number;
}

export class EmbeddingService {
  private embeddingModel: string = 'text-embedding-004'; // Gemini's embedding model

  /**
   * Generate embedding for a single text chunk
   */
  async generateEmbedding(text: string): Promise<Embedding> {
    try {
      if (!geminiConfig.isConfigured()) {
        throw new Error('Gemini service not configured');
      }

      const model = geminiConfig.getModel('text-embedding-004');
      const result = await model.embedContent(text);
      
      return {
        values: result.embedding.values,
        dimension: result.embedding.values.length
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple text chunks in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<Embedding[]> {
    const embeddings: Embedding[] = [];
    
    console.log(`🔄 Generating ${texts.length} embeddings in batches...`);
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    let processedCount = 0;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        const batchPromises = batch.map((text, idx) => 
          this.generateEmbedding(text).catch(error => {
            console.error(`❌ Error generating embedding for chunk ${i + idx}:`, error.message);
            // Return a null embedding on failure, will be filtered out
            return null;
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Filter out failed embeddings and push successful ones
        const successfulResults = batchResults.filter((result): result is Embedding => result !== null);
        embeddings.push(...successfulResults);
        
        processedCount += batch.length;
        console.log(`   Progress: ${processedCount}/${texts.length} chunks processed`);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await this.delay(500);
        }
      } catch (error) {
        console.error(`❌ Error processing batch starting at index ${i}:`, error);
        // Continue with next batch instead of failing completely
      }
    }
    
    if (embeddings.length < texts.length) {
      console.warn(`⚠️  Only generated ${embeddings.length}/${texts.length} embeddings successfully`);
    }
    
    return embeddings;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Helper function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const embeddingService = new EmbeddingService();
