import { prisma } from '$lib/database/client';
import { EmbeddingService } from '$lib/modules/graphrag/services/EmbeddingService.js';
import { graphragConfig } from '$lib/config/graphrag.js';
import { json } from '@sveltejs/kit';

/**
 * GET /api/health/graphrag
 *
 * Health check endpoint for GraphRAG system.
 * Returns status of pgvector, embedding service, and database connectivity.
 */
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
    stats: {}
  };

  // Check pgvector availability
  try {
    const result = await prisma.$queryRaw`
      SELECT 1 FROM pg_extension WHERE extname = 'vector'
    `;
    health.checks.pgvector = {
      status: result && result.length > 0 ? 'ok' : 'unavailable'
    };

    if (health.checks.pgvector.status === 'unavailable') {
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.pgvector = {
      status: 'error',
      error: error.message
    };
    health.status = 'degraded';
  }

  // Check embedding service
  try {
    const embeddingService = new EmbeddingService(graphragConfig.embedding);
    const testResult = await embeddingService.generateEmbedding('test');

    health.checks.embedding = {
      status: testResult.success ? 'ok' : 'error',
      latency: testResult.latency,
      cached: testResult.cached
    };

    if (!testResult.success) {
      health.checks.embedding.error = testResult.error;
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.embedding = {
      status: 'error',
      error: error.message
    };
    health.status = 'degraded';
  }

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = { status: 'ok' };
  } catch (error) {
    health.checks.database = {
      status: 'error',
      error: error.message
    };
    health.status = 'unhealthy';
  }

  // Get statistics
  try {
    const nodeCount = await prisma.knowledgeGraphNode.count();
    const relationshipCount = await prisma.knowledgeGraphRelationship.count();

    // Calculate embedding coverage
    const nodesWithEmbeddings = await prisma.knowledgeGraphNode.count({
      where: {
        embedding: { not: null }
      }
    });

    const embeddingCoverage =
      nodeCount > 0 ? ((nodesWithEmbeddings / nodeCount) * 100).toFixed(2) : 0;

    health.stats = {
      nodes: nodeCount,
      relationships: relationshipCount,
      embeddingCoverage: `${embeddingCoverage}%`,
      nodesWithEmbeddings
    };
  } catch (error) {
    health.stats.error = error.message;
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return json(health, { status: statusCode });
}
