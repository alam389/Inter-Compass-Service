import { describe, it, expect, vi } from 'vitest';
import { EmbeddingService } from '../../rag/services/embed.js';

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      embedContent: vi.fn().mockResolvedValue({
        embedding: {
          values: new Array(1536).fill(0.1),
        },
      }),
    }),
  })),
}));

describe('EmbeddingService', () => {
  it('should generate embeddings for single text', async () => {
    const text = 'This is a test text for embedding.';
    const embedding = await EmbeddingService.embedSingle(text);
    
    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(1536);
    expect(embedding.every(val => typeof val === 'number')).toBe(true);
  });

  it('should generate embeddings for batch of texts', async () => {
    const texts = [
      'First test text.',
      'Second test text.',
      'Third test text.',
    ];
    
    const embeddings = await EmbeddingService.embedBatch(texts);
    
    expect(embeddings).toBeDefined();
    expect(Array.isArray(embeddings)).toBe(true);
    expect(embeddings.length).toBe(texts.length);
    expect(embeddings.every(embedding => 
      Array.isArray(embedding) && embedding.length === 1536
    )).toBe(true);
  });

  it('should validate embedding dimensions', () => {
    const validEmbedding = new Array(1536).fill(0.1);
    const invalidEmbedding = new Array(100).fill(0.1);
    const invalidEmbedding2 = ['not', 'numbers'];
    
    expect(EmbeddingService.validateEmbedding(validEmbedding)).toBe(true);
    expect(EmbeddingService.validateEmbedding(invalidEmbedding)).toBe(false);
    expect(EmbeddingService.validateEmbedding(invalidEmbedding2 as any)).toBe(false);
  });
});
