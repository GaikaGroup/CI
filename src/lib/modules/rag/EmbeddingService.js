import { LLM_FEATURES } from '$lib/config/llm';

export class EmbeddingService {
  constructor() {
    this.useOllama = LLM_FEATURES.ENABLE_LOCAL_LLM;
  }

  async embed(text) {
    if (!text || !text.trim()) return [];
    if (this.useOllama) {
      const vec = await this._embedOllama(text);
      if (vec) return vec;
    }
    return await this._embedOpenAI(text);
  }

  async _embedOllama(text) {
    try {
      const res = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'qwen2:0.5b', prompt: text })
      });
      if (!res.ok) throw new Error('ollama not available');
      const data = await res.json();
      return data.embedding;
    } catch (err) {
      console.warn('Ollama embedding failed', err.message);
      return null;
    }
  }

  async _embedOpenAI(text) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
    });
    const data = await res.json();
    return data.data[0].embedding;
  }
}
