import { getDb } from '../database/connection.js';

/**
 * Repository for managing usage metrics in the SQLite database.
 */
export class UsageMetricsRepository {
  constructor() {
    this.tableName = 'usage_metrics';
  }

  /**
   * Get usage metrics aggregated by provider and model.
   * @returns {Promise<Array>} Array of usage metrics records.
   */
  async getAll() {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const stmt = db.prepare(`
      SELECT provider, model, total_requests, paid_requests, prompt_tokens,
             completion_tokens, total_tokens, total_cost_micro, created_at, updated_at
      FROM ${this.tableName}
      ORDER BY provider, model
    `);

    return stmt.all();
  }

  /**
   * Insert or update usage metrics for a provider and model.
   * @param {Object} metrics
   * @param {string} metrics.provider
   * @param {string} metrics.model
   * @param {number} metrics.total_requests
   * @param {number} metrics.paid_requests
   * @param {number} metrics.prompt_tokens
   * @param {number} metrics.completion_tokens
   * @param {number} metrics.total_tokens
   * @param {number} metrics.total_cost_micro
   * @returns {Promise<void>}
   */
  async upsert(metrics) {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const existing = db
      .prepare(
        `
      SELECT id FROM ${this.tableName} WHERE provider = ? AND model = ?
    `
      )
      .get(metrics.provider, metrics.model);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE ${this.tableName}
        SET total_requests = total_requests + ?,
            paid_requests = paid_requests + ?,
            prompt_tokens = prompt_tokens + ?,
            completion_tokens = completion_tokens + ?,
            total_tokens = total_tokens + ?,
            total_cost_micro = total_cost_micro + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        metrics.total_requests,
        metrics.paid_requests,
        metrics.prompt_tokens,
        metrics.completion_tokens,
        metrics.total_tokens,
        metrics.total_cost_micro,
        existing.id
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO ${this.tableName} (
          provider, model, total_requests, paid_requests, prompt_tokens,
          completion_tokens, total_tokens, total_cost_micro, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      stmt.run(
        metrics.provider,
        metrics.model,
        metrics.total_requests,
        metrics.paid_requests,
        metrics.prompt_tokens,
        metrics.completion_tokens,
        metrics.total_tokens,
        metrics.total_cost_micro
      );
    }
  }

  /**
   * Reset all usage metrics.
   * @returns {Promise<void>}
   */
  async reset() {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const stmt = db.prepare(`DELETE FROM ${this.tableName}`);
    stmt.run();
  }
}

export const usageMetricsRepository = new UsageMetricsRepository();
