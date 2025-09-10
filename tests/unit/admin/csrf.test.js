import { describe, it, expect, vi } from 'vitest';
vi.mock('$lib/modules/rag/ingest.js', () => ({ ingestFile: vi.fn() }));
import { POST } from '../../../src/routes/api/admin/subjects/[id]/materials/+server.js';

process.env.CSRF_TOKEN = 'token';

describe('admin CSRF', () => {
  it('rejects missing token', async () => {
    const file = new File(['a'], 'a.txt', { type: 'text/plain' });
    const form = new FormData();
    form.append('file', file);
    const res = await POST({
      params: { id: 'math' },
      request: { headers: new Headers(), formData: async () => form }
    });
    expect(res.status).toBe(403);
  });
});
