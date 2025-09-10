import { describe, it, expect } from 'vitest';
import { RetrievalService } from '$lib/modules/rag/RetrievalService';

class CountingStore {
  constructor() {
    this.calls = 0;
  }
  async search() {
    this.calls++;
    return [{ score: 1 }];
  }
}
class MockEmbed {
  async embed() {
    return [1];
  }
}

describe('RetrievalService cache', () => {
  it('caches by subject and query', async () => {
    const store = new CountingStore();
    const rs = new RetrievalService({ store, embedder: new MockEmbed() });
    await rs.search('math', 'hello');
    await rs.search('math', 'hello');
    expect(store.calls).toBe(1);
  });
});
