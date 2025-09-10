import { json } from '@sveltejs/kit';

const prompts = {};

export async function GET({ url }) {
  const subject = url.searchParams.get('subject');
  return json({ prompt: prompts[subject] || '' });
}

export async function PUT({ request }) {
  const { subject, prompt } = await request.json();
  prompts[subject] = prompt;
  return json({ success: true });
}
