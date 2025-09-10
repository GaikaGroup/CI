import { describe, it, expect, vi } from 'vitest';

const upsertMock = vi.fn();

vi.mock('$lib/modules/rag/EmbeddingService', () => {
  return {
    EmbeddingService: class {
      async embed(t) {
        return [t.length];
      }
    }
  };
});
vi.mock('$lib/modules/rag/PgVectorStore', () => {
  return {
    PgVectorStore: class {
      constructor() {
        this.upsert = upsertMock;
      }
      async search() {
        return [];
      }
    }
  };
});

import fs from 'fs';
import path from 'path';
import { ingestSubjectMaterials } from '$lib/modules/rag/ingest';

describe('metadata storage', () => {
  it('stores metadata for ingested files', async () => {
    const dir = path.resolve('static/tutor/test/materials');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'file.txt'), 'hello world');

    await ingestSubjectMaterials('test');

    expect(upsertMock).toHaveBeenCalled();
    const chunks = upsertMock.mock.calls[0][1];
    expect(chunks[0].metadata).toMatchObject({ source: 'file.txt', index: 0 });

    fs.rmSync('static/tutor/test', { recursive: true, force: true });
  });
});
