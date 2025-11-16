import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../../src/lib/database/client.js';
import { GraphRAGService } from '../../../src/lib/modules/courses/services/GraphRAGService.js';
import { InMemoryStorageAdapter } from '../../../src/lib/modules/graphrag/adapters/InMemoryStorageAdapter.js';

describe('GraphRAGService Integration Tests', () => {
  let service;
  let testCourseId;
  let testMaterialId;

  beforeAll(async () => {
    // Create test course
    const course = await prisma.course.create({
      data: {
        name: 'Test Course for GraphRAG Service',
        slug: 'test-graphrag-service',
        language: 'en',
        level: 'beginner',
        creatorId: 'test-user-id',
        creatorRole: 'admin'
      }
    });
    testCourseId = course.id;
    testMaterialId = `test-material-service-${Date.now()}`;

    // Use in-memory adapter for faster tests
    const adapter = new InMemoryStorageAdapter();
    service = new GraphRAGService(adapter);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.course.delete({
      where: { id: testCourseId }
    });
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
      expect(result.relationships.length).toBeGreaterThan(0);
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
      expect(result.relationshipCount).toBeGreaterThan(0);
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

    it('should return empty results for no matches', async () => {
      const result = await service.queryKnowledge('xyz123nonexistent', testCourseId);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
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
