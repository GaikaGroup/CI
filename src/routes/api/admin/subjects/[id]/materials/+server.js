import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { ingestFile } from '$lib/modules/rag/ingest.js';

async function logAdmin(message) {
  await fs.appendFile('logs/admin.log', `[${new Date().toISOString()}] ${message}\n`);
}

export async function POST({ params, request }) {
  const token = request.headers.get('x-csrf-token');
  if (token !== process.env.CSRF_TOKEN) {
    await logAdmin('CSRF failure on upload');
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = params;

  const form = await request.formData();
  const file = form.get('file');

  if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
    return json({ error: 'No file' }, { status: 400 });
  }

  const filename = 'name' in file && typeof file.name === 'string' ? file.name : 'upload';
  const ext = path.extname(filename).toLowerCase();

  if (!['.txt', '.md', '.pdf'].includes(ext)) {
    return json({ error: 'Invalid file type' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 5 * 1024 * 1024) {
    return json({ error: 'File too large' }, { status: 400 });
  }

  const dir = path.resolve(`static/tutor/${id}/materials`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);

  // Ingest just the uploaded file (faster than re-ingesting all materials)
  await ingestFile(id, filename);
  await logAdmin(`uploaded ${filename} to ${id}`);

  return json({ success: true, filename });
}
