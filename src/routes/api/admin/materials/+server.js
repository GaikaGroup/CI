import { json } from '@sveltejs/kit';

const materials = {};

export async function GET({ url }) {
  const subject = url.searchParams.get('subject');
  return json(materials[subject] || []);
}

export async function POST({ request }) {
  const form = await request.formData();
  const subject = form.get('subject');
  const file = form.get('file');
  const name = typeof file === 'object' && 'name' in file ? file.name : 'file';
  materials[subject] = materials[subject] || [];
  materials[subject].push(name);
  return json({ success: true });
}

export async function DELETE({ request }) {
  const { subject, name } = await request.json();
  materials[subject] = (materials[subject] || []).filter((n) => n !== name);
  return json({ success: true });
}
