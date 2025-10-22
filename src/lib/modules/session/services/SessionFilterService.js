/**
 * SessionFilterService
 *
 * Builds Prisma query filters for session filtering.
 * Supports search, date range, and command type filtering.
 */

import { getCommandVariantsForTypes } from '../utils/commandTypes.js';

/**
 * Date range options
 */
export const DATE_RANGES = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all'
};

/**
 * SessionFilterService class
 */
export class SessionFilterService {
  /**
   * Build Prisma where clause for session filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.search - Search query
   * @param {string} filters.dateRange - Date range (hour, day, week, month, year, all)
   * @param {Array<string>} filters.commandTypes - Array of command type IDs
   * @param {string} userId - User ID to filter by
   * @returns {Object} Prisma where clause
   */
  static buildQuery(filters, userId) {
    if (!userId) {
      throw new Error('User ID is required for building session query');
    }

    const where = {
      userId,
      isHidden: false
    };

    // Add date range filter
    if (filters.dateRange && filters.dateRange !== DATE_RANGES.ALL) {
      const dateStart = this.getDateRangeStart(filters.dateRange);
      if (dateStart) {
        where.updatedAt = {
          gte: dateStart
        };
      }
    }

    // Add search filter
    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = filters.search.trim();
      where.OR = [
        {
          title: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          preview: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          messages: {
            some: {
              content: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          }
        }
      ];
    }

    // Add command type filter
    if (filters.commandTypes && filters.commandTypes.length > 0) {
      const commandVariants = this.getCommandVariants(filters.commandTypes);

      if (commandVariants.length > 0) {
        // Filter sessions that have messages containing any of the command variants
        where.messages = {
          some: {
            type: 'user',
            OR: commandVariants.map((variant) => ({
              content: {
                contains: variant,
                mode: 'insensitive'
              }
            }))
          }
        };
      }
    }

    return where;
  }

  /**
   * Get date range start timestamp
   * @param {string} range - Date range identifier
   * @returns {Date|null} Start date or null for 'all'
   */
  static getDateRangeStart(range) {
    const now = new Date();

    switch (range) {
      case DATE_RANGES.HOUR:
        return new Date(now.getTime() - 60 * 60 * 1000);

      case DATE_RANGES.DAY:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);

      case DATE_RANGES.WEEK:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      case DATE_RANGES.MONTH:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      case DATE_RANGES.YEAR:
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      case DATE_RANGES.ALL:
      default:
        return null;
    }
  }

  /**
   * Get all command variants for given command types
   * Expands command types to include all language variants
   * @param {Array<string>} commandTypes - Array of command type IDs
   * @returns {Array<string>} Array of command variants
   */
  static getCommandVariants(commandTypes) {
    if (!commandTypes || !Array.isArray(commandTypes) || commandTypes.length === 0) {
      return [];
    }

    return getCommandVariantsForTypes(commandTypes);
  }

  /**
   * Validate filter parameters
   * @param {Object} filters - Filter options to validate
   * @returns {Object} Validation result { valid: boolean, errors: Array<string> }
   */
  static validateFilters(filters) {
    const errors = [];

    // Validate search
    if (filters.search !== undefined && filters.search !== null) {
      if (typeof filters.search !== 'string') {
        errors.push('Search must be a string');
      } else if (filters.search.length > 500) {
        errors.push('Search query must be 500 characters or less');
      }
    }

    // Validate date range
    if (filters.dateRange !== undefined && filters.dateRange !== null) {
      const validRanges = Object.values(DATE_RANGES);
      if (!validRanges.includes(filters.dateRange)) {
        errors.push(`Date range must be one of: ${validRanges.join(', ')}`);
      }
    }

    // Validate command types
    if (filters.commandTypes !== undefined && filters.commandTypes !== null) {
      if (!Array.isArray(filters.commandTypes)) {
        errors.push('Command types must be an array');
      } else {
        // Check for valid command type IDs
        const validTypes = [
          'solve',
          'explain',
          'check',
          'example',
          'cheatsheet',
          'test',
          'conspect',
          'plan',
          'essay'
        ];
        const invalidTypes = filters.commandTypes.filter((type) => !validTypes.includes(type));
        if (invalidTypes.length > 0) {
          errors.push(`Invalid command types: ${invalidTypes.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize filter input
   * @param {Object} filters - Raw filter input
   * @returns {Object} Sanitized filters
   */
  static sanitizeFilters(filters) {
    const sanitized = {};

    // Sanitize search
    if (filters.search) {
      sanitized.search = String(filters.search).trim().substring(0, 500);
    }

    // Sanitize date range
    if (filters.dateRange) {
      const validRanges = Object.values(DATE_RANGES);
      sanitized.dateRange = validRanges.includes(filters.dateRange)
        ? filters.dateRange
        : DATE_RANGES.ALL;
    } else {
      sanitized.dateRange = DATE_RANGES.ALL;
    }

    // Sanitize command types
    if (filters.commandTypes && Array.isArray(filters.commandTypes)) {
      const validTypes = [
        'solve',
        'explain',
        'check',
        'example',
        'cheatsheet',
        'test',
        'conspect',
        'plan',
        'essay'
      ];
      sanitized.commandTypes = filters.commandTypes.filter((type) => validTypes.includes(type));
    } else {
      sanitized.commandTypes = [];
    }

    return sanitized;
  }

  /**
   * Build Prisma include clause for session queries
   * @param {boolean} includeMessages - Whether to include messages
   * @returns {Object} Prisma include clause
   */
  static buildIncludeClause(includeMessages = true) {
    if (!includeMessages) {
      return {};
    }

    return {
      messages: {
        select: {
          id: true,
          type: true,
          content: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    };
  }

  /**
   * Build Prisma orderBy clause for session queries
   * @param {string} sortBy - Sort field (default: 'updatedAt')
   * @param {string} sortOrder - Sort order (default: 'desc')
   * @returns {Object} Prisma orderBy clause
   */
  static buildOrderByClause(sortBy = 'updatedAt', sortOrder = 'desc') {
    const validSortFields = ['updatedAt', 'createdAt', 'title', 'messageCount'];
    const validSortOrders = ['asc', 'desc'];

    const field = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    return {
      [field]: order
    };
  }

  /**
   * Calculate pagination parameters
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Object} Pagination parameters { skip, take }
   */
  static calculatePagination(page = 1, limit = 20) {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    return {
      skip: (validPage - 1) * validLimit,
      take: validLimit
    };
  }
}

export default SessionFilterService;
