import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function GET({ params }) {
  const file = path.resolve(`static/tutor/${params.id}/behavior-prompt.md`);
  const text = await fs.readFile(file, 'utf8');
  return new Response(text);
}

export async function PUT({ params, request }) {
  const file = path.resolve(`static/tutor/${params.id}/behavior-prompt.md`);
  const text = await request.text();
  await fs.writeFile(file, text);
  return json({ success: true });
}
