import { EmbeddingService } from './EmbeddingService';
import { PgVectorStore } from './PgVectorStore';

const MIN_RELEVANCE = parseFloat(import.meta.env.VITE_MIN_RELEVANCE || '0.75');

export class RetrievalService {
  constructor({ store = new PgVectorStore(), embedder = new EmbeddingService() } = {}) {
    this.store = store;
    this.embedder = embedder;
  }

  async search(subjectId, query, topK = 5) {
    if (!subjectId || !query) return [];
    const embedding = await this.embedder.embed(query);
    const results = await this.store.search(subjectId, embedding, topK);
    return results.filter((r) => r.score >= MIN_RELEVANCE);
  }
}

export { MIN_RELEVANCE };
