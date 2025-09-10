import fs from 'fs/promises';
import path from 'path';
import { chunkMarkdown } from './chunk';
import { EmbeddingService } from './EmbeddingService';
import { PgVectorStore } from './PgVectorStore';
import { randomUUID } from 'crypto';

export async function ingestSubjectMaterials(subjectId) {
  const base = path.resolve(`static/tutor/${subjectId}/materials`);
  const files = await fs.readdir(base);
  const embedder = new EmbeddingService();
  const store = new PgVectorStore();
  const embeddingsDir = path.resolve(`static/tutor/${subjectId}/embeddings`);
  await fs.mkdir(embeddingsDir, { recursive: true });
  const indexPath = path.join(embeddingsDir, 'index.json');
  let index = {};
  try {
    index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  } catch {
    // ignore if index file does not exist yet
  }

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    let text = '';
    if (ext === '.pdf') {
      const dataBuffer = await fs.readFile(path.join(base, file));
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (['.txt', '.md'].includes(ext)) {
      text = await fs.readFile(path.join(base, file), 'utf8');
    } else {
      continue;
    }
    const chunks = chunkMarkdown(text).map((chunk, idx) => ({
      id: randomUUID(),
      embedding: null,
      metadata: { source: file, index: idx, heading: chunk.heading, text: chunk.text }
    }));
    for (const chunk of chunks) {
      chunk.embedding = await embedder.embed(chunk.metadata.text);
    }
    await store.upsert(subjectId, chunks);
    index[file] = chunks.map((c) => c.id);
  }
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}
