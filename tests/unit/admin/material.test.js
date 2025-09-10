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
import fs from 'fs';
import { POST } from '../../../src/routes/api/admin/subjects/[id]/materials/+server.js';
vi.mock('$lib/modules/rag/ingest', () => ({
  ingestSubjectMaterials: vi.fn()
}));
import { ingestSubjectMaterials } from '$lib/modules/rag/ingest';

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

  it('ingests after upload via route', async () => {
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
    const form = new FormData();
    form.append('file', file);
    await POST({ params: { id: 'math' }, request: { formData: async () => form } });
    expect(ingestSubjectMaterials).toHaveBeenCalledWith('math');
    expect(fs.existsSync('static/tutor/math/materials/note.txt')).toBe(true);
    fs.rmSync('static/tutor/math', { recursive: true, force: true });
  });
});
