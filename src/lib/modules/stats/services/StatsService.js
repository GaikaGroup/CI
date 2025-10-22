import { getPrismaClient } from '$lib/database/connection.js';

class StatsService {
  constructor() {
    this.prisma = getPrismaClient();
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Clear all cache
   */
  clearCache() {
    const cacheSize = this.cache.size;
    const cacheKeys = Array.from(this.cache.keys());
    console.log('[StatsService] Clearing cache with', cacheSize, 'entries:', cacheKeys);
    this.cache.clear();
    console.log('[StatsService] ✓ Cache cleared');
  }

  /**
   * Check if data is cached and still valid
   * @param {string} cacheKey
   * @returns {boolean}
   */
  isCached(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;

    const now = Date.now();
    return now - cached.timestamp < this.cacheTimeout;
  }

  /**
   * Set cache with timestamp
   * @param {string} cacheKey
   * @param {any} data
   */
  setCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached data
   * @param {string} cacheKey
   * @returns {any}
   */
  getCachedData(cacheKey) {
    const cached = this.cache.get(cacheKey);
    return cached ? cached.data : null;
  }

  /**
   * Parse time range to date
   * @param {string} timeRange
   * @returns {Date}
   */
  parseTimeRange(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get overview statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').StatsOverview>}
   */
  async getOverviewStats(timeRange = '30d') {
    const cacheKey = `overview-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const [users, sessions, messages, courses, finance, languages, attentionEconomy] =
        await Promise.all([
          this.getUserStats(timeRange),
          this.getSessionStats(timeRange),
          this.getMessageStats(timeRange),
          this.getCourseStats(timeRange),
          this.getFinanceStats(timeRange),
          this.getLanguageStats(timeRange),
          this.getAttentionEconomyStats(timeRange)
        ]);

      const data = {
        users,
        sessions,
        messages,
        courses,
        finance,
        languages,
        attentionEconomy
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').UserStats>}
   */
  async getUserStats(timeRange = '30d') {
    const cacheKey = `users-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Optimized: Single aggregation query for all user counts
      const userStats = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) FILTER (WHERE is_active = true) as total_users,
          COUNT(*) FILTER (WHERE is_active = true AND created_at >= ${sevenDaysAgo}) as new_7d,
          COUNT(*) FILTER (WHERE is_active = true AND created_at >= ${thirtyDaysAgo}) as new_30d,
          COUNT(*) FILTER (WHERE is_active = true AND created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}) as previous_period
        FROM users
      `;

      // Optimized: Single query for active users using groupBy
      const activeUsersStats = await this.prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT user_id) FILTER (WHERE created_at >= ${sevenDaysAgo}) as active_7d,
          COUNT(DISTINCT user_id) FILTER (WHERE created_at >= ${thirtyDaysAgo}) as active_30d
        FROM sessions
      `;

      const totalUsers = Number(userStats[0].total_users);
      const newUsers7d = Number(userStats[0].new_7d);
      const newUsers30d = Number(userStats[0].new_30d);
      const previousPeriodCount = Number(userStats[0].previous_period);
      const activeUsers7d = Number(activeUsersStats[0].active_7d);
      const activeUsers30d = Number(activeUsersStats[0].active_30d);

      const growth =
        previousPeriodCount > 0
          ? ((activeUsers30d - previousPeriodCount) / previousPeriodCount) * 100
          : activeUsers30d > 0
            ? 100
            : 0;

      const data = {
        total: totalUsers,
        new7d: newUsers7d,
        new30d: newUsers30d,
        active7d: activeUsers7d,
        active30d: activeUsers30d,
        growth: Math.round(growth * 100) / 100
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        total: 0,
        new7d: 0,
        new30d: 0,
        active7d: 0,
        active30d: 0,
        growth: 0
      };
    }
  }

  /**
   * Get session statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').SessionStats>}
   */
  async getSessionStats(timeRange = '30d') {
    const cacheKey = `sessions-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Optimized: Single aggregation query for all session counts and duration
      const sessionStats = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo}) as new_7d,
          COUNT(*) FILTER (WHERE created_at >= ${thirtyDaysAgo}) as new_30d,
          COUNT(*) FILTER (WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}) as previous_period,
          AVG(
            CASE 
              WHEN created_at >= ${thirtyDaysAgo} 
              THEN LEAST(
                EXTRACT(EPOCH FROM (updated_at - created_at)) / 60,
                message_count * 2
              )
              ELSE NULL
            END
          ) as avg_duration
        FROM sessions
      `;

      const totalSessions = Number(sessionStats[0].total_sessions);
      const newSessions7d = Number(sessionStats[0].new_7d);
      const newSessions30d = Number(sessionStats[0].new_30d);
      const previousPeriodSessions = Number(sessionStats[0].previous_period);
      const avgDuration = Math.round(Number(sessionStats[0].avg_duration) || 0);

      const growth =
        previousPeriodSessions > 0
          ? ((newSessions30d - previousPeriodSessions) / previousPeriodSessions) * 100
          : newSessions30d > 0
            ? 100
            : 0;

      const data = {
        total: totalSessions,
        new7d: newSessions7d,
        new30d: newSessions30d,
        avgDuration,
        growth: Math.round(growth * 100) / 100
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching session stats:', error);
      return {
        total: 0,
        new7d: 0,
        new30d: 0,
        avgDuration: 0,
        growth: 0
      };
    }
  }

  /**
   * Get message statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').MessageStats>}
   */
  async getMessageStats(timeRange = '30d') {
    const cacheKey = `messages-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Optimized: Single query for message counts
      const messageStats = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo}) as new_7d,
          COUNT(*) FILTER (WHERE created_at >= ${thirtyDaysAgo}) as new_30d,
          COUNT(*) FILTER (WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}) as previous_period
        FROM messages
      `;

      // Optimized: Get average messages per session
      const avgStats = await this.prisma.$queryRaw`
        SELECT AVG(message_count) as avg_per_session
        FROM sessions
        WHERE created_at >= ${thirtyDaysAgo}
      `;

      const totalMessages = Number(messageStats[0].total_messages);
      const newMessages7d = Number(messageStats[0].new_7d);
      const newMessages30d = Number(messageStats[0].new_30d);
      const previousPeriodMessages = Number(messageStats[0].previous_period);
      const avgPerSession = Math.round((Number(avgStats[0].avg_per_session) || 0) * 100) / 100;

      const growth =
        previousPeriodMessages > 0
          ? ((newMessages30d - previousPeriodMessages) / previousPeriodMessages) * 100
          : newMessages30d > 0
            ? 100
            : 0;

      const data = {
        total: totalMessages,
        new7d: newMessages7d,
        new30d: newMessages30d,
        avgPerSession,
        growth: Math.round(growth * 100) / 100
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching message stats:', error);
      return {
        total: 0,
        new7d: 0,
        new30d: 0,
        avgPerSession: 0,
        growth: 0
      };
    }
  }

  /**
   * Get course statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').CourseStats>}
   */
  async getCourseStats(timeRange = '30d') {
    const cacheKey = `courses-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const startDate = this.parseTimeRange(timeRange);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get total unique courses
      const totalCoursesResult = await this.prisma.session.findMany({
        where: {
          courseId: {
            not: null
          }
        },
        select: { courseId: true },
        distinct: ['courseId']
      });
      const totalCourses = totalCoursesResult.length;

      // Get new courses in last 30 days (courses with first session in last 30 days)
      // First get all courses with their first session date
      const allCoursesWithFirstSession = await this.prisma.session.groupBy({
        by: ['courseId'],
        where: {
          courseId: {
            not: null
          }
        },
        _min: {
          createdAt: true
        }
      });

      // Filter in memory to find courses that started in last 30 days
      const newCourses30d = allCoursesWithFirstSession.filter(
        (course) => course._min.createdAt && course._min.createdAt >= thirtyDaysAgo
      ).length;

      // Get popular courses (top 10 by session count)
      const popularCoursesResult = await this.prisma.session.groupBy({
        by: ['courseId'],
        where: {
          courseId: {
            not: null
          },
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        },
        _avg: {
          messageCount: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      const popular = popularCoursesResult.map((course) => ({
        id: course.courseId || 'unknown',
        name: course.courseId || 'Unknown Course', // In real app, you'd join with course table
        sessionCount: course._count.id,
        avgTime: Math.round((course._avg.messageCount || 0) * 2) // Rough estimate: 2 minutes per message
      }));

      // Get underperforming courses (bottom 5 by session count, but only courses that exist)
      const allCoursesWithStats = await this.prisma.session.groupBy({
        by: ['courseId'],
        where: {
          courseId: {
            not: null
          },
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        },
        _avg: {
          messageCount: true
        },
        orderBy: {
          _count: {
            id: 'asc'
          }
        }
      });

      const underperforming = allCoursesWithStats.slice(0, 5).map((course) => ({
        id: course.courseId || 'unknown',
        name: course.courseId || 'Unknown Course',
        sessionCount: course._count.id,
        avgTime: Math.round((course._avg.messageCount || 0) * 2)
      }));

      const data = {
        total: totalCourses,
        new30d: newCourses30d,
        popular,
        underperforming
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching course stats:', error);
      return {
        total: 0,
        new30d: 0,
        popular: [],
        underperforming: []
      };
    }
  }

  /**
   * Get finance statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').FinanceStats>}
   */
  async getFinanceStats(timeRange = '30d') {
    const cacheKey = `finance-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      // Import UsageTracker to get real cost data
      const { usageTracker } = await import('$lib/modules/analytics/UsageTracker.js');
      const usageSummary = usageTracker.summary();

      // Group costs by provider
      const providerCosts = {};
      let totalCost = 0;
      let totalMessages = 0;

      usageSummary.models.forEach((model) => {
        const provider = model.provider;
        if (!providerCosts[provider]) {
          providerCosts[provider] = {
            cost: 0,
            messageCount: 0
          };
        }
        providerCosts[provider].cost += model.totalCost;
        providerCosts[provider].messageCount += model.total;
        totalCost += model.totalCost;
        totalMessages += model.total;
      });

      // Create provider distribution array
      const providerDistribution = Object.entries(providerCosts).map(([provider, data]) => ({
        provider,
        cost: data.cost, // Keep exact cost without rounding
        messageCount: data.messageCount,
        percentage: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0
      }));

      // If no OpenAI costs but we have local usage, show only local as free
      if (providerDistribution.length === 0) {
        // Get message count from database for local usage
        const localMessages = await this.prisma.message.count({
          where: {
            type: 'assistant'
          }
        });

        providerDistribution.push({
          provider: 'local',
          cost: 0,
          messageCount: localMessages,
          percentage: 100
        });
        totalMessages = localMessages;
      }

      // Simple monthly costs (current month only for now)
      const currentMonth = new Date().toISOString().substring(0, 7);
      const monthlyCosts = [
        {
          month: currentMonth,
          cost: totalCost, // Keep exact cost
          messageCount: totalMessages
        }
      ];

      const avgCostPerMessage = totalMessages > 0 ? totalCost / totalMessages : 0;

      const data = {
        totalCost: totalCost, // Keep exact cost
        monthlyCosts,
        providerDistribution,
        avgCostPerMessage
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching finance stats:', error);
      return {
        totalCost: 0,
        monthlyCosts: [],
        providerDistribution: [{ provider: 'local', cost: 0, messageCount: 0, percentage: 100 }],
        avgCostPerMessage: 0
      };
    }
  }

  /**
   * Get language statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').LanguageStats>}
   */
  async getLanguageStats(timeRange = '30d') {
    const cacheKey = `languages-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const startDate = this.parseTimeRange(timeRange);

      // Get language usage in sessions - exclude empty languages
      const languageUsage = await this.prisma.session.groupBy({
        by: ['language'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      });

      // Filter out sessions with empty userIds or languages
      const validLanguageUsage = languageUsage.filter(
        (lang) => lang.language && lang.language.trim() !== ''
      );

      const totalSessions = validLanguageUsage.reduce((sum, lang) => sum + lang._count.id, 0);
      const totalLanguages = validLanguageUsage.length;

      // Top 5 languages with percentages - map language codes to readable names
      const languageNames = {
        en: 'English',
        ru: 'Russian',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        pt: 'Portuguese',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean'
      };

      const topLanguages = validLanguageUsage.slice(0, 5).map((lang) => ({
        language: languageNames[lang.language] || lang.language,
        sessionCount: lang._count.id,
        percentage: totalSessions > 0 ? Math.round((lang._count.id / totalSessions) * 100) : 0
      }));

      // Calculate average languages per user
      const userLanguages = await this.prisma.session.groupBy({
        by: ['userId'],
        _count: {
          language: true
        }
      });

      const validUserLanguages = userLanguages.filter((u) => u.userId && u.userId.trim() !== '');
      const totalUsers = validUserLanguages.length;
      const totalLanguageUsages = validUserLanguages.reduce(
        (sum, user) => sum + user._count.language,
        0
      );
      const avgLanguagesPerUser =
        totalUsers > 0 ? Math.round((totalLanguageUsages / totalUsers) * 100) / 100 : 0;

      const data = {
        totalLanguages,
        topLanguages,
        avgLanguagesPerUser
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching language stats:', error);
      return {
        totalLanguages: 0,
        topLanguages: [],
        avgLanguagesPerUser: 0
      };
    }
  }

  /**
   * Get attention economy statistics
   * @param {string} timeRange
   * @returns {Promise<import('../types.js').AttentionEconomyStats>}
   */
  async getAttentionEconomyStats(timeRange = '30d') {
    const cacheKey = `attention-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const startDate = this.parseTimeRange(timeRange);

      // Get sessions with estimated time spent (based on message count and time between creation/update)
      const sessions = await this.prisma.session.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        select: {
          id: true,
          mode: true,
          courseId: true,
          messageCount: true,
          createdAt: true,
          updatedAt: true
        }
      });

      let totalTime = 0;
      let funTime = 0;
      let learnTime = 0;
      const courseTimeMap = {};

      sessions.forEach((session) => {
        // Estimate session time: min of (time between create/update, messageCount * 2 minutes)
        const timeDiff = (session.updatedAt.getTime() - session.createdAt.getTime()) / (1000 * 60); // minutes
        const estimatedTime = Math.min(timeDiff, session.messageCount * 2); // Max 2 minutes per message
        const sessionTime = Math.max(estimatedTime, 1); // Minimum 1 minute

        totalTime += sessionTime;

        if (session.mode === 'fun') {
          funTime += sessionTime;
        } else if (session.mode === 'learn') {
          learnTime += sessionTime;
        }

        // Track course time
        if (session.courseId) {
          if (!courseTimeMap[session.courseId]) {
            courseTimeMap[session.courseId] = { totalTime: 0, sessionCount: 0 };
          }
          courseTimeMap[session.courseId].totalTime += sessionTime;
          courseTimeMap[session.courseId].sessionCount++;
        }
      });

      // Fun vs Learn distribution
      const funVsLearn = {
        fun: {
          time: Math.round(funTime),
          percentage: totalTime > 0 ? Math.round((funTime / totalTime) * 100) : 0
        },
        learn: {
          time: Math.round(learnTime),
          percentage: totalTime > 0 ? Math.round((learnTime / totalTime) * 100) : 0
        }
      };

      // Average session time by mode
      const funSessions = sessions.filter((s) => s.mode === 'fun');
      const learnSessions = sessions.filter((s) => s.mode === 'learn');

      const avgSessionTime = [
        {
          mode: 'fun',
          avgDuration: funSessions.length > 0 ? Math.round(funTime / funSessions.length) : 0
        },
        {
          mode: 'learn',
          avgDuration: learnSessions.length > 0 ? Math.round(learnTime / learnSessions.length) : 0
        }
      ];

      // Top courses by time spent
      const topCoursesByTime = Object.entries(courseTimeMap)
        .map(([courseId, data]) => ({
          id: courseId,
          name: courseId, // In real app, you'd join with course table
          totalTime: Math.round(data.totalTime),
          avgTime: Math.round(data.totalTime / data.sessionCount)
        }))
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 5);

      const data = {
        totalTime: Math.round(totalTime),
        funVsLearn,
        avgSessionTime,
        topCoursesByTime
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching attention economy stats:', error);
      return {
        totalTime: 0,
        funVsLearn: {
          fun: { time: 0, percentage: 0 },
          learn: { time: 0, percentage: 0 }
        },
        avgSessionTime: [],
        topCoursesByTime: []
      };
    }
  }

  /**
   * Get daily/hourly user activity for charts
   * @param {string} timeRange
   * @returns {Promise<Array<{date: string, activeUsers: number, newUsers: number}>>}
   */
  async getDailyUserActivity(timeRange = '30d') {
    // For short time ranges, use hourly data
    if (timeRange === '1h' || timeRange === '1d') {
      return this.getHourlyUserActivity(timeRange);
    }
    const cacheKey = `daily-activity-${timeRange}`;
    if (this.isCached(cacheKey)) {
      console.log('[getDailyUserActivity] Returning cached data for', timeRange);
      return this.getCachedData(cacheKey);
    }

    try {
      const startDate = this.parseTimeRange(timeRange);
      // Use end of today instead of current time to include all sessions created today
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Set to end of today

      console.log(
        '[getDailyUserActivity] Fetching sessions from',
        startDate.toISOString(),
        'to',
        now.toISOString()
      );

      // Fetch all sessions in the time range in ONE query
      const sessions = await this.prisma.session.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: now
          }
        },
        select: {
          id: true,
          userId: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log('[getDailyUserActivity] Found', sessions.length, 'sessions in range');

      // Log sessions with empty or null userId
      const emptyUserIdSessions = sessions.filter((s) => !s.userId || s.userId.trim() === '');
      if (emptyUserIdSessions.length > 0) {
        console.log(
          '[getDailyUserActivity] WARNING:',
          emptyUserIdSessions.length,
          'sessions have empty userId'
        );
        console.log(
          '[getDailyUserActivity] Sample empty userId sessions:',
          emptyUserIdSessions.slice(0, 3).map((s) => ({
            id: s.id,
            userId: s.userId,
            createdAt: s.createdAt
          }))
        );
      }

      // Check for specific session
      const targetSession = sessions.find((s) => s.id === 'cmgwnpd45001tduwxaizxanvl');
      if (targetSession) {
        console.log('[getDailyUserActivity] ✓ Found target session cmgwnpd45001tduwxaizxanvl:', {
          userId: targetSession.userId,
          createdAt: targetSession.createdAt
        });
      } else {
        console.log(
          '[getDailyUserActivity] ✗ Target session cmgwnpd45001tduwxaizxanvl NOT found in query results'
        );
      }

      // Get first session date for each user in ONE query
      const userFirstSessions = await this.prisma.session.groupBy({
        by: ['userId'],
        _min: {
          createdAt: true
        }
      });

      // Create a map of userId -> first session date
      const firstSessionMap = new Map();
      userFirstSessions.forEach((item) => {
        firstSessionMap.set(item.userId, item._min.createdAt);
      });

      // Generate array of dates (start of each day in UTC)
      const days = [];
      const currentDate = new Date(startDate);
      currentDate.setUTCHours(0, 0, 0, 0); // Start from beginning of start date

      const endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999); // End of today

      // Safety check to prevent infinite loop
      const maxDays = 400; // Max 400 days
      let dayCount = 0;

      while (currentDate <= endDate && dayCount < maxDays) {
        days.push(new Date(currentDate));
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        dayCount++;
      }

      if (dayCount >= maxDays) {
        console.warn('[getDailyUserActivity] Hit max days limit, stopping loop');
      }

      // Process data in memory instead of making DB queries
      const dailyActivity = days.map((date) => {
        const nextDay = new Date(date);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        // Filter sessions for this day
        const sessionsThisDay = sessions.filter(
          (s) => s.createdAt >= date && s.createdAt < nextDay
        );

        // Get unique users for this day
        const uniqueUsers = new Set(sessionsThisDay.map((s) => s.userId));

        // Count new users (users whose first session was on this day)
        let newUsersCount = 0;
        uniqueUsers.forEach((userId) => {
          const firstSessionDate = firstSessionMap.get(userId);
          if (firstSessionDate && firstSessionDate >= date && firstSessionDate < nextDay) {
            newUsersCount++;
          }
        });

        const dateStr = date.toISOString().split('T')[0];

        // Log today's data
        if (dateStr === new Date().toISOString().split('T')[0]) {
          console.log('[getDailyUserActivity] TODAY', dateStr, ':', {
            dateRange: {
              from: date.toISOString(),
              to: nextDay.toISOString()
            },
            sessionsCount: sessionsThisDay.length,
            activeUsers: uniqueUsers.size,
            newUsers: newUsersCount,
            sampleSessions: sessionsThisDay.slice(0, 3).map((s) => ({
              id: s.id,
              userId: s.userId,
              createdAt: s.createdAt
            }))
          });

          // Check if target session should be in today
          const targetInRange = sessions.find((s) => s.id === 'cmgwnpd45001tduwxaizxanvl');
          if (targetInRange) {
            const inToday = targetInRange.createdAt >= date && targetInRange.createdAt < nextDay;
            console.log('[getDailyUserActivity] Target session check:', {
              createdAt: targetInRange.createdAt.toISOString(),
              dateFrom: date.toISOString(),
              dateTo: nextDay.toISOString(),
              isInRange: inToday,
              comparison: {
                'createdAt >= date': targetInRange.createdAt >= date,
                'createdAt < nextDay': targetInRange.createdAt < nextDay
              }
            });
          }
        }

        return {
          date: dateStr,
          activeUsers: uniqueUsers.size,
          newUsers: newUsersCount
        };
      });

      console.log('[getDailyUserActivity] Returning', dailyActivity.length, 'days of data');
      console.log('[getDailyUserActivity] Last 3 days:', dailyActivity.slice(-3));

      this.setCache(cacheKey, dailyActivity);
      return dailyActivity;
    } catch (error) {
      console.error('[getDailyUserActivity] Error fetching daily user activity:', error);
      return [];
    }
  }

  /**
   * Get hourly user activity for short time ranges
   * @param {string} timeRange
   * @returns {Promise<Array<{date: string, activeUsers: number, newUsers: number}>>}
   */
  async getHourlyUserActivity(timeRange = '1d') {
    const cacheKey = `hourly-activity-${timeRange}`;
    if (this.isCached(cacheKey)) {
      console.log('[getHourlyUserActivity] Returning cached data for', timeRange);
      return this.getCachedData(cacheKey);
    }

    try {
      const startDate = this.parseTimeRange(timeRange);
      const now = new Date();

      console.log(
        '[getHourlyUserActivity] Fetching sessions from',
        startDate.toISOString(),
        'to',
        now.toISOString()
      );

      // Fetch all sessions in the time range
      const sessions = await this.prisma.session.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: now
          }
        },
        select: {
          id: true,
          userId: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log('[getHourlyUserActivity] Found', sessions.length, 'sessions in range');

      // Get first session date for each user
      const userFirstSessions = await this.prisma.session.groupBy({
        by: ['userId'],
        _min: {
          createdAt: true
        }
      });

      const firstSessionMap = new Map();
      userFirstSessions.forEach((item) => {
        firstSessionMap.set(item.userId, item._min.createdAt);
      });

      // Generate array of hours
      const hours = [];
      const currentHour = new Date(startDate);
      currentHour.setMinutes(0, 0, 0);

      const endHour = new Date(now);
      endHour.setMinutes(59, 59, 999);

      // Safety check
      const maxHours = 200;
      let hourCount = 0;

      while (currentHour <= endHour && hourCount < maxHours) {
        hours.push(new Date(currentHour));
        currentHour.setHours(currentHour.getHours() + 1);
        hourCount++;
      }

      // Process data by hour
      const hourlyActivity = hours.map((hour) => {
        const nextHour = new Date(hour);
        nextHour.setHours(nextHour.getHours() + 1);

        const sessionsThisHour = sessions.filter(
          (s) => s.createdAt >= hour && s.createdAt < nextHour
        );

        const uniqueUsers = new Set(sessionsThisHour.map((s) => s.userId));

        let newUsersCount = 0;
        uniqueUsers.forEach((userId) => {
          const firstSessionDate = firstSessionMap.get(userId);
          if (firstSessionDate && firstSessionDate >= hour && firstSessionDate < nextHour) {
            newUsersCount++;
          }
        });

        return {
          date: hour.toISOString(),
          activeUsers: uniqueUsers.size,
          newUsers: newUsersCount
        };
      });

      console.log('[getHourlyUserActivity] Returning', hourlyActivity.length, 'hours of data');

      this.setCache(cacheKey, hourlyActivity);
      return hourlyActivity;
    } catch (error) {
      console.error('[getHourlyUserActivity] Error:', error);
      return [];
    }
  }

  /**
   * Get user registration trends over time
   * @param {string} timeRange
   * @returns {Promise<Array<{month: string, registrations: number}>>}
   */
  async getUserRegistrationTrends(timeRange = '1y') {
    const cacheKey = `registration-trends-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const startDate = this.parseTimeRange(timeRange);

      // Get first sessions for each user (registration date)
      const firstSessions = await this.prisma.session.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _min: {
          createdAt: true
        }
      });

      // Group by month
      const monthlyRegistrations = {};
      firstSessions.forEach((session) => {
        if (session._min.createdAt) {
          const month = session._min.createdAt.toISOString().substring(0, 7); // YYYY-MM
          monthlyRegistrations[month] = (monthlyRegistrations[month] || 0) + 1;
        }
      });

      const trends = Object.entries(monthlyRegistrations)
        .map(([month, registrations]) => ({ month, registrations }))
        .sort((a, b) => a.month.localeCompare(b.month));

      this.setCache(cacheKey, trends);
      return trends;
    } catch (error) {
      console.error('Error fetching registration trends:', error);
      return [];
    }
  }

  /**
   * Get trends data for forecasting
   * @param {string} timeRange
   * @returns {Promise<any>}
   */
  async getTrendsData(timeRange = '30d') {
    const cacheKey = `trends-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      const dailyActivity = await this.getDailyUserActivity(timeRange);
      const registrationTrends = await this.getUserRegistrationTrends('3m');

      // Calculate user growth trend
      const recentActivity = dailyActivity.slice(-7); // Last 7 days
      const previousActivity = dailyActivity.slice(-14, -7); // Previous 7 days

      const recentAvg =
        recentActivity.reduce((sum, day) => sum + day.activeUsers, 0) / recentActivity.length;
      const previousAvg =
        previousActivity.reduce((sum, day) => sum + day.activeUsers, 0) / previousActivity.length;

      let userGrowthTrend = 'stable';
      if (recentAvg > previousAvg * 1.1) userGrowthTrend = 'growing';
      else if (recentAvg < previousAvg * 0.9) userGrowthTrend = 'declining';

      // Simple forecast based on recent trend
      const growthRate = previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0;
      const currentUsers = recentActivity[recentActivity.length - 1]?.activeUsers || 0;
      const forecastNextMonth = Math.max(0, Math.round(currentUsers * (1 + growthRate * 4))); // 4 weeks

      // Weekly patterns (day of week analysis)
      const weeklyPatterns = Array(7)
        .fill(0)
        .map((_, dayOfWeek) => {
          const daysOfWeek = dailyActivity.filter(
            (day) => new Date(day.date).getDay() === dayOfWeek
          );
          const avgActivity =
            daysOfWeek.reduce((sum, day) => sum + day.activeUsers, 0) / daysOfWeek.length;
          return {
            dayOfWeek,
            dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
              dayOfWeek
            ],
            avgActivity: Math.round(avgActivity)
          };
        });

      // Platform health indicator
      let platformHealth = 'green';
      if (userGrowthTrend === 'declining') platformHealth = 'yellow';
      if (recentAvg < previousAvg * 0.7) platformHealth = 'red';

      const data = {
        userGrowthTrend,
        forecastNextMonth,
        weeklyPatterns,
        platformHealth,
        dailyActivity,
        registrationTrends
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching trends data:', error);
      return {
        userGrowthTrend: 'stable',
        forecastNextMonth: 0,
        weeklyPatterns: [],
        platformHealth: 'green',
        dailyActivity: [],
        registrationTrends: []
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Close database connection
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default StatsService;
