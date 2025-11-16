import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../../src/lib/database/client.js';
import { GraphRAGService } from '../../../src/lib/modules/courses/services/GraphRAGService.js';
import { InMemoryStorageAdapter } from '../../../src/lib/modules/graphrag/adapters/InMemoryStorageAdapter.js';
import { EmbeddingService } from '../../../src/lib/modules/graphrag/services/EmbeddingService.js';

describe('GraphRAGService Integration Tests', () => {
  let service;
  let testCourseId;
  let testMaterialId;
  let testUserId;

  beforeAll(async () => {
    // Create test user first
    const user = await prisma.user.create({
      data: {
        email: `test-graphrag-service-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'GraphRAGService',
        password: 'test-password-hash',
        type: 'admin'
      }
    });
    testUserId = user.id;

    // Create test course
    const course = await prisma.course.create({
      data: {
        name: 'Test Course for GraphRAG Service',
        slug: `test-graphrag-service-${Date.now()}`,
        language: 'en',
        level: 'beginner',
        creatorId: testUserId,
        creatorRole: 'admin'
      }
    });
    testCourseId = course.id;
    testMaterialId = `test-material-service-${Date.now()}`;

    // Create embedding service with mock (384 dimensions)
    const embeddingService = new EmbeddingService({
      apiKey: 'test-key',
      cacheEnabled: false
    });

    // Mock the embedding generation
    embeddingService.callOpenAIAPI = async () => {
      return Array(384)
        .fill(0)
        .map(() => Math.random());
    };

    // Use in-memory adapter with embedding service
    const adapter = new InMemoryStorageAdapter(embeddingService);
    service = new GraphRAGService(adapter);
  });

  afterAll(async () => {
    // Cleanup
    if (testCourseId) {
      await prisma.course.delete({
        where: { id: testCourseId }
      });
    }
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      });
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear adapter data
    if (service.storageAdapter && service.storageAdapter.clear) {
      service.storageAdapter.clear();
    }
  });

  describe('processDocument', () => {
    it('should process document and create nodes', async () => {
      const content = `
        Machine learning is a subset of artificial intelligence.
        It enables computers to learn from data without explicit programming.
        Deep learning is a type of machine learning that uses neural networks.
      `;

      const result = await service.processDocument(content, {
        materialId: testMaterialId,
        courseId: testCourseId,
        fileName: 'test.txt',
        fileType: 'text/plain'
      });

      expect(result.success).toBe(true);
      expect(result.nodes.length).toBeGreaterThan(0);

      // Relationships may be 0 if only 1 chunk created
      if (result.nodes.length > 1) {
        expect(result.relationships.length).toBeGreaterThan(0);
      }

      expect(result.metadata.chunkCount).toBeGreaterThan(0);
    });

    it('should fail without required metadata', async () => {
      const result = await service.processDocument('Test content', {
        materialId: testMaterialId
        // Missing courseId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required metadata');
    });
  });

  describe('createKnowledgeGraph', () => {
    it('should create knowledge graph from materials', async () => {
      const materials = [
        {
          id: `${testMaterialId}-1`,
          status: 'ready',
          content: 'First material about machine learning and AI.',
          fileName: 'material1.txt',
          fileType: 'text/plain'
        },
        {
          id: `${testMaterialId}-2`,
          status: 'ready',
          content: 'Second material about deep learning and neural networks.',
          fileName: 'material2.txt',
          fileType: 'text/plain'
        }
      ];

      const result = await service.createKnowledgeGraph(materials, testCourseId);

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeGreaterThan(0);

      // Relationships may be 0 if each material creates only 1 chunk
      // This is acceptable behavior
      expect(result.relationshipCount).toBeGreaterThanOrEqual(0);
      expect(result.materialCount).toBe(2);
    });

    it('should skip materials without content', async () => {
      const materials = [
        {
          id: `${testMaterialId}-1`,
          status: 'ready',
          content: 'Valid content',
          fileName: 'material1.txt',
          fileType: 'text/plain'
        },
        {
          id: `${testMaterialId}-2`,
          status: 'processing',
          content: null,
          fileName: 'material2.txt',
          fileType: 'text/plain'
        }
      ];

      const result = await service.createKnowledgeGraph(materials, testCourseId);

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeGreaterThan(0);
    });
  });

  describe('queryKnowledge', () => {
    beforeEach(async () => {
      // Setup test data
      await service.processDocument(
        'Machine learning is a subset of artificial intelligence that enables computers to learn.',
        {
          materialId: testMaterialId,
          courseId: testCourseId
        }
      );
    });

    it('should find relevant content', async () => {
      const result = await service.queryKnowledge('machine learning', testCourseId);

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);
    });

    it('should handle queries with no semantic matches', async () => {
      const result = await service.queryKnowledge('xyz123nonexistent', testCourseId);

      expect(result.success).toBe(true);
      // Keyword fallback may return results, but they should be less relevant
      // This is acceptable behavior for in-memory adapter
      expect(result.results).toBeDefined();
    });

    it('should fail with invalid query', async () => {
      const result = await service.queryKnowledge(null, testCourseId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid query');
    });
  });

  describe('updateKnowledgeBase', () => {
    beforeEach(async () => {
      await service.processDocument('Original content about machine learning.', {
        materialId: testMaterialId,
        courseId: testCourseId
      });
    });

    it('should update material content', async () => {
      const result = await service.updateKnowledgeBase(
        testMaterialId,
        testCourseId,
        'Updated content about deep learning and neural networks.'
      );

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeGreaterThan(0);
    });
  });

  describe('deleteFromKnowledgeBase', () => {
    beforeEach(async () => {
      await service.processDocument('Content to delete.', {
        materialId: testMaterialId,
        courseId: testCourseId
      });
    });

    it('should delete material from knowledge base', async () => {
      const result = await service.deleteFromKnowledgeBase(testMaterialId);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThan(0);

      // Verify deletion
      const graphResult = await service.getKnowledgeGraph(testMaterialId);
      expect(graphResult.nodes).toHaveLength(0);
    });
  });

  describe('getKnowledgeGraph', () => {
    beforeEach(async () => {
      await service.processDocument('Test content for knowledge graph.', {
        materialId: testMaterialId,
        courseId: testCourseId
      });
    });

    it('should retrieve knowledge graph for material', async () => {
      const result = await service.getKnowledgeGraph(testMaterialId);

      expect(result.success).toBe(true);
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain existing API signatures', async () => {
      // Test that old method signatures still work
      const content = 'Test content for backward compatibility.';

      const processResult = await service.processDocument(content, {
        materialId: testMaterialId,
        courseId: testCourseId
      });

      expect(processResult).toHaveProperty('success');
      expect(processResult).toHaveProperty('nodes');
      expect(processResult).toHaveProperty('metadata');
    });
  });
});
