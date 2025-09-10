import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  const base = path.resolve('static/tutor');

  let subjects: Array<{ id: string; displayName?: string; materials?: string[] }> = [];
  try {
    const data = await fs.readFile(path.join(base, 'subjects.json'), 'utf8');
    subjects = JSON.parse(data);
  } catch {
    subjects = [];
  }

  for (const subj of subjects) {
    const matDir = path.join(base, subj.id, 'materials');
    try {
      subj.materials = await fs.readdir(matDir);
    } catch {
      subj.materials = [];
    }
  }

  return json(subjects);
}
