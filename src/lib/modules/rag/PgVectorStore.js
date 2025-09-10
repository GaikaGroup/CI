/* global globalThis */
// Use Web Crypto API when available to avoid bundling Node's crypto module
function generateId() {
  if (typeof globalThis.crypto !== 'undefined') {
    if (typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    if (typeof globalThis.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      // RFC4122 version 4 UUID
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const toHex = (n) => n.toString(16).padStart(2, '0');
      return (
        toHex(bytes[0]) +
        toHex(bytes[1]) +
        toHex(bytes[2]) +
        toHex(bytes[3]) +
        '-' +
        toHex(bytes[4]) +
        toHex(bytes[5]) +
        '-' +
        toHex(bytes[6]) +
        toHex(bytes[7]) +
        '-' +
        toHex(bytes[8]) +
        toHex(bytes[9]) +
        '-' +
        toHex(bytes[10]) +
        toHex(bytes[11]) +
        toHex(bytes[12]) +
        toHex(bytes[13]) +
        toHex(bytes[14]) +
        toHex(bytes[15])
      );
    }
  }
  // Fallback using Math.random (not cryptographically secure)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class PgVectorStore {
  constructor(connectionString = process.env.DATABASE_URL) {
    this.connectionString = connectionString;
    this.poolPromise = null;
  }

  async _getPool() {
    if (!this.poolPromise) {
      this.poolPromise = import('pg').then(
        (pg) => new pg.Pool({ connectionString: this.connectionString })
      );
    }
    return this.poolPromise;
  }

  async upsert(subjectId, chunks) {
    if (!chunks.length) return;
    const pool = await this._getPool();
    const client = await pool.connect();
    try {
      const query =
        'INSERT INTO chunks(subject_id, chunk_id, embedding, metadata) VALUES($1,$2,$3,$4) ON CONFLICT (chunk_id) DO UPDATE SET embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata';
      for (const chunk of chunks) {
        const id = chunk.id || generateId();
        await client.query(query, [subjectId, id, chunk.embedding, chunk.metadata]);
      }
    } finally {
      client.release();
    }
  }

  async search(subjectId, embedding, topK = 5) {
    const pool = await this._getPool();
    const client = await pool.connect();
    try {
      const query =
        'SELECT metadata, 1 - (embedding <=> $2) AS score FROM chunks WHERE subject_id=$1 ORDER BY embedding <=> $2 ASC LIMIT $3';
      const res = await client.query(query, [subjectId, embedding, topK]);
      return res.rows.map((r) => ({ score: parseFloat(r.score), ...r.metadata }));
    } finally {
      client.release();
    }
  }

  async deleteByFile(subjectId, filename) {
    const pool = await this._getPool();
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM chunks WHERE subject_id=$1 AND metadata->>'source'=$2", [
        subjectId,
        filename
      ]);
    } finally {
      client.release();
    }
  }
}
