import { describe, it, expect } from 'vitest';
import { RetrievalService, MIN_RELEVANCE } from '$lib/modules/rag/RetrievalService';

class MockStore {
  async search() {
    return [
      { score: MIN_RELEVANCE + 0.1, text: 'A' },
      { score: MIN_RELEVANCE - 0.1, text: 'B' }
    ];
  }
}
class MockEmbed {
  async embed() {
    return [1, 2, 3];
  }
}

describe('RetrievalService', () => {
  it('filters results below threshold', async () => {
    const rs = new RetrievalService({ store: new MockStore(), embedder: new MockEmbed() });
    const res = await rs.search('subj', 'query');
    expect(res).toHaveLength(1);
    expect(res[0].text).toBe('A');
  });
});
