import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { ingestFile } from '$lib/modules/rag/ingest.js';

export async function POST({ params, request }) {
  const form = await request.formData();
  const file = form.get('file');
  if (!file) return json({ error: 'No file' }, { status: 400 });
  const filename = file.name;
  const ext = path.extname(filename).toLowerCase();
  if (!['.txt', '.md', '.pdf'].includes(ext)) {
    return json({ error: 'Invalid file type' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 5 * 1024 * 1024) {
    return json({ error: 'File too large' }, { status: 400 });
  }
  const dir = path.resolve(`static/tutor/${params.id}/materials`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  await ingestFile(params.id, filename);
  return json({ success: true });
}
