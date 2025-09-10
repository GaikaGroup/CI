import { json } from '@sveltejs/kit';

const subjects = ['Math', 'Science'];

export async function GET() {
  return json(subjects);
}
