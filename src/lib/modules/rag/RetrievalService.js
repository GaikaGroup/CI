import { EmbeddingService } from './EmbeddingService';
import { PgVectorStore } from './PgVectorStore';

const MIN_RELEVANCE = parseFloat(import.meta.env.VITE_MIN_RELEVANCE || '0.75');
const MAX_CACHE = 50;
const cache = new Map();

function makeKey(subjectId, query) {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash << 5) - hash + query.charCodeAt(i);
    hash |= 0;
  }
  return `${subjectId}:${hash}`;
}

export class RetrievalService {
  constructor({ store = new PgVectorStore(), embedder = new EmbeddingService() } = {}) {
    this.store = store;
    this.embedder = embedder;
  }

  async search(subjectId, query, topK = 5) {
    if (!subjectId || !query) return [];
    const key = makeKey(subjectId, query);
    if (cache.has(key)) {
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    const embedding = await this.embedder.embed(query);
    const results = await this.store.search(subjectId, embedding, topK);
    const filtered = results.filter((r) => r.score >= MIN_RELEVANCE);
    cache.set(key, filtered);
    if (cache.size > MAX_CACHE) {
      const first = cache.keys().next().value;
      cache.delete(first);
    }
    return filtered;
  }
}

export { MIN_RELEVANCE };
