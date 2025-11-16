import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../../src/lib/database/client.js';
import { DatabaseStorageAdapter } from '../../../src/lib/modules/graphrag/adapters/DatabaseStorageAdapter.js';
import { EmbeddingService } from '../../../src/lib/modules/graphrag/services/EmbeddingService.js';

describe('DatabaseStorageAdapter Integration Tests', () => {
  let adapter;
  let testCourseId;
  let testMaterialId;

  beforeAll(async () => {
    // Create test course
    const course = await prisma.course.create({
      data: {
        name: 'Test Course for GraphRAG',
        slug: 'test-graphrag-course',
        language: 'en',
        level: 'beginner',
        creatorId: 'test-user-id',
        creatorRole: 'admin'
      }
    });
    testCourseId = course.id;
    testMaterialId = `test-material-${Date.now()}`;

    // Create embedding service with mock
    const embeddingService = new EmbeddingService({
      apiKey: 'test-key',
      cacheEnabled: false
    });

    // Mock the embedding generation
    embeddingService.callOpenAIAPI = async () => {
      return Array(1536)
        .fill(0)
        .map(() => Math.random());
    };

    adapter = new DatabaseStorageAdapter(embeddingService);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.knowledgeGraphNode.deleteMany({
      where: { courseId: testCourseId }
    });
    await prisma.course.delete({
      where: { id: testCourseId }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up nodes before each test
    await prisma.knowledgeGraphNode.deleteMany({
      where: { materialId: testMaterialId }
    });
  });

  describe('storeNode', () => {
    it('should store a node with embedding', async () => {
      const node = {
        courseId: testCourseId,
        materialId: testMaterialId,
        content: 'This is test content for the knowledge graph.',
        chunkIndex: 0,
        metadata: { test: true }
      };

      const result = await adapter.storeNode(node);

      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
      expect(result.node.id).toBeDefined();
      expect(result.node.content).toBe(node.content);
      expect(result.node.embedding).toBeDefined();
    });

    it('should fail with missing required fields', async () => {
      const node = {
        content: 'Test content'
        // Missing courseId and materialId
      };

      const result = await adapter.storeNode(node);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });
  });

  describe('storeBatchNodes', () => {
    it('should store multiple nodes in a transaction', async () => {
      const nodes = [
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'First chunk of content.',
          chunkIndex: 0
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Second chunk of content.',
          chunkIndex: 1
        },
        {
          courseId: testCourseId,
          materialId: testMaterialId,
          content: 'Third chunk of content.',
          chunkIndex: 2
        }
      ];

      const result = await adapter.storeBatchNodes(nodes);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(3);
      expect(result.count).toBe(3);
    });
  });

  describe('semanticSearch', () => {
    beforeEach(async () => {
      // Store test nodes
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

    it('should find similar content', async () => {
      const result = await adapter.semanticSearch('artificial intelligence', {
        courseId: testCourseId
      });

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('similarity');
    });

    it('should filter by materialId', async () => {
      const result = await adapter.semanticSearch('machine learning', {
        materialId: testMaterialId
      });

      expect(result.success).toBe(true);
      expect(result.results.every((r) => r.material_id === testMaterialId)).toBe(true);
    });

    it('should respect similarity threshold', async () => {
      const result = await adapter.semanticSearch('completely unrelated query xyz', {
        courseId: testCourseId,
        similarityThreshold: 0.9
      });

      expect(result.success).toBe(true);
      // High threshold should return fewer or no results
      expect(result.results.length).toBeLessThanOrEqual(1);
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

    it('should upsert existing relationship', async () => {
      const relationship = {
        sourceNodeId,
        targetNodeId,
        relationshipType: 'follows',
        weight: 1.0
      };

      // Store first time
      await adapter.storeRelationship(relationship);

      // Store again with different weight
      relationship.weight = 2.0;
      const result = await adapter.storeRelationship(relationship);

      expect(result.success).toBe(true);
      expect(result.relationship.weight).toBe(2.0);
    });
  });
});
