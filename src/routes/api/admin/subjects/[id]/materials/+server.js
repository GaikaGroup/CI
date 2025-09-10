import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { ingestSubjectMaterials } from '$lib/modules/rag/ingest';

export async function POST({ params, request }) {
  const { id } = params;
  const form = await request.formData();
  const file = form.get('file');
  const name = typeof file === 'object' && 'name' in file ? file.name : 'file';
  const data = Buffer.from(await file.arrayBuffer());
  const dir = path.resolve(`static/tutor/${id}/materials`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data);
  await ingestSubjectMaterials(id);
  return json({ success: true });
}
