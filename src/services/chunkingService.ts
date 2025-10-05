/**
 * Text Chunking Service
 * Intelligently splits text into chunks for embedding and retrieval
 */

export interface TextChunk {
  text: string;
  index: number;
  tokenCount: number;
  metadata?: {
    startChar: number;
    endChar: number;
    section?: string;
  };
}

export class ChunkingService {
  private readonly DEFAULT_CHUNK_SIZE = 512; // tokens
  private readonly DEFAULT_OVERLAP = 50; // tokens
  private readonly CHARS_PER_TOKEN = 4; // rough estimate

  /**
   * Split text into chunks with overlap
   */
  chunkText(
    text: string,
    chunkSize: number = this.DEFAULT_CHUNK_SIZE,
    overlapSize: number = this.DEFAULT_OVERLAP
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // Convert token sizes to character estimates
    const chunkChars = chunkSize * this.CHARS_PER_TOKEN;
    const overlapChars = overlapSize * this.CHARS_PER_TOKEN;

    // First, try to split by sections (paragraphs)
    const paragraphs = this.splitIntoParagraphs(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

      // If adding this paragraph exceeds chunk size and we already have content
      if (potentialChunk.length > chunkChars && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex,
          tokenCount: Math.ceil(currentChunk.length / this.CHARS_PER_TOKEN),
          metadata: {
            startChar,
            endChar: startChar + currentChunk.length,
          }
        });

        // Start new chunk with overlap from previous chunk
        const overlapText = this.getOverlapText(currentChunk, overlapChars);
        startChar = startChar + currentChunk.length - overlapText.length;
        currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add the last chunk if it exists
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: Math.ceil(currentChunk.length / this.CHARS_PER_TOKEN),
        metadata: {
          startChar,
          endChar: startChar + currentChunk.length,
        }
      });
    }

    return chunks;
  }

  /**
   * Split text into semantic chunks (by headings, paragraphs)
   */
  chunkBySections(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // Split by markdown-style headings or double newlines
    const sections = text.split(/(?=^#{1,6}\s)/m);
    
    let globalIndex = 0;
    let currentPosition = 0;

    for (const section of sections) {
      if (section.trim().length === 0) continue;

      // If section is too large, chunk it further
      if (section.length > this.DEFAULT_CHUNK_SIZE * this.CHARS_PER_TOKEN) {
        const subChunks = this.chunkText(section);
        subChunks.forEach(chunk => {
          chunks.push({
            ...chunk,
            index: globalIndex++,
            metadata: {
              ...chunk.metadata,
              startChar: currentPosition + (chunk.metadata?.startChar || 0),
              endChar: currentPosition + (chunk.metadata?.endChar || 0),
            }
          });
        });
      } else {
        chunks.push({
          text: section.trim(),
          index: globalIndex++,
          tokenCount: Math.ceil(section.length / this.CHARS_PER_TOKEN),
          metadata: {
            startChar: currentPosition,
            endChar: currentPosition + section.length,
          }
        });
      }

      currentPosition += section.length;
    }

    return chunks;
  }

  /**
   * Split text into paragraphs
   */
  private splitIntoParagraphs(text: string): string[] {
    // Split by double newlines or more
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string, overlapChars: number): string {
    if (text.length <= overlapChars) {
      return text;
    }

    // Try to find a good break point (end of sentence)
    const overlapSection = text.slice(-overlapChars);
    const lastSentence = overlapSection.match(/[.!?]\s+[A-Z]/g);
    
    if (lastSentence && lastSentence.length > 0) {
      const lastIndex = overlapSection.lastIndexOf(lastSentence[lastSentence.length - 1]);
      return overlapSection.slice(lastIndex + 2); // +2 to skip the punctuation and space
    }

    // Fallback: just return the last n characters
    return overlapSection;
  }

  /**
   * Estimate token count for text
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }
}

export const chunkingService = new ChunkingService();
