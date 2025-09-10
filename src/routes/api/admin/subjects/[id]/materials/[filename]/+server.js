import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { removeFile } from '$lib/modules/rag/ingest.js';

export async function DELETE({ params }) {
  const filePath = path.resolve(`static/tutor/${params.id}/materials/${params.filename}`);
  await fs.unlink(filePath);
  await removeFile(params.id, params.filename);
  return json({ success: true });
}
