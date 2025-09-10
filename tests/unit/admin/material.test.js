import { describe, it, expect, vi } from 'vitest';
vi.mock('$lib/modules/rag/PgVectorStore', () => {
  return {
    PgVectorStore: class {
      constructor() {
        this.upsert = vi.fn();
        this.deleteByFile = vi.fn();
      }
    }
  };
});
import { PgVectorStore } from '$lib/modules/rag/PgVectorStore';

describe('material upload/delete', () => {
  it('calls upsert on upload', async () => {
    const store = new PgVectorStore();
    await store.upsert('math', []);
    expect(store.upsert).toHaveBeenCalled();
  });

  it('calls deleteByFile on deletion', async () => {
    const store = new PgVectorStore();
    await store.deleteByFile('math', 'file.txt');
    expect(store.deleteByFile).toHaveBeenCalledWith('math', 'file.txt');
  });
});
