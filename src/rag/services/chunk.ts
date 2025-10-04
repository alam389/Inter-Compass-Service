import { config } from '../../lib/config.js';
import { logger } from '../../lib/logger.js';
import { ExtractedPage, Chunk } from '../types.js';

export class ChunkingService {
  private static readonly CHUNK_TOKENS = config.CHUNK_TOKENS;
  private static readonly CHUNK_OVERLAP_TOKENS = config.CHUNK_OVERLAP_TOKENS;

  /**
   * Chunk pages into smaller text segments with overlap
   */
  static chunkPages(pages: ExtractedPage[]): Chunk[] {
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    for (const page of pages) {
      const pageChunks = this.chunkText(page.text, page.pageNumber, chunkIndex);
      chunks.push(...pageChunks);
      chunkIndex += pageChunks.length;
    }

    logger.info(`Created ${chunks.length} chunks from ${pages.length} pages`);
    return chunks;
  }

  /**
   * Chunk a single text into smaller segments
   */
  private static chunkText(text: string, pageNumber: number, startChunkIndex: number): Chunk[] {
    const chunks: Chunk[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = startChunkIndex;
    let pageFrom = pageNumber;
    let pageTo = pageNumber;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;
      
      const sentenceTokens = this.estimateTokens(sentence);

      // If adding this sentence would exceed the token limit, finalize current chunk
      if (currentTokens + sentenceTokens > this.CHUNK_TOKENS && currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          tokens: currentTokens,
          page_from: pageFrom,
          page_to: pageTo,
          chunk_index: chunkIndex
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk);
        currentChunk = overlapText + ' ' + sentence;
        currentTokens = this.estimateTokens(currentChunk);
        pageFrom = pageNumber;
        pageTo = pageNumber;
        chunkIndex++;
      } else {
        // Add sentence to current chunk
        if (currentChunk) {
          currentChunk += ' ' + sentence;
        } else {
          currentChunk = sentence || '';
          pageFrom = pageNumber;
        }
        currentTokens += sentenceTokens;
        pageTo = pageNumber;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens,
        page_from: pageFrom,
        page_to: pageTo,
        chunk_index: chunkIndex
      });
    }

    return chunks;
  }

  /**
   * Split text into sentences (simple approach)
   */
  private static splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - in production, you might want to use a more sophisticated approach
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private static getOverlapText(text: string): string {
    const words = text.split(' ');
    const overlapWords = Math.floor(this.CHUNK_OVERLAP_TOKENS * 0.75); // Rough word count for overlap
    return words.slice(-overlapWords).join(' ');
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate chunk size
   */
  static validateChunk(chunk: Chunk): boolean {
    return chunk.tokens <= this.CHUNK_TOKENS && chunk.text.trim().length > 0;
  }
}
