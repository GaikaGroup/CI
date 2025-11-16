import { prisma } from '$lib/database/client';
import { json } from '@sveltejs/kit';

/**
 * GET /api/admin/graphrag/stats
 *
 * Admin dashboard endpoint for GraphRAG statistics.
 * Requires admin authentication.
 */
export async function GET({ locals }) {
  // Check authentication
  if (!locals.user) {
    return json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // Check admin permission
  if (locals.user.type !== 'admin') {
    return json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    // Overview statistics
    const totalNodes = await prisma.knowledgeGraphNode.count();
    const totalRelationships = await prisma.knowledgeGraphRelationship.count();

    const nodesWithEmbeddings = await prisma.knowledgeGraphNode.count({
      where: { embedding: { not: null } }
    });

    const embeddingCoverage =
      totalNodes > 0 ? ((nodesWithEmbeddings / totalNodes) * 100).toFixed(2) : 0;

    // Count unique materials and courses
    const materialsWithGraphs = await prisma.knowledgeGraphNode.groupBy({
      by: ['materialId'],
      _count: true
    });

    const coursesWithGraphs = await prisma.knowledgeGraphNode.groupBy({
      by: ['courseId'],
      _count: true
    });

    // Top materials by node count
    const topMaterials = await prisma.knowledgeGraphNode.groupBy({
      by: ['materialId', 'courseId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Recent nodes
    const recentNodes = await prisma.knowledgeGraphNode.findMany({
      select: {
        id: true,
        materialId: true,
        courseId: true,
        createdAt: true,
        chunkIndex: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Storage size estimate (rough calculation)
    const avgNodeSize = 1000; // bytes (rough estimate)
    const estimatedStorageBytes = totalNodes * avgNodeSize;
    const estimatedStorageMB = (estimatedStorageBytes / (1024 * 1024)).toFixed(2);

    const stats = {
      overview: {
        totalNodes,
        totalRelationships,
        materialsWithGraphs: materialsWithGraphs.length,
        coursesWithGraphs: coursesWithGraphs.length,
        embeddingCoverage: `${embeddingCoverage}%`,
        nodesWithEmbeddings,
        estimatedStorageMB
      },

      topMaterials: topMaterials.map((m) => ({
        materialId: m.materialId,
        courseId: m.courseId,
        nodeCount: m._count.id
      })),

      recentNodes: recentNodes.map((n) => ({
        id: n.id,
        materialId: n.materialId,
        courseId: n.courseId,
        chunkIndex: n.chunkIndex,
        createdAt: n.createdAt
      })),

      timestamp: new Date().toISOString()
    };

    return json(stats);
  } catch (error) {
    console.error('[GraphRAG Stats] Error:', error);
    return json({ success: false, error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
