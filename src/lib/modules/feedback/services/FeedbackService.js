/**
 * FeedbackService - User feedback management
 * Provides operations for submitting and retrieving user feedback on assistant messages
 */

import { db } from '../../../database/index.js';
import { MessageService } from '../../session/services/MessageService.js';

/**
 * Custom error classes for feedback operations
 */
export class FeedbackError extends Error {
  constructor(message, code = 'FEEDBACK_ERROR', details = null) {
    super(message);
    this.name = 'FeedbackError';
    this.code = code;
    this.details = details;
  }
}

export class FeedbackValidationError extends FeedbackError {
  constructor(message, field = null) {
    super(message, 'FEEDBACK_VALIDATION_ERROR', { field });
  }
}

/**
 * FeedbackService class providing all feedback-related operations
 */
export class FeedbackService {
  /**
   * Submit feedback for a message
   * @param {string} messageId - Message ID
   * @param {string} feedbackText - User's feedback text
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated message with feedback
   */
  static async submitFeedback(messageId, feedbackText, userId) {
    // Validate inputs
    if (!messageId || typeof messageId !== 'string') {
      throw new FeedbackValidationError('Message ID is required', 'messageId');
    }

    if (!feedbackText || typeof feedbackText !== 'string' || feedbackText.trim().length === 0) {
      throw new FeedbackValidationError('Feedback text is required', 'feedbackText');
    }

    if (feedbackText.trim().length < 10) {
      throw new FeedbackValidationError(
        'Feedback text must be at least 10 characters',
        'feedbackText'
      );
    }

    if (feedbackText.trim().length > 1000) {
      throw new FeedbackValidationError(
        'Feedback text must not exceed 1000 characters',
        'feedbackText'
      );
    }

    if (!userId || typeof userId !== 'string') {
      throw new FeedbackValidationError('User ID is required', 'userId');
    }

    try {
      // Get existing message
      const message = await MessageService.getMessage(messageId, userId);

      // Check if feedback already exists
      if (message.metadata?.feedback) {
        throw new FeedbackError(
          'Feedback already submitted for this message',
          'FEEDBACK_ALREADY_EXISTS',
          { messageId }
        );
      }

      // Check if message is an assistant message
      if (message.type !== 'assistant') {
        throw new FeedbackError(
          'Feedback can only be submitted for assistant messages',
          'INVALID_MESSAGE_TYPE',
          { messageId, type: message.type }
        );
      }

      // Add feedback to metadata
      const updatedMetadata = {
        ...message.metadata,
        feedback: {
          text: feedbackText.trim(),
          timestamp: new Date().toISOString(),
          userId
        }
      };

      // Update message
      const updatedMessage = await MessageService.updateMessage(
        messageId,
        { metadata: updatedMetadata },
        userId
      );

      console.log(`Feedback submitted for message: ${messageId} by user: ${userId}`);
      return updatedMessage;
    } catch (error) {
      if (error instanceof FeedbackError) {
        throw error;
      }
      throw new FeedbackError(
        `Failed to submit feedback: ${error.message}`,
        'FEEDBACK_SUBMIT_FAILED',
        { messageId, userId }
      );
    }
  }

  /**
   * Get all feedback for admin review
   * @param {Object} filters - Filter options
   * @param {number} filters.page - Page number (1-based)
   * @param {number} filters.limit - Items per page
   * @param {string} filters.model - Filter by model name
   * @param {string} filters.dateFrom - Filter by date range (ISO string)
   * @param {string} filters.dateTo - Filter by date range (ISO string)
   * @returns {Promise<Object>} Paginated feedback results
   */
  static async getAllFeedback(filters = {}) {
    const { page = 1, limit = 50, model = null, dateFrom = null, dateTo = null } = filters;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw new FeedbackValidationError('Invalid pagination parameters', 'pagination');
    }

    const skip = (page - 1) * limit;

    try {
      // Build where clause - find messages with feedback
      const where = {
        type: 'assistant',
        metadata: {
          path: ['feedback'],
          not: null
        }
      };

      // Add date filters if specified
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      // Query messages with feedback
      const [messages, totalCount] = await Promise.all([
        db.message.findMany({
          where,
          include: {
            session: {
              select: {
                id: true,
                title: true,
                userId: true,
                user: {
                  select: {
                    email: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        db.message.count({ where })
      ]);

      // Filter by model if specified (post-query filtering since JSON path filtering is limited)
      let filteredMessages = messages;
      if (model) {
        filteredMessages = messages.filter((msg) => msg.metadata?.llm?.model === model);
      }

      const totalPages = Math.ceil(totalCount / limit);

      return {
        feedback: filteredMessages,
        pagination: {
          page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      throw new FeedbackError(
        `Failed to get feedback: ${error.message}`,
        'FEEDBACK_FETCH_FAILED',
        { filters }
      );
    }
  }

  /**
   * Get feedback statistics
   * @returns {Promise<Object>} Feedback statistics
   */
  static async getFeedbackStats() {
    try {
      // Count total messages with feedback
      const totalFeedback = await db.message.count({
        where: {
          type: 'assistant',
          metadata: {
            path: ['feedback'],
            not: null
          }
        }
      });

      // Get all messages with feedback to analyze
      const messages = await db.message.findMany({
        where: {
          type: 'assistant',
          metadata: {
            path: ['feedback'],
            not: null
          }
        },
        select: {
          metadata: true,
          createdAt: true
        }
      });

      // Group by model
      const byModel = {};
      messages.forEach((msg) => {
        const model = msg.metadata?.llm?.model || 'unknown';
        byModel[model] = (byModel[model] || 0) + 1;
      });

      // Calculate trends
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const lastWeek = messages.filter((msg) => {
        const feedbackDate = new Date(msg.metadata?.feedback?.timestamp || msg.createdAt);
        return feedbackDate >= oneWeekAgo;
      }).length;

      const lastMonth = messages.filter((msg) => {
        const feedbackDate = new Date(msg.metadata?.feedback?.timestamp || msg.createdAt);
        return feedbackDate >= oneMonthAgo;
      }).length;

      return {
        totalFeedback,
        byModel,
        trends: {
          lastWeek,
          lastMonth
        }
      };
    } catch (error) {
      throw new FeedbackError(
        `Failed to get feedback statistics: ${error.message}`,
        'FEEDBACK_STATS_FAILED'
      );
    }
  }
}

export default FeedbackService;
