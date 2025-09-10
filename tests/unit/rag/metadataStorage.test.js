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
vi.mock('pdf-parse', () => ({ default: vi.fn().mockResolvedValue({ text: 'from pdf' }) }));

import fs from 'fs';
import path from 'path';
import { ingestSubjectMaterials } from '$lib/modules/rag/ingest';

describe('metadata storage', () => {
  it('stores metadata and index for ingested files', async () => {
    const dir = path.resolve('static/tutor/test/materials');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'file.txt'), 'hello world');

    await ingestSubjectMaterials('test');

    expect(upsertMock).toHaveBeenCalled();
    const chunks = upsertMock.mock.calls[0][1];
    const index = JSON.parse(fs.readFileSync('static/tutor/test/embeddings/index.json', 'utf8'));
    expect(index['file.txt']).toEqual(chunks.map((c) => c.id));

    fs.rmSync('static/tutor/test', { recursive: true, force: true });
  });

  it('ingests pdf files', async () => {
    upsertMock.mockReset();
    const dir = path.resolve('static/tutor/pdf/materials');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'doc.pdf'), 'dummy');
    await ingestSubjectMaterials('pdf');
    expect(upsertMock).toHaveBeenCalled();
    const chunks = upsertMock.mock.calls[0][1];
    expect(chunks[0].metadata.text.trim()).toBe('from pdf');
    fs.rmSync('static/tutor/pdf', { recursive: true, force: true });
  });
});
