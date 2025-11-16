import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationService } from '../../../src/lib/modules/graphrag/services/MigrationService.js';
import { InMemoryStorageAdapter } from '../../../src/lib/modules/graphrag/adapters/InMemoryStorageAdapter.js';

describe('MigrationService', () => {
  let migrationService;
  let sourceAdapter;

  beforeEach(() => {
    migrationService = new MigrationService();
    sourceAdapter = new InMemoryStorageAdapter();
  });

  describe('migrate', () => {
    it('should handle empty source data', async () => {
      const result = await migrationService.migrate(sourceAdapter, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No data to migrate');
    });

    it('should perform dry run without migrating data', async () => {
      // Add test data
      await sourceAdapter.storeNode({
        courseId: 'test-course',
        materialId: 'test-material',
        content: 'Test content',
        chunkIndex: 0
      });

      const result = await migrationService.migrate(sourceAdapter, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.backupPath).toBeDefined();
    });
  });

  describe('verify', () => {
    it('should pass verification when counts match', async () => {
      const sourceStats = {
        nodeCount: 10,
        relationshipCount: 5
      };

      const targetStats = {
        nodeCount: 10,
        relationshipCount: 5
      };

      const result = await migrationService.verify(sourceStats, targetStats);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail verification when node counts mismatch', async () => {
      const sourceStats = {
        nodeCount: 10,
        relationshipCount: 5
      };

      const targetStats = {
        nodeCount: 8,
        relationshipCount: 5
      };

      const result = await migrationService.verify(sourceStats, targetStats);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('node_count_mismatch');
    });

    it('should fail verification when relationship counts mismatch', async () => {
      const sourceStats = {
        nodeCount: 10,
        relationshipCount: 5
      };

      const targetStats = {
        nodeCount: 10,
        relationshipCount: 3
      };

      const result = await migrationService.verify(sourceStats, targetStats);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('relationship_count_mismatch');
    });
  });

  describe('createBackup', () => {
    it('should create backup file', async () => {
      await sourceAdapter.storeNode({
        courseId: 'test-course',
        materialId: 'test-material',
        content: 'Test content',
        chunkIndex: 0
      });

      const backupPath = await migrationService.createBackup(sourceAdapter);

      expect(backupPath).toBeDefined();
      expect(backupPath).toContain('backup_');
      expect(backupPath).toContain('.json');
    });
  });
});
