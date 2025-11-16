import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { InMemoryStorageAdapter } from '../adapters/InMemoryStorageAdapter.js';
import { DatabaseStorageAdapter } from '../adapters/DatabaseStorageAdapter.js';
import { EmbeddingService } from './EmbeddingService.js';
import { graphragConfig } from '$lib/config/graphrag.js';
import { GraphRAGLogger } from '../utils/GraphRAGLogger.js';

/**
 * Migration Service
 *
 * Migrates knowledge graph data from in-memory storage to database storage.
 * Includes backup, verification, and rollback capabilities.
 */
export class MigrationService {
  constructor() {
    this.backupDir = 'backups/graphrag';
  }

  /**
   * Migrate data from in-memory to database storage
   * @param {InMemoryStorageAdapter} sourceAdapter - Source adapter
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async migrate(sourceAdapter, options = {}) {
    const dryRun = options.dryRun || false;
    const startTime = Date.now();

    try {
      GraphRAGLogger.logMigration('start', { dryRun });

      // Step 1: Create backup
      GraphRAGLogger.logMigration('backup', { status: 'starting' });
      const backupPath = await this.createBackup(sourceAdapter);
      GraphRAGLogger.logMigration('backup', { status: 'complete', path: backupPath });

      // Step 2: Get source data
      const sourceStats = sourceAdapter.getStats();
      GraphRAGLogger.logMigration('source_stats', sourceStats);

      if (sourceStats.nodeCount === 0) {
        return {
          success: true,
          message: 'No data to migrate',
          stats: sourceStats
        };
      }

      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          message: 'Dry run complete - no data migrated',
          stats: sourceStats,
          backupPath
        };
      }

      // Step 3: Create target adapter
      const embeddingService = new EmbeddingService(graphragConfig.embedding);
      const targetAdapter = new DatabaseStorageAdapter(embeddingService);

      // Step 4: Migrate nodes by material
      let migratedNodes = 0;
      let migratedRelationships = 0;
      const errors = [];

      for (const [materialId] of sourceAdapter.materialIndex.entries()) {
        try {
          GraphRAGLogger.logMigration('migrate_material', {
            materialId,
            progress: `${migratedNodes}/${sourceStats.nodeCount}`
          });

          // Get nodes for this material
          const result = await sourceAdapter.getNodesByMaterial(materialId);

          if (!result.success || result.nodes.length === 0) {
            continue;
          }

          // Migrate nodes
          const nodesToMigrate = result.nodes.map((node) => ({
            courseId: node.courseId,
            materialId: node.materialId,
            content: node.content,
            chunkIndex: node.chunkIndex,
            metadata: node.metadata
          }));

          const migrateResult = await targetAdapter.storeBatchNodes(nodesToMigrate);

          if (!migrateResult.success) {
            errors.push({
              materialId,
              error: migrateResult.error
            });
            continue;
          }

          migratedNodes += migrateResult.count;

          // Migrate relationships
          for (const node of result.nodes) {
            if (node.sourceRelationships) {
              for (const rel of node.sourceRelationships) {
                // Find target node ID in migrated nodes
                const targetNode = migrateResult.nodes.find(
                  (n) => n.chunkIndex === rel.targetNodeId
                );

                if (targetNode) {
                  const relResult = await targetAdapter.storeRelationship({
                    sourceNodeId: node.id,
                    targetNodeId: targetNode.id,
                    relationshipType: rel.relationshipType,
                    weight: rel.weight,
                    metadata: rel.metadata
                  });

                  if (relResult.success) {
                    migratedRelationships++;
                  }
                }
              }
            }
          }
        } catch (error) {
          errors.push({
            materialId,
            error: error.message
          });
          GraphRAGLogger.logError('migrate_material', error, { materialId });
        }
      }

      // Step 5: Verify migration
      GraphRAGLogger.logMigration('verify', { status: 'starting' });
      const verification = await this.verify(sourceStats, {
        nodeCount: migratedNodes,
        relationshipCount: migratedRelationships
      });
      GraphRAGLogger.logMigration('verify', verification);

      const duration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        migratedNodes,
        migratedRelationships,
        errors,
        verification,
        duration,
        backupPath,
        message:
          errors.length === 0
            ? 'Migration completed successfully'
            : `Migration completed with ${errors.length} errors`
      };
    } catch (error) {
      GraphRAGLogger.logError('migration', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Create backup of current data
   * @param {InMemoryStorageAdapter} adapter - Source adapter
   * @returns {Promise<string>} Backup file path
   */
  async createBackup(adapter) {
    try {
      // Ensure backup directory exists
      if (!existsSync(this.backupDir)) {
        await mkdir(this.backupDir, { recursive: true });
      }

      // Create backup data
      const backup = {
        timestamp: new Date().toISOString(),
        stats: adapter.getStats(),
        nodes: Array.from(adapter.nodes.values()),
        relationships: Array.from(adapter.relationships.values())
      };

      // Write backup file
      const filename = `backup_${Date.now()}.json`;
      const filepath = join(this.backupDir, filename);
      await writeFile(filepath, JSON.stringify(backup, null, 2));

      return filepath;
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Verify migration integrity
   * @param {Object} sourceStats - Source statistics
   * @param {Object} targetStats - Target statistics
   * @returns {Object} Verification result
   */
  async verify(sourceStats, targetStats) {
    const issues = [];

    // Check node count
    if (sourceStats.nodeCount !== targetStats.nodeCount) {
      issues.push({
        type: 'node_count_mismatch',
        source: sourceStats.nodeCount,
        target: targetStats.nodeCount,
        difference: Math.abs(sourceStats.nodeCount - targetStats.nodeCount)
      });
    }

    // Check relationship count
    if (sourceStats.relationshipCount !== targetStats.relationshipCount) {
      issues.push({
        type: 'relationship_count_mismatch',
        source: sourceStats.relationshipCount,
        target: targetStats.relationshipCount,
        difference: Math.abs(sourceStats.relationshipCount - targetStats.relationshipCount)
      });
    }

    return {
      passed: issues.length === 0,
      issues,
      sourceStats,
      targetStats
    };
  }

  /**
   * Rollback migration by deleting all migrated data
   * @param {string[]} materialIds - Material IDs to rollback
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(materialIds) {
    try {
      GraphRAGLogger.logMigration('rollback', {
        status: 'starting',
        materialCount: materialIds.length
      });

      const embeddingService = new EmbeddingService(graphragConfig.embedding);
      const adapter = new DatabaseStorageAdapter(embeddingService);

      let deletedCount = 0;
      const errors = [];

      for (const materialId of materialIds) {
        try {
          const result = await adapter.deleteMaterialGraph(materialId);
          if (result.success) {
            deletedCount += result.deletedCount;
          } else {
            errors.push({ materialId, error: result.error });
          }
        } catch (error) {
          errors.push({ materialId, error: error.message });
        }
      }

      GraphRAGLogger.logMigration('rollback', {
        status: 'complete',
        deletedCount,
        errors: errors.length
      });

      return {
        success: errors.length === 0,
        deletedCount,
        errors,
        message:
          errors.length === 0
            ? 'Rollback completed successfully'
            : `Rollback completed with ${errors.length} errors`
      };
    } catch (error) {
      GraphRAGLogger.logError('rollback', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore from backup
   * @param {string} backupPath - Path to backup file
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromBackup(backupPath) {
    try {
      GraphRAGLogger.logMigration('restore', { status: 'starting', backupPath });

      // Read backup file
      const backupData = JSON.parse(await readFile(backupPath, 'utf-8'));

      // Create in-memory adapter and restore data
      const adapter = new InMemoryStorageAdapter();

      for (const node of backupData.nodes) {
        await adapter.storeNode(node);
      }

      for (const relationship of backupData.relationships) {
        await adapter.storeRelationship(relationship);
      }

      const stats = adapter.getStats();

      GraphRAGLogger.logMigration('restore', { status: 'complete', stats });

      return {
        success: true,
        stats,
        adapter,
        message: 'Restore completed successfully'
      };
    } catch (error) {
      GraphRAGLogger.logError('restore', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
