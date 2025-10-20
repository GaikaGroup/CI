/**
 * @typedef {Object} StatsOverview
 * @property {UserStats} users
 * @property {SessionStats} sessions
 * @property {MessageStats} messages
 * @property {CourseStats} courses
 * @property {FinanceStats} finance
 * @property {LanguageStats} languages
 * @property {AttentionEconomyStats} attentionEconomy
 */

/**
 * @typedef {Object} UserStats
 * @property {number} total
 * @property {number} new7d
 * @property {number} new30d
 * @property {number} active7d
 * @property {number} active30d
 * @property {number} growth - percentage
 */

/**
 * @typedef {Object} SessionStats
 * @property {number} total
 * @property {number} new7d
 * @property {number} new30d
 * @property {number} avgDuration
 * @property {number} growth
 */

/**
 * @typedef {Object} MessageStats
 * @property {number} total
 * @property {number} new7d
 * @property {number} new30d
 * @property {number} avgPerSession
 * @property {number} growth
 */

/**
 * @typedef {Object} CourseStats
 * @property {number} total
 * @property {number} new30d
 * @property {CoursePopularityStats[]} popular
 * @property {CoursePopularityStats[]} underperforming
 */

/**
 * @typedef {Object} CoursePopularityStats
 * @property {string} id
 * @property {string} name
 * @property {number} sessionCount
 * @property {number} avgTime
 */

/**
 * @typedef {Object} FinanceStats
 * @property {number} totalCost
 * @property {MonthlyCost[]} monthlyCosts
 * @property {ProviderCost[]} providerDistribution
 * @property {number} avgCostPerMessage
 */

/**
 * @typedef {Object} MonthlyCost
 * @property {string} month
 * @property {number} cost
 * @property {number} messageCount
 */

/**
 * @typedef {Object} ProviderCost
 * @property {'openai'|'local'} provider
 * @property {number} cost
 * @property {number} messageCount
 * @property {number} percentage
 */

/**
 * @typedef {Object} LanguageStats
 * @property {number} totalLanguages
 * @property {LanguageUsageStats[]} topLanguages
 * @property {number} avgLanguagesPerUser
 */

/**
 * @typedef {Object} LanguageUsageStats
 * @property {string} language
 * @property {number} sessionCount
 * @property {number} percentage
 */

/**
 * @typedef {Object} AttentionEconomyStats
 * @property {number} totalTime
 * @property {ModeDistribution} funVsLearn
 * @property {ModeTime[]} avgSessionTime
 * @property {CourseTimeStats[]} topCoursesByTime
 */

/**
 * @typedef {Object} ModeDistribution
 * @property {ModeTimeData} fun
 * @property {ModeTimeData} learn
 */

/**
 * @typedef {Object} ModeTimeData
 * @property {number} time
 * @property {number} percentage
 */

/**
 * @typedef {Object} ModeTime
 * @property {string} mode
 * @property {number} avgDuration
 */

/**
 * @typedef {Object} CourseTimeStats
 * @property {string} id
 * @property {string} name
 * @property {number} totalTime
 * @property {number} avgTime
 */

export {};