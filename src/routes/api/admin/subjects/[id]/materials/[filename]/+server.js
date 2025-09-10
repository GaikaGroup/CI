import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { removeFile } from '$lib/modules/rag/ingest.js';

async function logAdmin(message) {
  await fs.appendFile('logs/admin.log', `[${new Date().toISOString()}] ${message}\n`);
}

export async function DELETE({ params, request }) {
  const token = request.headers.get('x-csrf-token');
  if (token !== process.env.CSRF_TOKEN) {
    await logAdmin('CSRF failure on delete');
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  const filePath = path.resolve(`static/tutor/${params.id}/materials/${params.filename}`);
  await fs.unlink(filePath);
  await removeFile(params.id, params.filename);
  await logAdmin(`deleted ${params.filename} from ${params.id}`);
  return json({ success: true });
}
