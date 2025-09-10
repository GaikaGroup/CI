import { randomUUID } from 'crypto';

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
        const id = chunk.id || randomUUID();
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
