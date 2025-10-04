import { describe, it, expect } from 'vitest';
import { ChunkingService } from '../../rag/services/chunk.js';
import { ExtractedPage } from '../../rag/types.js';

describe('ChunkingService', () => {
  const mockPages: ExtractedPage[] = [
    {
      pageNumber: 1,
      text: 'This is a test document. It contains multiple sentences. Each sentence should be properly chunked. The chunking service should handle this correctly.',
    },
    {
      pageNumber: 2,
      text: 'This is the second page. It also contains multiple sentences. The chunking should work across pages as well.',
    },
  ];

  it('should chunk pages correctly', () => {
    const chunks = ChunkingService.chunkPages(mockPages);
    
    expect(chunks).toBeDefined();
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty('text');
    expect(chunks[0]).toHaveProperty('tokens');
    expect(chunks[0]).toHaveProperty('page_from');
    expect(chunks[0]).toHaveProperty('page_to');
    expect(chunks[0]).toHaveProperty('chunk_index');
  });

  it('should validate chunks correctly', () => {
    const validChunk = {
      text: 'This is a valid chunk.',
      tokens: 5,
      page_from: 1,
      page_to: 1,
      chunk_index: 0,
    };

    const invalidChunk = {
      text: '',
      tokens: 1000,
      page_from: 1,
      page_to: 1,
      chunk_index: 0,
    };

    expect(ChunkingService.validateChunk(validChunk)).toBe(true);
    expect(ChunkingService.validateChunk(invalidChunk)).toBe(false);
  });

  it('should handle empty pages', () => {
    const emptyPages: ExtractedPage[] = [
      {
        pageNumber: 1,
        text: '',
      },
    ];

    const chunks = ChunkingService.chunkPages(emptyPages);
    expect(chunks).toBeDefined();
    expect(chunks.length).toBe(0);
  });
});
