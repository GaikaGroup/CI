import fs from 'fs/promises';
import path from 'path';
import { chunkText } from './chunk';
import { EmbeddingService } from './EmbeddingService';
import { PgVectorStore } from './PgVectorStore';
import { randomUUID } from 'crypto';

export async function ingestSubjectMaterials(subjectId) {
  const base = path.resolve(`static/tutor/${subjectId}/materials`);
  const files = await fs.readdir(base);
  const embedder = new EmbeddingService();
  const store = new PgVectorStore();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.txt', '.md'].includes(ext)) continue; // PDF handling skipped
    const text = await fs.readFile(path.join(base, file), 'utf8');
    const chunks = chunkText(text).map((content, idx) => ({
      id: randomUUID(),
      embedding: null,
      metadata: { source: file, index: idx, text: content }
    }));
    for (const chunk of chunks) {
      chunk.embedding = await embedder.embed(chunk.metadata.text);
    }
    await store.upsert(subjectId, chunks);
  }
}
