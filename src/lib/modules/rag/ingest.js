```ts
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { chunkText, chunkMarkdown } from './chunk.js';
import { EmbeddingService } from './EmbeddingService.js';
import { PgVectorStore } from './PgVectorStore.js';

const indexPath = (subjectId: string) =>
  path.resolve(`static/tutor/${subjectId}/embeddings/index.json`);

async function readIndex(subjectId: string): Promise<Record<string, string[]>> {
  try {
    const data = await fs.readFile(indexPath(subjectId), 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeIndex(subjectId: string, index: Record<string, string[]>) {
  await fs.mkdir(path.dirname(indexPath(subjectId)), { recursive: true });
  await fs.writeFile(indexPath(subjectId), JSON.stringify(index, null, 2));
}

async function extractText(filePath: string): Promise<{ text: string; ext: string }> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const data = await fs.readFile(filePath);
    const pdfParse = (await import('pdf-parse')).default;
    const pdf = await pdfParse(data);
    return { text: pdf.text, ext };
  }
  // .md, .txt, and others default to utf8 read
  const text = await fs.readFile(filePath, 'utf8');
  return { text, ext };
}

export async function ingestFile(subjectId: string, filename: string) {
  const filePath = path.resolve(`static/tutor/${subjectId}/materials/${filename}`);
  const { text, ext } = await extractText(filePath);

  const embedder = new EmbeddingService();
  const store = new PgVectorStore();

  // Prefer markdown-aware chunking for .md; otherwise use plain token chunking
  const chunks =
    ext === '.md'
      ? chunkMarkdown(text).map((chunk, idx) => ({
          id: randomUUID(),
          embedding: null as number[] | null,
          metadata: {
            source: filename,
            index: idx,
            heading: chunk.heading,
            text: chunk.text,
          },
        }))
      : chunkText(text).map((content, idx) => ({
          id: randomUUID(),
          embedding: null as number[] | null,
          metadata: { source: filename, index: idx, text: content },
        }));

  for (const chunk of chunks) {
    chunk.embedding = await embedder.embed(chunk.metadata.text);
  }

  await store.upsert(subjectId, chunks);

  const idx = await readIndex(subjectId);
  idx[filename] = chunks.map((c) => c.id);
  await writeIndex(subjectId, idx);
}

export async function ingestSubjectMaterials(subjectId: string) {
  const base = path.resolve(`static/tutor/${subjectId}/materials`);
  const files = await fs.readdir(base);
  // Ensure embeddings directory exists (for index.json)
  await fs.mkdir(path.dirname(indexPath(subjectId)), { recursive: true });

  for (const file of files) {
    // Skip hidden files/directories
    if (file.startsWith('.')) continue;
    const full = path.join(base, file);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) continue;
    await ingestFile(subjectId, file);
  }
}

export async function removeFile(subjectId: string, filename: string) {
  const idx = await readIndex(subjectId);
  delete idx[filename];
  await writeIndex(subjectId, idx);
  const store = new PgVectorStore();
  await store.deleteByFile(subjectId, filename);
}
```
