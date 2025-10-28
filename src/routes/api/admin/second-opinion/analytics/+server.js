/**
 * Admin API endpoint for second opinion analytics
 */

import { json } from '@sveltejs/kit';
import { prisma } from '$lib/database/client.js';

/**
 * GET /api/admin/second-opinion/analytics
 * Get analytics data for second opinions
 */
export async function GET({ url, locals }) {
  // Check if user is admin
  if (!locals.user || locals.user.type !== 'admin') {
    return json(
      {
        success: false,
        error: 'Unauthorized: Admin access required'
      },
      { status: 403 }
    );
  }

  try {
    const range = url.searchParams.get('range') || '7days';
    const dateFilter = getDateFilter(range);

    // Get usage metrics
    const [totalRequests, uniqueUsers, failedRequests, automaticRequests, manualRequests] =
      await Promise.all([
        prisma.secondOpinion.count({
          where: { createdAt: { gte: dateFilter } }
        }),
        prisma.secondOpinion.findMany({
          where: { createdAt: { gte: dateFilter } },
          select: { userId: true },
          distinct: ['userId']
        }),
        prisma.secondOpinion.count({
          where: {
            createdAt: { gte: dateFilter },
            opinionMessage: null // Failed requests don't have opinion messages
          }
        }),
        prisma.secondOpinion.count({
          where: {
            createdAt: { gte: dateFilter },
            requestType: 'automatic'
          }
        }),
        prisma.secondOpinion.count({
          where: {
            createdAt: { gte: dateFilter },
            requestType: 'manual'
          }
        })
      ]);

    const successRate =
      totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests) * 100 : 0;

    // Get provider statistics
    const providerStats = await getProviderStats(dateFilter);

    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics(dateFilter);

    // Get quality metrics
    const qualityMetrics = await getQualityMetrics(dateFilter);

    // Get cost metrics
    const costMetrics = await getCostMetrics(dateFilter);

    // Get recent activity
    const recentActivity = await getRecentActivity(dateFilter, 20);

    const analytics = {
      usage: {
        totalRequests,
        uniqueUsers: uniqueUsers.length,
        failedRequests,
        successRate,
        automaticRequests,
        manualRequests
      },
      providers: providerStats,
      performance: performanceMetrics,
      quality: qualityMetrics,
      cost: costMetrics,
      recentActivity
    };

    return json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('[Admin] Error getting analytics:', error);
    return json(
      {
        success: false,
        error: 'Failed to get analytics'
      },
      { status: 500 }
    );
  }
}

/**
 * Get date filter based on range
 * @param {string} range - Date range
 * @returns {Date} Start date
 */
function getDateFilter(range) {
  const now = new Date();
  switch (range) {
    case '1hour':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24hours':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '1year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Get provider statistics
 * @param {Date} dateFilter - Start date
 * @returns {Promise<Object>} Provider stats
 */
async function getProviderStats(dateFilter) {
  const opinions = await prisma.secondOpinion.findMany({
    where: {
      createdAt: { gte: dateFilter },
      opinionMessage: { isNot: null }
    },
    include: {
      opinionMessage: true
    }
  });

  const providerMap = {};
  let totalRequests = opinions.length;

  for (const opinion of opinions) {
    const provider = opinion.opinionProvider;
    if (!providerMap[provider]) {
      providerMap[provider] = {
        requests: 0,
        successCount: 0,
        totalResponseTime: 0,
        totalCost: 0
      };
    }

    providerMap[provider].requests++;
    if (opinion.opinionMessage) {
      providerMap[provider].successCount++;
    }

    // Estimate response time from metadata if available
    const metadata = opinion.opinionMessage?.metadata;
    if (metadata?.llmMetadata?.responseTime) {
      providerMap[provider].totalResponseTime += metadata.llmMetadata.responseTime;
    }

    // Estimate cost from metadata if available
    if (metadata?.llmMetadata?.cost) {
      providerMap[provider].totalCost += metadata.llmMetadata.cost;
    }
  }

  // Calculate percentages and averages
  const stats = {};
  for (const [provider, data] of Object.entries(providerMap)) {
    stats[provider] = {
      requests: data.requests,
      percentage: (data.requests / totalRequests) * 100,
      successRate: (data.successCount / data.requests) * 100,
      avgResponseTime: data.totalResponseTime / data.requests || 0,
      totalCost: data.totalCost
    };
  }

  return stats;
}

/**
 * Get performance metrics
 * @param {Date} dateFilter - Start date
 * @returns {Promise<Object>} Performance metrics
 */
async function getPerformanceMetrics(dateFilter) {
  const opinions = await prisma.secondOpinion.findMany({
    where: {
      createdAt: { gte: dateFilter },
      opinionMessage: { isNot: null }
    },
    include: {
      opinionMessage: true
    }
  });

  const responseTimes = opinions
    .map((o) => o.opinionMessage?.metadata?.llmMetadata?.responseTime)
    .filter((t) => t != null);

  if (responseTimes.length === 0) {
    return {
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0
    };
  }

  responseTimes.sort((a, b) => a - b);

  const avg = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);

  return {
    avgResponseTime: avg,
    p95ResponseTime: responseTimes[p95Index] || avg,
    p99ResponseTime: responseTimes[p99Index] || avg
  };
}

/**
 * Get quality metrics
 * @param {Date} dateFilter - Start date
 * @returns {Promise<Object>} Quality metrics
 */
async function getQualityMetrics(dateFilter) {
  const [opinions, feedback, divergenceCounts] = await Promise.all([
    prisma.secondOpinion.count({
      where: { createdAt: { gte: dateFilter } }
    }),
    prisma.opinionFeedback.findMany({
      where: {
        opinion: {
          createdAt: { gte: dateFilter }
        }
      }
    }),
    prisma.secondOpinion.groupBy({
      by: ['divergenceLevel'],
      where: {
        createdAt: { gte: dateFilter },
        divergenceLevel: { not: null }
      },
      _count: true
    })
  ]);

  const helpfulCount = feedback.filter((f) => f.helpful).length;
  const totalFeedback = feedback.length;

  const divergenceLevels = {
    low: 0,
    medium: 0,
    high: 0
  };

  for (const count of divergenceCounts) {
    if (count.divergenceLevel) {
      divergenceLevels[count.divergenceLevel] = count._count;
    }
  }

  const totalDivergence = Object.values(divergenceLevels).reduce((sum, count) => sum + count, 0);

  return {
    helpfulPercentage: totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0,
    totalFeedback,
    helpfulCount,
    divergenceRate: opinions > 0 ? (totalDivergence / opinions) * 100 : 0,
    divergenceLevels
  };
}

/**
 * Get cost metrics
 * @param {Date} dateFilter - Start date
 * @returns {Promise<Object>} Cost metrics
 */
async function getCostMetrics(dateFilter) {
  const opinions = await prisma.secondOpinion.findMany({
    where: {
      createdAt: { gte: dateFilter },
      opinionMessage: { isNot: null }
    },
    include: {
      opinionMessage: true
    }
  });

  let totalCost = 0;
  let costCount = 0;

  for (const opinion of opinions) {
    const cost = opinion.opinionMessage?.metadata?.llmMetadata?.cost;
    if (cost != null) {
      totalCost += cost;
      costCount++;
    }
  }

  return {
    totalCost,
    avgCostPerRequest: costCount > 0 ? totalCost / costCount : 0
  };
}

/**
 * Get recent activity
 * @param {Date} dateFilter - Start date
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Recent activity
 */
async function getRecentActivity(dateFilter, limit = 20) {
  const opinions = await prisma.secondOpinion.findMany({
    where: {
      createdAt: { gte: dateFilter }
    },
    include: {
      opinionMessage: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });

  return opinions.map((opinion) => ({
    timestamp: opinion.createdAt,
    userId: opinion.userId,
    provider: opinion.opinionProvider,
    success: opinion.opinionMessage != null,
    responseTime: opinion.opinionMessage?.metadata?.llmMetadata?.responseTime || 0,
    divergenceLevel: opinion.divergenceLevel
  }));
}
