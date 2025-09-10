import { describe, it, expect } from 'vitest';
import { chunkText } from '$lib/modules/rag/chunk';
import { encoding_for_model } from '@dqbd/tiktoken';

describe('chunkText', () => {
  it('splits text with token overlap', () => {
    const text = Array.from({ length: 1200 }, () => 'a').join(' ');
    const chunks = chunkText(text, 500, 50);
    expect(chunks.length).toBe(3);

    const enc = encoding_for_model('gpt-3.5-turbo');
    const firstTokens = Array.from(enc.encode(chunks[0]));
    const secondTokens = Array.from(enc.encode(chunks[1]));
    expect(firstTokens.length).toBe(500);
    expect(firstTokens.slice(-50)).toEqual(secondTokens.slice(0, 50));
    enc.free();
  });
});
