import { describe, it, expect } from 'vitest';
import { chunkText } from '$lib/modules/rag/chunk';

describe('chunkText', () => {
  it('splits text with overlap', () => {
    const text = Array.from({ length: 1200 }, (_, i) => `w${i}`).join(' ');
    const chunks = chunkText(text, 500, 50);
    expect(chunks.length).toBe(3);
    expect(chunks[0].split(/\s+/).length).toBe(500);
    expect(chunks[1].split(/\s+/)[0]).toBe('w450');
  });
});
