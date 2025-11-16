import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageAdapter } from '../../../src/lib/modules/graphrag/adapters/InMemoryStorageAdapter.js';

describe('InMemoryStorageAdapter', () => {
  let adapter;
  const testCourseId = 'test-course-123';
  const testMaterialId = 'test-material-456';

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  describe('storeNode', () => {
    it('should store a node successfully', async () => {
      const node = {
        courseId: testCourseId,
        materialId: testMaterialId,
        content: 'Test content',
        chunkIndex: 0,
        metadata: { test: true }
      };

      const result = await adapter.storeNode(node);

      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
      expect(result.node.id).toBeDefined();
      expect(result.node.content).toBe('Test content');
    });

    it('should fail with missing required fields', async () => {
      const node = {
        content: 'Test content'
      };

      const result = await adapter.storeNode(node);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should update indexes', async () => {
      const node = {
        courseId: testCourseId,
        materialId: testMaterialId,
        content: 'Test content',
        chunkIndex: 0
      };

      await adapter.storeNode(node);

      expect(adapter.materialIndex.has(testMaterialId)).toBe(true);
      expect(adapter.courseIndex.has(testCourseId)).toBe(true);
    });
  });

  describe('storeBatchNodes', () => {
    it('should store multiple nodes', async () => {
      const nodes = [
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'First node',
          chunkIndex: 0
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Second node',
          chunkIndex: 1
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Third node',
          chunkIndex: 2
        }
      ];

      const result = await adapter.storeBatchNodes(nodes);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(3);
      expect(result.count).toBe(3);
    });
  });

  describe('semanticSearch (keyword fallback)', () => {
    beforeEach(async () => {
      const nodes = [
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Machine learning is a subset of artificial intelligence.',
          chunkIndex: 0
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Deep learning uses neural networks with multiple layers.',
          chunkIndex: 1
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Natural language processing helps computers understand text.',
          chunkIndex: 2
        }
      ];

      await adapter.storeBatchNodes(nodes);
    });

    it('should find nodes with matching keywords', async () => {
      const result = await adapter.semanticSearch('machine learning');

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].content).toContain('Machine learning');
    });

    it('should score results by relevance', async () => {
      const result = await adapter.semanticSearch('learning neural');

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('similarity');
      expect(result.results[0].similarity).toBeGreaterThan(0);
    });

    it('should filter by materialId', async () => {
      const otherMaterialId = 'other-material';
      await adapter.storeNode({
        courseId: testCourseId,
        materialId: otherMaterialId,
        content: 'Other material content with learning',
        chunkIndex: 0
      });

      const result = await adapter.semanticSearch('learning', {
        materialId: testMaterialId
      });

      expect(result.success).toBe(true);
      expect(result.results.every((r) => r.materialId === testMaterialId)).toBe(true);
    });

    it('should filter by courseId', async () => {
      const result = await adapter.semanticSearch('learning', {
        courseId: testCourseId
      });

      expect(result.success).toBe(true);
      expect(result.results.every((r) => r.courseId === testCourseId)).toBe(true);
    });

    it('should return empty results for no matches', async () => {
      const result = await adapter.semanticSearch('xyz123nonexistent');

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('should limit results', async () => {
      const result = await adapter.semanticSearch('learning', {
        limit: 2
      });

      expect(result.success).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getNodesByMaterial', () => {
    beforeEach(async () => {
      const nodes = [
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'First node',
          chunkIndex: 0
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Second node',
          chunkIndex: 1
        }
      ];

      await adapter.storeBatchNodes(nodes);
    });

    it('should retrieve all nodes for a material', async () => {
      const result = await adapter.getNodesByMaterial(testMaterialId);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].chunkIndex).toBeLessThan(result.nodes[1].chunkIndex);
    });

    it('should include relationships', async () => {
      const nodes = await adapter.getNodesByMaterial(testMaterialId);
      const node1 = nodes.nodes[0];
      const node2 = nodes.nodes[1];

      // Add relationship
      await adapter.storeRelationship({
        sourceNodeId: node1.id,
        targetNodeId: node2.id,
        relationshipType: 'follows',
        weight: 1.0
      });

      const result = await adapter.getNodesByMaterial(testMaterialId);

      expect(result.nodes[0].sourceRelationships).toBeDefined();
      expect(result.nodes[0].sourceRelationships.length).toBeGreaterThan(0);
    });
  });

  describe('deleteMaterialGraph', () => {
    beforeEach(async () => {
      const nodes = [
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Node to delete',
          chunkIndex: 0
        }
      ];

      await adapter.storeBatchNodes(nodes);
    });

    it('should delete all nodes for a material', async () => {
      const result = await adapter.deleteMaterialGraph(testMaterialId);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThan(0);

      // Verify deletion
      const checkResult = await adapter.getNodesByMaterial(testMaterialId);
      expect(checkResult.nodes).toHaveLength(0);
    });

    it('should remove from indexes', async () => {
      await adapter.deleteMaterialGraph(testMaterialId);

      expect(adapter.materialIndex.has(testMaterialId)).toBe(false);
    });
  });

  describe('storeRelationship', () => {
    let sourceNodeId;
    let targetNodeId;

    beforeEach(async () => {
      const nodes = [
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Source node',
          chunkIndex: 0
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Target node',
          chunkIndex: 1
        }
      ];

      const result = await adapter.storeBatchNodes(nodes);
      sourceNodeId = result.nodes[0].id;
      targetNodeId = result.nodes[1].id;
    });

    it('should store a relationship', async () => {
      const relationship = {
        sourceNodeId,
        targetNodeId,
        relationshipType: 'follows',
        weight: 1.0
      };

      const result = await adapter.storeRelationship(relationship);

      expect(result.success).toBe(true);
      expect(result.relationship).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return storage statistics', async () => {
      await adapter.storeNode({
        courseId: testCourseId,
        materialId: testMaterialId,
        content: 'Test',
        chunkIndex: 0
      });

      const stats = adapter.getStats();

      expect(stats.nodeCount).toBe(1);
      expect(stats.materialCount).toBe(1);
      expect(stats.courseCount).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await adapter.storeNode({
        courseId: testCourseId,
        materialId: testMaterialId,
        content: 'Test',
        chunkIndex: 0
      });

      adapter.clear();

      const stats = adapter.getStats();
      expect(stats.nodeCount).toBe(0);
      expect(stats.materialCount).toBe(0);
    });
  });
});
