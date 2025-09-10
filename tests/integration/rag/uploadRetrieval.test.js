import { describe, it, expect, vi } from 'vitest';
vi.mock('$lib/modules/rag/PgVectorStore', () => ({ PgVectorStore: class {} }));
import { chunkText } from '$lib/modules/rag/chunk';
import { RetrievalService } from '$lib/modules/rag/RetrievalService';

class MockStore {
  constructor() {
    this.chunks = [];
  }
  async upsert(subjectId, chunks) {
    this.chunks.push(...chunks.map((c) => ({ subjectId, ...c })));
  }
  async search(subjectId) {
    return this.chunks
      .filter((c) => c.subjectId === subjectId)
      .map((c) => ({ score: 1, ...c.metadata }));
  }
}

class MockEmbedder {
  async embed(text) {
    return [text.length];
  }
}

describe('upload to retrieval flow', () => {
  it('retrieves uploaded material', async () => {
    const store = new MockStore();
    const embedder = new MockEmbedder();
    const text = 'Hello world';
    const chunks = chunkText(text).map((content, idx) => ({
      id: String(idx),
      embedding: null,
      metadata: { source: 'file.txt', index: idx, text: content }
    }));
    for (const chunk of chunks) {
      chunk.embedding = await embedder.embed(chunk.metadata.text);
    }
    await store.upsert('math', chunks);

    const retrieval = new RetrievalService({ store, embedder });
    const results = await retrieval.search('math', 'Hello');
    expect(results[0].text).toBe('Hello world');
  });
});
