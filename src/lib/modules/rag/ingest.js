import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { chunkText } from './chunk.js';
import { EmbeddingService } from './EmbeddingService.js';
import { PgVectorStore } from './PgVectorStore.js';

const indexPath = (subjectId) => path.resolve(`static/tutor/${subjectId}/embeddings/index.json`);

async function readIndex(subjectId) {
  try {
    const data = await fs.readFile(indexPath(subjectId), 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeIndex(subjectId, index) {
  await fs.mkdir(path.dirname(indexPath(subjectId)), { recursive: true });
  await fs.writeFile(indexPath(subjectId), JSON.stringify(index, null, 2));
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const data = await fs.readFile(filePath);
    const pdfParse = (await import('pdf-parse')).default;
    const pdf = await pdfParse(data);
    return pdf.text;
  }
  return fs.readFile(filePath, 'utf8');
}

export async function ingestFile(subjectId, filename) {
  const filePath = path.resolve(`static/tutor/${subjectId}/materials/${filename}`);
  const text = await extractText(filePath);
  const embedder = new EmbeddingService();
  const store = new PgVectorStore();
  const chunks = chunkText(text).map((content, idx) => ({
    id: randomUUID(),
    embedding: null,
    metadata: { source: filename, index: idx, text: content }
  }));
  for (const chunk of chunks) {
    chunk.embedding = await embedder.embed(chunk.metadata.text);
  }
  await store.upsert(subjectId, chunks);
  const idx = await readIndex(subjectId);
  idx[filename] = chunks.map((c) => c.id);
  await writeIndex(subjectId, idx);
}

export async function ingestSubjectMaterials(subjectId) {
  const base = path.resolve(`static/tutor/${subjectId}/materials`);
  const files = await fs.readdir(base);
  for (const file of files) {
    await ingestFile(subjectId, file);
  }
}

export async function removeFile(subjectId, filename) {
  const idx = await readIndex(subjectId);
  delete idx[filename];
  await writeIndex(subjectId, idx);
  const store = new PgVectorStore();
  await store.deleteByFile(subjectId, filename);
}
