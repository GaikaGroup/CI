/**
 * MessageService - Message persistence and management operations
 * Provides CRUD operations for messages with error handling, retry logic, and pagination
 */

import { db } from '../../../database/index.js';
import { SessionService, SessionError, SessionNotFoundError, SessionValidationError } from './SessionService.js';

/**
 * Custom error classes for message operations
 */
export class MessageError extends Error {
  constructor(message, code = 'MESSAGE_ERROR', details = null) {
    super(message);
    this.name = 'MessageError';
    this.code = code;
    this.details = details;
  }
}

export class MessageNotFoundError extends MessageError {
  constructor(messageId) {
    super(`Message not found: ${messageId}`, 'MESSAGE_NOT_FOUND', { messageId });
  }
}

export class MessageValidationError extends MessageError {
  constructor(message, field = null) {
    super(message, 'MESSAGE_VALIDATION_ERROR', { field });
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
      if (error instanceof MessageValidationError || 
          error instanceof MessageNotFoundError ||
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
  
  throw new MessageError(
    `Database operation failed after ${config.maxAttempts} attempts: ${lastError.message}`,
    'DATABASE_RETRY_FAILED',
    { originalError: lastError }
  );
}

/**
 * Validate message data
 * @param {Object} messageData - Message data to validate
 * @throws {MessageValidationError} If validation fails
 */
function validateMessageData(messageData) {
  const { sessionId, type, content } = messageData;
  
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    throw new MessageValidationError('Session ID is required', 'sessionId');
  }
  
  if (!type || !['user', 'assistant'].includes(type)) {
    throw new MessageValidationError('Message type must be either "user" or "assistant"', 'type');
  }
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new MessageValidationError('Message content is required', 'content');
  }
  
  if (content.length > 50000) { // 50KB limit for message content
    throw new MessageValidationError('Message content is too long (max 50,000 characters)', 'content');
  }
}

/**
 * Validate message metadata
 * @param {Object} metadata - Metadata object to validate
 * @throws {MessageValidationError} If validation fails
 */
function validateMetadata(metadata) {
  if (!metadata) return;
  
  if (typeof metadata !== 'object') {
    throw new MessageValidationError('Metadata must be an object', 'metadata');
  }
  
  // Validate specific metadata fields
  if (metadata.audioUrl && typeof metadata.audioUrl !== 'string') {
    throw new MessageValidationError('Audio URL must be a string', 'metadata.audioUrl');
  }
  
  if (metadata.imageUrl && typeof metadata.imageUrl !== 'string') {
    throw new MessageValidationError('Image URL must be a string', 'metadata.imageUrl');
  }
  
  if (metadata.language && (typeof metadata.language !== 'string' || metadata.language.length > 10)) {
    throw new MessageValidationError('Language must be a valid language code (max 10 characters)', 'metadata.language');
  }
  
  if (metadata.timestamp && !(metadata.timestamp instanceof Date) && typeof metadata.timestamp !== 'string') {
    throw new MessageValidationError('Timestamp must be a Date object or ISO string', 'metadata.timestamp');
  }
}

/**
 * MessageService class providing all message-related database operations
 */
export class MessageService {
  /**
   * Add a new message to a session
   * @param {string} sessionId - Session ID
   * @param {string} type - Message type ('user' or 'assistant')
   * @param {string} content - Message content
   * @param {Object} metadata - Optional metadata (audio, images, timestamps, etc.)
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Created message object
   */
  static async addMessage(sessionId, type, content, metadata = null, userId = null) {
    const messageData = { sessionId, type, content };
    validateMessageData(messageData);
    validateMetadata(metadata);
    
    return withRetry(async () => {
      try {
        // Verify session exists and user has access (if userId provided)
        if (userId) {
          await SessionService.getSession(sessionId, userId, false);
        } else {
          const session = await db.session.findUnique({
            where: { id: sessionId },
            select: { id: true }
          });
          if (!session) {
            throw new SessionNotFoundError(sessionId);
          }
        }
        
        // Create message and update session in a transaction
        const result = await db.$transaction(async (tx) => {
          // Create the message
          const message = await tx.message.create({
            data: {
              sessionId: sessionId.trim(),
              type,
              content: content.trim(),
              metadata: metadata || undefined,
            },
          });
          
          // Update session's updatedAt timestamp and message count
          await tx.session.update({
            where: { id: sessionId },
            data: {
              updatedAt: new Date(),
              messageCount: {
                increment: 1
              }
            },
          });
          
          return message;
        });
        
        console.log(`Message added to session: ${sessionId}, type: ${type}`);
        return result;
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          throw error;
        }
        throw new MessageError(
          `Failed to add message: ${error.message}`,
          'MESSAGE_CREATE_FAILED',
          { sessionId, type, content: content?.substring(0, 100) }
        );
      }
    });
  }

  /**
   * Get messages for a session with pagination
   * @param {string} sessionId - Session ID
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Number of messages per page
   * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
   * @param {string} options.type - Filter by message type ('user' or 'assistant')
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Paginated messages result
   */
  static async getSessionMessages(sessionId, options = {}, userId = null) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new MessageValidationError('Session ID is required', 'sessionId');
    }
    
    const {
      page = 1,
      limit = 50,
      sortOrder = 'asc',
      type = null,
    } = options;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 200) {
      throw new MessageValidationError('Invalid pagination parameters', 'pagination');
    }
    
    const skip = (page - 1) * limit;
    const orderBy = { createdAt: sortOrder };
    
    // Build where clause
    const where = { sessionId };
    if (type) where.type = type;
    
    return withRetry(async () => {
      try {
        // Verify session exists and user has access (if userId provided)
        if (userId) {
          await SessionService.getSession(sessionId, userId, false);
        }
        
        const [messages, totalCount] = await Promise.all([
          db.message.findMany({
            where,
            orderBy,
            skip,
            take: limit,
          }),
          db.message.count({ where })
        ]);
        
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;
        
        return {
          messages,
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
        if (error instanceof SessionNotFoundError) {
          throw error;
        }
        throw new MessageError(
          `Failed to get session messages: ${error.message}`,
          'MESSAGE_FETCH_FAILED',
          { sessionId, options }
        );
      }
    });
  }

  /**
   * Get a specific message by ID
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Message object
   */
  static async getMessage(messageId, userId = null) {
    if (!messageId || typeof messageId !== 'string') {
      throw new MessageValidationError('Message ID is required', 'messageId');
    }
    
    return withRetry(async () => {
      try {
        const message = await db.message.findUnique({
          where: { id: messageId },
          include: {
            session: userId ? {
              select: { userId: true }
            } : false
          }
        });
        
        if (!message) {
          throw new MessageNotFoundError(messageId);
        }
        
        // Check user authorization if userId provided
        if (userId && message.session && message.session.userId !== userId) {
          throw new MessageError('Access denied', 'MESSAGE_ACCESS_DENIED', { messageId, userId });
        }
        
        // Remove session data from response
        if (message.session) {
          delete message.session;
        }
        
        return message;
      } catch (error) {
        if (error instanceof MessageNotFoundError || error.code === 'MESSAGE_ACCESS_DENIED') {
          throw error;
        }
        throw new MessageError(
          `Failed to get message: ${error.message}`,
          'MESSAGE_FETCH_FAILED',
          { messageId, userId }
        );
      }
    });
  }

  /**
   * Update a message
   * @param {string} messageId - Message ID
   * @param {Object} updates - Fields to update
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Updated message object
   */
  static async updateMessage(messageId, updates, userId = null) {
    if (!messageId || typeof messageId !== 'string') {
      throw new MessageValidationError('Message ID is required', 'messageId');
    }
    
    // Validate update data
    const allowedFields = ['content', 'metadata'];
    const updateData = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateData[key] = value;
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new MessageValidationError('No valid fields to update');
    }
    
    // Validate the update data
    if (updateData.content !== undefined) {
      if (!updateData.content || typeof updateData.content !== 'string' || updateData.content.trim().length === 0) {
        throw new MessageValidationError('Message content is required', 'content');
      }
      if (updateData.content.length > 50000) {
        throw new MessageValidationError('Message content is too long (max 50,000 characters)', 'content');
      }
      updateData.content = updateData.content.trim();
    }
    
    if (updateData.metadata !== undefined) {
      validateMetadata(updateData.metadata);
    }
    
    return withRetry(async () => {
      try {
        // First check if message exists and user has access
        const existingMessage = await db.message.findUnique({
          where: { id: messageId },
          include: {
            session: userId ? {
              select: { userId: true }
            } : false
          }
        });
        
        if (!existingMessage) {
          throw new MessageNotFoundError(messageId);
        }
        
        // Check user authorization if userId provided
        if (userId && existingMessage.session && existingMessage.session.userId !== userId) {
          throw new MessageError('Access denied', 'MESSAGE_ACCESS_DENIED', { messageId, userId });
        }
        
        const updatedMessage = await db.message.update({
          where: { id: messageId },
          data: updateData,
        });
        
        console.log(`Message updated: ${messageId} by user: ${userId || 'system'}`);
        return updatedMessage;
      } catch (error) {
        if (error instanceof MessageNotFoundError || error.code === 'MESSAGE_ACCESS_DENIED') {
          throw error;
        }
        throw new MessageError(
          `Failed to update message: ${error.message}`,
          'MESSAGE_UPDATE_FAILED',
          { messageId, userId, updates }
        );
      }
    });
  }

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteMessage(messageId, userId = null) {
    if (!messageId || typeof messageId !== 'string') {
      throw new MessageValidationError('Message ID is required', 'messageId');
    }
    
    return withRetry(async () => {
      try {
        // First check if message exists and user has access
        const existingMessage = await db.message.findUnique({
          where: { id: messageId },
          include: {
            session: userId ? {
              select: { userId: true, id: true }
            } : {
              select: { id: true }
            }
          }
        });
        
        if (!existingMessage) {
          throw new MessageNotFoundError(messageId);
        }
        
        // Check user authorization if userId provided
        if (userId && existingMessage.session && existingMessage.session.userId !== userId) {
          throw new MessageError('Access denied', 'MESSAGE_ACCESS_DENIED', { messageId, userId });
        }
        
        const sessionId = existingMessage.session.id;
        
        // Delete message and update session message count in a transaction
        await db.$transaction(async (tx) => {
          await tx.message.delete({
            where: { id: messageId }
          });
          
          await tx.session.update({
            where: { id: sessionId },
            data: {
              messageCount: {
                decrement: 1
              }
            }
          });
        });
        
        console.log(`Message deleted: ${messageId} by user: ${userId || 'system'}`);
        return true;
      } catch (error) {
        if (error instanceof MessageNotFoundError || error.code === 'MESSAGE_ACCESS_DENIED') {
          throw error;
        }
        throw new MessageError(
          `Failed to delete message: ${error.message}`,
          'MESSAGE_DELETE_FAILED',
          { messageId, userId }
        );
      }
    });
  }

  /**
   * Get recent messages across all user sessions
   * @param {string} userId - User ID
   * @param {number} limit - Number of recent messages to retrieve
   * @returns {Promise<Array>} Array of recent messages with session info
   */
  static async getRecentMessages(userId, limit = 10) {
    if (!userId || typeof userId !== 'string') {
      throw new MessageValidationError('User ID is required', 'userId');
    }
    
    if (limit < 1 || limit > 100) {
      throw new MessageValidationError('Limit must be between 1 and 100', 'limit');
    }
    
    return withRetry(async () => {
      try {
        const messages = await db.message.findMany({
          where: {
            session: {
              userId
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            session: {
              select: {
                id: true,
                title: true,
                mode: true,
                language: true
              }
            }
          }
        });
        
        return messages;
      } catch (error) {
        throw new MessageError(
          `Failed to get recent messages: ${error.message}`,
          'RECENT_MESSAGES_FAILED',
          { userId, limit }
        );
      }
    });
  }

  /**
   * Search messages by content
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Number of messages per page
   * @param {string} options.sessionId - Filter by specific session
   * @param {string} options.type - Filter by message type
   * @returns {Promise<Object>} Paginated search results
   */
  static async searchMessages(userId, query, options = {}) {
    if (!userId || typeof userId !== 'string') {
      throw new MessageValidationError('User ID is required', 'userId');
    }
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new MessageValidationError('Search query is required', 'query');
    }
    
    const {
      page = 1,
      limit = 20,
      sessionId = null,
      type = null,
    } = options;
    
    if (page < 1 || limit < 1 || limit > 100) {
      throw new MessageValidationError('Invalid pagination parameters', 'pagination');
    }
    
    const skip = (page - 1) * limit;
    const searchTerm = query.trim();
    
    // Build where clause
    const where = {
      session: { userId },
      content: { contains: searchTerm, mode: 'insensitive' },
    };
    
    if (sessionId) where.sessionId = sessionId;
    if (type) where.type = type;
    
    return withRetry(async () => {
      try {
        const [messages, totalCount] = await Promise.all([
          db.message.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  mode: true,
                  language: true
                }
              }
            }
          }),
          db.message.count({ where })
        ]);
        
        const totalPages = Math.ceil(totalCount / limit);
        
        return {
          messages,
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
        throw new MessageError(
          `Failed to search messages: ${error.message}`,
          'MESSAGE_SEARCH_FAILED',
          { userId, query, options }
        );
      }
    });
  }

  /**
   * Get message statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Message statistics
   */
  static async getMessageStats(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new MessageValidationError('User ID is required', 'userId');
    }
    
    return withRetry(async () => {
      try {
        const [totalMessages, userMessages, assistantMessages] = await Promise.all([
          db.message.count({
            where: { session: { userId } }
          }),
          db.message.count({
            where: { session: { userId }, type: 'user' }
          }),
          db.message.count({
            where: { session: { userId }, type: 'assistant' }
          })
        ]);
        
        const recentMessage = await db.message.findFirst({
          where: { session: { userId } },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });
        
        return {
          totalMessages,
          userMessages,
          assistantMessages,
          lastMessage: recentMessage?.createdAt || null,
        };
      } catch (error) {
        throw new MessageError(
          `Failed to get message statistics: ${error.message}`,
          'MESSAGE_STATS_FAILED',
          { userId }
        );
      }
    });
  }

  /**
   * Bulk delete messages from a session
   * @param {string} sessionId - Session ID
   * @param {Array<string>} messageIds - Array of message IDs to delete
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<number>} Number of messages deleted
   */
  static async bulkDeleteMessages(sessionId, messageIds, userId = null) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new MessageValidationError('Session ID is required', 'sessionId');
    }
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new MessageValidationError('Message IDs array is required', 'messageIds');
    }
    
    if (messageIds.length > 100) {
      throw new MessageValidationError('Cannot delete more than 100 messages at once', 'messageIds');
    }
    
    return withRetry(async () => {
      try {
        // Verify session exists and user has access (if userId provided)
        if (userId) {
          await SessionService.getSession(sessionId, userId, false);
        }
        
        // Delete messages and update session message count in a transaction
        const result = await db.$transaction(async (tx) => {
          const deleteResult = await tx.message.deleteMany({
            where: {
              id: { in: messageIds },
              sessionId: sessionId
            }
          });
          
          await tx.session.update({
            where: { id: sessionId },
            data: {
              messageCount: {
                decrement: deleteResult.count
              }
            }
          });
          
          return deleteResult.count;
        });
        
        console.log(`Bulk deleted ${result} messages from session: ${sessionId} by user: ${userId || 'system'}`);
        return result;
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          throw error;
        }
        throw new MessageError(
          `Failed to bulk delete messages: ${error.message}`,
          'MESSAGE_BULK_DELETE_FAILED',
          { sessionId, messageIds: messageIds.length, userId }
        );
      }
    });
  }
}

export default MessageService;