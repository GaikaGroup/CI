/**
 * SessionService - Core session management operations
 * Provides CRUD operations for sessions with error handling, retry logic, and pagination
 */

import { db } from '../../../database/index.js';
import { dbConfig } from '../../../database/config.js';
import { generateWelcomeMessage } from '../utils/welcomeMessages.js';

/**
 * Custom error classes for better error handling
 */
export class SessionError extends Error {
  constructor(message, code = 'SESSION_ERROR', details = null) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
    this.details = details;
  }
}

export class SessionNotFoundError extends SessionError {
  constructor(sessionId) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', { sessionId });
  }
}

export class SessionValidationError extends SessionError {
  constructor(message, field = null) {
    super(message, 'SESSION_VALIDATION_ERROR', { field });
  }
}

/**
 * Retry configuration for database operations
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds
  backoffFactor: 2,
};

/**
 * Retry wrapper for database operations
 * @param {Function} operation - The database operation to retry
 * @param {Object} config - Retry configuration
 * @returns {Promise} Result of the operation
 */
async function withRetry(operation, config = RETRY_CONFIG) {
  let lastError;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry validation errors or not found errors
      if (error instanceof SessionValidationError || 
          error instanceof SessionNotFoundError ||
          error.code === 'P2025') { // Prisma record not found
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );
      
      console.warn(`Database operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new SessionError(
    `Database operation failed after ${config.maxAttempts} attempts: ${lastError.message}`,
    'DATABASE_RETRY_FAILED',
    { originalError: lastError }
  );
}

/**
 * Validate session data
 * @param {Object} sessionData - Session data to validate
 * @throws {SessionValidationError} If validation fails
 */
function validateSessionData(sessionData) {
  const { title, mode, language, userId } = sessionData;
  
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new SessionValidationError('User ID is required', 'userId');
  }
  
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new SessionValidationError('Session title is required', 'title');
  }
  
  if (title.length > 500) {
    throw new SessionValidationError('Session title must be 500 characters or less', 'title');
  }
  
  if (mode && !['fun', 'learn'].includes(mode)) {
    throw new SessionValidationError('Mode must be either "fun" or "learn"', 'mode');
  }
  
  if (language && (typeof language !== 'string' || language.length > 10)) {
    throw new SessionValidationError('Language must be a valid language code (max 10 characters)', 'language');
  }
}

/**
 * SessionService class providing all session-related database operations
 */
export class SessionService {
  /**
   * Create a new session
   * @param {string} userId - User ID who owns the session
   * @param {string} title - Session title
   * @param {string} mode - Session mode ('fun' or 'learn')
   * @param {string} language - Session language (default: 'en')
   * @param {string} preview - Optional session preview text
   * @param {boolean} createWelcomeMessage - Whether to create a welcome message (default: true)
   * @returns {Promise<Object>} Created session object
   */
  static async createSession(userId, title, mode = 'fun', language = 'en', preview = null, createWelcomeMessage = true) {
    const sessionData = { userId, title, mode, language, preview };
    validateSessionData(sessionData);
    
    return withRetry(async () => {
      try {
        // Create session and optionally add welcome message in a transaction
        const result = await db.$transaction(async (tx) => {
          // Create the session
          let session = await tx.session.create({
            data: {
              userId: userId.trim(),
              title: title.trim(),
              mode,
              language,
              preview: preview?.trim() || null,
            },
          });
          
          // Create welcome message if requested
          if (createWelcomeMessage) {
            const welcomeText = generateWelcomeMessage(mode, language);
            
            await tx.message.create({
              data: {
                sessionId: session.id,
                type: 'assistant',
                content: welcomeText,
                metadata: {
                  isWelcomeMessage: true,
                  timestamp: new Date().toISOString()
                }
              }
            });
            
            // Update session message count and preview
            session = await tx.session.update({
              where: { id: session.id },
              data: {
                messageCount: 1,
                preview: welcomeText.substring(0, 200) // Set preview to welcome message
              }
            });
          }
          
          return session;
        });
        
        console.log(`Session created: ${result.id} for user: ${userId} with welcome message: ${createWelcomeMessage}`);
        return result;
      } catch (error) {
        throw new SessionError(
          `Failed to create session: ${error.message}`,
          'SESSION_CREATE_FAILED',
          { userId, title, mode, language }
        );
      }
    });
  }

  /**
   * Get sessions for a specific user with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Pagination and filtering options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Number of sessions per page
   * @param {string} options.sortBy - Sort field ('updatedAt', 'createdAt', 'title')
   * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
   * @param {string} options.mode - Filter by mode ('fun' or 'learn')
   * @param {string} options.language - Filter by language
   * @param {string} options.dateFrom - Filter sessions from this date (ISO string)
   * @param {string} options.dateTo - Filter sessions to this date (ISO string)
   * @returns {Promise<Object>} Paginated sessions result
   */
  static async getUserSessions(userId, options = {}) {
    if (!userId || typeof userId !== 'string') {
      throw new SessionValidationError('User ID is required', 'userId');
    }
    
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      mode = null,
      language = null,
      dateFrom = null,
      dateTo = null,
    } = options;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw new SessionValidationError('Invalid pagination parameters', 'pagination');
    }
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };
    
    // Build where clause with filters
    const where = { userId };
    if (mode) where.mode = mode;
    if (language) where.language = language;
    
    // Add date range filtering
    if (dateFrom || dateTo) {
      where.updatedAt = {};
      if (dateFrom) where.updatedAt.gte = new Date(dateFrom);
      if (dateTo) where.updatedAt.lte = new Date(dateTo);
    }
    
    return withRetry(async () => {
      try {
        const [sessions, totalCount] = await Promise.all([
          db.session.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
              _count: {
                select: { messages: true }
              }
            }
          }),
          db.session.count({ where })
        ]);
        
        // Update messageCount for sessions where it might be out of sync
        const sessionsWithCorrectCount = sessions.map(session => ({
          ...session,
          messageCount: session._count.messages,
          _count: undefined, // Remove the _count field from response
        }));
        
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;
        
        return {
          sessions: sessionsWithCorrectCount,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage,
            hasPreviousPage,
          },
        };
      } catch (error) {
        throw new SessionError(
          `Failed to get user sessions: ${error.message}`,
          'SESSION_FETCH_FAILED',
          { userId, options }
        );
      }
    });
  }

  /**
   * Get a specific session by ID
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @param {boolean} includeMessages - Whether to include messages
   * @returns {Promise<Object>} Session object
   */
  static async getSession(sessionId, userId, includeMessages = false) {
    if (!sessionId || !userId) {
      throw new SessionValidationError('Session ID and User ID are required');
    }
    
    return withRetry(async () => {
      try {
        const session = await db.session.findFirst({
          where: {
            id: sessionId,
            userId, // Ensure user can only access their own sessions
          },
          include: {
            messages: includeMessages ? {
              orderBy: { createdAt: 'asc' }
            } : false,
            _count: {
              select: { messages: true }
            }
          }
        });
        
        if (!session) {
          throw new SessionNotFoundError(sessionId);
        }
        
        // Update messageCount if it's out of sync
        if (session.messageCount !== session._count.messages) {
          await db.session.update({
            where: { id: sessionId },
            data: { messageCount: session._count.messages }
          });
          session.messageCount = session._count.messages;
        }
        
        // Remove _count from response
        delete session._count;
        
        return session;
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          throw error;
        }
        throw new SessionError(
          `Failed to get session: ${error.message}`,
          'SESSION_FETCH_FAILED',
          { sessionId, userId }
        );
      }
    });
  }

  /**
   * Update a session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated session object
   */
  static async updateSession(sessionId, userId, updates) {
    if (!sessionId || !userId) {
      throw new SessionValidationError('Session ID and User ID are required');
    }
    
    // Validate update data
    const allowedFields = ['title', 'preview', 'mode', 'language'];
    const updateData = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateData[key] = value;
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new SessionValidationError('No valid fields to update');
    }
    
    // Validate the update data
    if (updateData.title !== undefined) {
      validateSessionData({ ...updateData, userId });
    }
    
    return withRetry(async () => {
      try {
        // First check if session exists and belongs to user
        const existingSession = await db.session.findFirst({
          where: { id: sessionId, userId }
        });
        
        if (!existingSession) {
          throw new SessionNotFoundError(sessionId);
        }
        
        const updatedSession = await db.session.update({
          where: { id: sessionId },
          data: updateData,
        });
        
        console.log(`Session updated: ${sessionId} by user: ${userId}`);
        return updatedSession;
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          throw error;
        }
        throw new SessionError(
          `Failed to update session: ${error.message}`,
          'SESSION_UPDATE_FAILED',
          { sessionId, userId, updates }
        );
      }
    });
  }

  /**
   * Delete a session and all its messages
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteSession(sessionId, userId) {
    if (!sessionId || !userId) {
      throw new SessionValidationError('Session ID and User ID are required');
    }
    
    return withRetry(async () => {
      try {
        // First check if session exists and belongs to user
        const existingSession = await db.session.findFirst({
          where: { id: sessionId, userId }
        });
        
        if (!existingSession) {
          throw new SessionNotFoundError(sessionId);
        }
        
        // Delete session (messages will be deleted automatically due to CASCADE)
        await db.session.delete({
          where: { id: sessionId }
        });
        
        console.log(`Session deleted: ${sessionId} by user: ${userId}`);
        return true;
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          throw error;
        }
        throw new SessionError(
          `Failed to delete session: ${error.message}`,
          'SESSION_DELETE_FAILED',
          { sessionId, userId }
        );
      }
    });
  }

  /**
   * Search sessions by title and preview content
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Pagination and filtering options
   * @param {string} options.mode - Filter by mode ('fun' or 'learn')
   * @param {string} options.language - Filter by language
   * @param {string} options.dateFrom - Filter sessions from this date (ISO string)
   * @param {string} options.dateTo - Filter sessions to this date (ISO string)
   * @returns {Promise<Object>} Paginated search results with highlighting info
   */
  static async searchSessions(userId, query, options = {}) {
    if (!userId || typeof userId !== 'string') {
      throw new SessionValidationError('User ID is required', 'userId');
    }
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new SessionValidationError('Search query is required', 'query');
    }
    
    const {
      page = 1,
      limit = 20,
      mode = null,
      language = null,
      dateFrom = null,
      dateTo = null,
    } = options;
    
    if (page < 1 || limit < 1 || limit > 100) {
      throw new SessionValidationError('Invalid pagination parameters', 'pagination');
    }
    
    const skip = (page - 1) * limit;
    const searchTerm = query.trim();
    
    // Build where clause with full-text search
    const where = {
      userId,
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { preview: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };
    
    if (mode) where.mode = mode;
    if (language) where.language = language;
    
    // Add date range filtering
    if (dateFrom || dateTo) {
      where.updatedAt = {};
      if (dateFrom) where.updatedAt.gte = new Date(dateFrom);
      if (dateTo) where.updatedAt.lte = new Date(dateTo);
    }
    
    return withRetry(async () => {
      try {
        const [sessions, totalCount] = await Promise.all([
          db.session.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit,
            include: {
              _count: {
                select: { messages: true }
              }
            }
          }),
          db.session.count({ where })
        ]);
        
        // Add highlighting information to sessions
        const sessionsWithHighlighting = sessions.map(session => {
          const titleMatch = session.title.toLowerCase().includes(searchTerm.toLowerCase());
          const previewMatch = session.preview?.toLowerCase().includes(searchTerm.toLowerCase());
          
          return {
            ...session,
            messageCount: session._count.messages,
            _count: undefined,
            _searchMeta: {
              matchedIn: {
                title: titleMatch,
                preview: previewMatch,
              },
              searchTerm,
            },
          };
        });
        
        const totalPages = Math.ceil(totalCount / limit);
        
        return {
          sessions: sessionsWithHighlighting,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
          query: searchTerm,
        };
      } catch (error) {
        throw new SessionError(
          `Failed to search sessions: ${error.message}`,
          'SESSION_SEARCH_FAILED',
          { userId, query, options }
        );
      }
    });
  }

  /**
   * Get session statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Session statistics
   */
  static async getSessionStats(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new SessionValidationError('User ID is required', 'userId');
    }
    
    return withRetry(async () => {
      try {
        const [totalSessions, funSessions, learnSessions, totalMessages] = await Promise.all([
          db.session.count({ where: { userId } }),
          db.session.count({ where: { userId, mode: 'fun' } }),
          db.session.count({ where: { userId, mode: 'learn' } }),
          db.message.count({
            where: {
              session: { userId }
            }
          })
        ]);
        
        const recentSession = await db.session.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        });
        
        return {
          totalSessions,
          funSessions,
          learnSessions,
          totalMessages,
          lastActivity: recentSession?.updatedAt || null,
        };
      } catch (error) {
        throw new SessionError(
          `Failed to get session statistics: ${error.message}`,
          'SESSION_STATS_FAILED',
          { userId }
        );
      }
    });
  }

  /**
   * Update message count for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<number>} Updated message count
   */
  static async updateMessageCount(sessionId) {
    if (!sessionId) {
      throw new SessionValidationError('Session ID is required');
    }
    
    return withRetry(async () => {
      try {
        const messageCount = await db.message.count({
          where: { sessionId }
        });
        
        await db.session.update({
          where: { id: sessionId },
          data: { messageCount }
        });
        
        return messageCount;
      } catch (error) {
        throw new SessionError(
          `Failed to update message count: ${error.message}`,
          'MESSAGE_COUNT_UPDATE_FAILED',
          { sessionId }
        );
      }
    });
  }
}

export default SessionService;