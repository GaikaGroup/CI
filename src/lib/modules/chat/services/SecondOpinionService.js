/**
 * Second Opinion Service
 *
 * Main service for managing second opinion requests, provider selection,
 * context retrieval, and opinion generation.
 */

import { prisma } from '$lib/database/client.js';
import { ensureProviderManager } from '$lib/modules/llm/ensureProviderManager.js';
import { divergenceDetector } from './DivergenceDetector.js';
import { providerSelectionStrategy } from './ProviderSelectionStrategy.js';
import { SECOND_OPINION_CONFIG, getErrorMessage } from '$lib/config/secondOpinion.js';

/**
 * SecondOpinionService class
 */
export class SecondOpinionService {
  constructor() {
    this.config = SECOND_OPINION_CONFIG;
    this.providerManager = null; // Will be initialized lazily
    this.rateLimitCache = new Map(); // Cache for rate limit checks
  }

  /**
   * Get or initialize provider manager
   * @returns {Promise<ProviderManager>}
   */
  async getProviderManager() {
    if (!this.providerManager) {
      this.providerManager = await ensureProviderManager();
    }
    return this.providerManager;
  }

  /**
   * Request a second opinion for a message
   * @param {string} messageId - ID of the primary message
   * @param {string} sessionId - Session ID for context
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Second opinion response
   */
  async requestSecondOpinion(messageId, sessionId, options = {}) {
    if (!this.config.ENABLED) {
      throw new Error('Second opinion feature is disabled');
    }

    const { userId, provider: manualProvider, model: manualModel, language = 'en' } = options;

    try {
      // 1. Validate request
      await this.validateRequest(messageId, sessionId, userId);

      // 2. Check rate limits
      const rateLimitOk = await this.checkRateLimit(userId);
      if (!rateLimitOk) {
        throw new Error(getErrorMessage('RATE_LIMIT_EXCEEDED', language));
      }

      // 3. Get primary message and context
      const { primaryMessage, context } = await this.getMessageContext(messageId, sessionId);

      // 4. Select alternative provider
      const primaryProvider = primaryMessage.metadata?.provider || 'ollama';

      // Force OpenAI if primary was Ollama, force Ollama if primary was OpenAI
      const selectedProvider = primaryProvider === 'ollama' ? 'openai' : 'ollama';

      console.log('[SecondOpinion] Provider selection:', {
        primary: primaryProvider,
        selected: selectedProvider
      });

      // 5. Generate second opinion
      const opinionResponse = await this.generateOpinion(
        context,
        selectedProvider,
        manualModel,
        language
      );

      // 6. Detect divergence
      const divergence = this.config.DIVERGENCE.ENABLED
        ? divergenceDetector.analyze(primaryMessage.content, opinionResponse.content)
        : null;

      // 7. Store in database
      const secondOpinion = await this.storeSecondOpinion({
        primaryMessageId: messageId,
        opinionContent: opinionResponse.content,
        sessionId,
        userId,
        primaryProvider: primaryMessage.metadata?.provider || 'openai',
        primaryModel: primaryMessage.metadata?.model || null,
        opinionProvider: opinionResponse.provider,
        opinionModel: opinionResponse.model,
        divergence,
        requestType: manualProvider ? 'manual' : 'automatic',
        llmMetadata: opinionResponse.llmMetadata
      });

      // 8. Return response
      const responseData = {
        opinionId: secondOpinion.id,
        messageId: secondOpinion.opinionMessageId,
        content: opinionResponse.content,
        provider: opinionResponse.provider,
        model: opinionResponse.model,
        divergence: divergence
          ? {
              level: divergence.divergenceLevel,
              differences: divergence.differences,
              suggestedQuestions: divergence.suggestedQuestions
            }
          : null,
        llmMetadata: opinionResponse.llmMetadata
      };

      console.log('[SecondOpinion] Returning response:', {
        opinionId: responseData.opinionId,
        messageId: responseData.messageId,
        contentLength: responseData.content?.length || 0,
        hasContent: !!responseData.content,
        provider: responseData.provider,
        model: responseData.model
      });

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      console.error('[SecondOpinion] Request failed:', error);
      throw error;
    }
  }

  /**
   * Validate second opinion request
   * @param {string} messageId - Message ID
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @throws {Error} If validation fails
   */
  async validateRequest(messageId, sessionId, userId) {
    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { session: true }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if message belongs to session
    if (message.sessionId !== sessionId) {
      throw new Error('Message does not belong to session');
    }

    // Check if user owns the session
    if (message.session.userId !== userId) {
      throw new Error('Unauthorized: Session does not belong to user');
    }

    // Check if message is an assistant message
    if (message.type !== 'assistant') {
      throw new Error('Can only request second opinion for assistant messages');
    }
  }

  /**
   * Check rate limits for user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user can request more opinions
   */
  async checkRateLimit(userId) {
    if (!this.config.RATE_LIMIT.ENABLED) {
      return true;
    }

    const now = Date.now();
    const hourAgo = now - this.config.RATE_LIMIT.HOUR_WINDOW;
    const dayAgo = now - this.config.RATE_LIMIT.DAY_WINDOW;

    // Check cache first
    const cacheKey = `rate_limit_${userId}`;
    const cached = this.rateLimitCache.get(cacheKey);
    if (cached && now - cached.timestamp < this.config.PERFORMANCE.CACHE_RATE_LIMIT_TTL * 1000) {
      return cached.allowed;
    }

    // Count opinions in last hour and day
    const [hourCount, dayCount] = await Promise.all([
      prisma.secondOpinion.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(hourAgo)
          }
        }
      }),
      prisma.secondOpinion.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(dayAgo)
          }
        }
      })
    ]);

    const allowed =
      hourCount < this.config.RATE_LIMIT.MAX_REQUESTS_PER_HOUR &&
      dayCount < this.config.RATE_LIMIT.MAX_REQUESTS_PER_DAY;

    // Cache result
    this.rateLimitCache.set(cacheKey, {
      allowed,
      timestamp: now,
      hourCount,
      dayCount
    });

    if (!allowed) {
      console.log(
        `[SecondOpinion] Rate limit exceeded for user ${userId}: ${hourCount}/hour, ${dayCount}/day`
      );
    }

    return allowed;
  }

  /**
   * Get message context for second opinion
   * @param {string} messageId - Message ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Context object with message and history
   */
  async getMessageContext(messageId, sessionId) {
    // Get primary message
    const primaryMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        session: {
          include: {
            course: true
          }
        }
      }
    });

    if (!primaryMessage) {
      throw new Error('Primary message not found');
    }

    // Get conversation history up to this message
    const messages = await prisma.message.findMany({
      where: {
        sessionId,
        createdAt: {
          lte: primaryMessage.createdAt
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 20 // Limit to last 20 messages for context
    });

    // Build context for LLM
    const context = {
      messages: messages.map((m) => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      session: {
        id: primaryMessage.session.id,
        language: primaryMessage.session.language,
        mode: primaryMessage.session.mode,
        courseId: primaryMessage.session.courseId
      },
      course: primaryMessage.session.course
        ? {
            id: primaryMessage.session.course.id,
            name: primaryMessage.session.course.name,
            language: primaryMessage.session.course.language
          }
        : null
    };

    return { primaryMessage, context };
  }

  /**
   * Select an alternative provider
   * @param {string} primaryProvider - Provider used for primary response
   * @param {string} manualProvider - Optional manual selection
   * @param {Object} context - Selection context
   * @returns {Promise<string>} Selected provider name
   */
  async selectAlternativeProvider(primaryProvider, manualProvider = null, context = {}) {
    const providerManager = await this.getProviderManager();

    // If manual selection is provided and allowed
    if (manualProvider && this.config.ALLOW_MANUAL_SELECTION) {
      // Validate that manual provider is available and different
      const available = await providerManager.isProviderAvailable(manualProvider);
      if (!available) {
        throw new Error(getErrorMessage('PROVIDER_UNAVAILABLE', context.language || 'en'));
      }
      if (manualProvider === primaryProvider) {
        throw new Error('Manual provider cannot be the same as primary provider');
      }
      return manualProvider;
    }

    // Get available providers
    const allProviders = providerManager.listProviders();
    const availableProviders = [];

    for (const provider of allProviders) {
      const isAvailable = await providerManager.isProviderAvailable(provider);
      if (isAvailable) {
        availableProviders.push(provider);
      }
    }

    if (availableProviders.length === 0) {
      throw new Error(getErrorMessage('NO_ALTERNATIVE_PROVIDERS', context.language || 'en'));
    }

    // Use selection strategy
    return providerSelectionStrategy.select(availableProviders, primaryProvider, context);
  }

  /**
   * Generate second opinion using selected provider
   * @param {Object} context - Message context
   * @param {string} provider - Provider to use
   * @param {string} model - Optional specific model
   * @param {string} language - Language code
   * @returns {Promise<Object>} Generated opinion
   */
  async generateOpinion(context, provider, model = null, language = 'en') {
    try {
      const providerManager = await this.getProviderManager();

      const options = {
        provider,
        language,
        ...(model && { model })
      };

      console.log('[SecondOpinion] Generating with context:', {
        messageCount: context.messages?.length || 0,
        provider,
        model,
        language,
        firstMessage: context.messages?.[0]?.content?.substring(0, 50),
        lastMessage: context.messages?.[context.messages.length - 1]?.content?.substring(0, 50)
      });

      // Add timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(getErrorMessage('TIMEOUT', language)));
        }, this.config.PERFORMANCE.GENERATION_TIMEOUT);
      });

      // Generate with timeout
      const generationPromise = providerManager.generateChatCompletion(context.messages, options);

      const response = await Promise.race([generationPromise, timeoutPromise]);

      console.log('[SecondOpinion] Raw response received:', {
        provider: response.provider,
        model: response.model,
        hasContent: !!response.content,
        hasText: !!response.text,
        hasRaw: !!response.raw,
        rawMessageContent: response.raw?.message?.content,
        responseKeys: Object.keys(response)
      });

      // Extract content - different providers use different field names
      const content = response.content || response.text || response.raw?.message?.content || '';

      console.log('[SecondOpinion] Extracted content:', {
        provider: response.provider,
        model: response.model,
        contentLength: content.length,
        hasContent: !!content,
        contentPreview: content.substring(0, 100)
      });

      if (!content || content.trim() === '') {
        console.error('[SecondOpinion] Empty content received from provider:', {
          provider: response.provider,
          model: response.model,
          fullResponse: JSON.stringify(response, null, 2)
        });
        throw new Error('Provider returned empty response');
      }

      return {
        content,
        provider: response.provider || provider,
        model: response.model || model || 'unknown',
        llmMetadata: response.llmMetadata || null
      };
    } catch (error) {
      console.error('[SecondOpinion] Generation failed:', error);
      throw new Error(getErrorMessage('GENERATION_FAILED', language));
    }
  }

  /**
   * Store second opinion in database
   * @param {Object} data - Opinion data
   * @returns {Promise<Object>} Created second opinion record
   */
  async storeSecondOpinion(data) {
    const {
      primaryMessageId,
      opinionContent,
      sessionId,
      userId,
      primaryProvider,
      primaryModel,
      opinionProvider,
      opinionModel,
      divergence,
      requestType,
      llmMetadata
    } = data;

    // Create opinion message first
    const opinionMessage = await prisma.message.create({
      data: {
        sessionId,
        type: 'assistant',
        content: opinionContent,
        metadata: {
          isSecondOpinion: true,
          primaryMessageId,
          provider: opinionProvider,
          model: opinionModel,
          divergenceLevel: divergence?.divergenceLevel || null,
          llmMetadata
        }
      }
    });

    // Create second opinion record
    const secondOpinion = await prisma.secondOpinion.create({
      data: {
        primaryMessageId,
        opinionMessageId: opinionMessage.id,
        sessionId,
        userId,
        primaryProvider,
        opinionProvider,
        primaryModel,
        opinionModel,
        divergenceLevel: divergence?.divergenceLevel || null,
        divergenceData: divergence
          ? {
              similarity: divergence.similarity,
              differences: divergence.differences,
              suggestedQuestions: divergence.suggestedQuestions,
              metadata: divergence.metadata
            }
          : null,
        requestType
      }
    });

    console.log('[SecondOpinion] Stored in database:', {
      opinionId: secondOpinion.id,
      messageId: opinionMessage.id,
      contentLength: opinionContent.length,
      provider: opinionProvider,
      model: opinionModel
    });

    // Return with content from opinionMessage
    return {
      ...secondOpinion,
      content: opinionMessage.content
    };
  }

  /**
   * Get second opinions for a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} List of second opinions
   */
  async getSecondOpinions(messageId) {
    const opinions = await prisma.secondOpinion.findMany({
      where: {
        primaryMessageId: messageId
      },
      include: {
        opinionMessage: true,
        feedback: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return opinions.map((opinion) => ({
      id: opinion.id,
      messageId: opinion.opinionMessageId,
      content: opinion.opinionMessage.content,
      provider: opinion.opinionProvider,
      model: opinion.opinionModel,
      divergenceLevel: opinion.divergenceLevel,
      divergenceData: opinion.divergenceData,
      requestType: opinion.requestType,
      createdAt: opinion.createdAt,
      feedback: {
        helpful: opinion.feedback.filter((f) => f.helpful).length,
        notHelpful: opinion.feedback.filter((f) => !f.helpful).length,
        userFeedback: null // Will be set by caller if needed
      }
    }));
  }

  /**
   * Record user feedback on opinion
   * @param {string} opinionId - Opinion ID
   * @param {boolean} helpful - Whether opinion was helpful
   * @param {string} userId - User ID
   * @param {string} comment - Optional comment
   * @returns {Promise<void>}
   */
  async recordFeedback(opinionId, helpful, userId, comment = null) {
    // Check if opinion exists
    const opinion = await prisma.secondOpinion.findUnique({
      where: { id: opinionId }
    });

    if (!opinion) {
      throw new Error('Opinion not found');
    }

    // Upsert feedback (update if exists, create if not)
    await prisma.opinionFeedback.upsert({
      where: {
        unique_opinion_user_feedback: {
          opinionId,
          userId
        }
      },
      update: {
        helpful,
        comment
      },
      create: {
        opinionId,
        userId,
        helpful,
        comment
      }
    });

    // Update provider selection weights based on feedback
    providerSelectionStrategy.updateProviderWeight(opinion.opinionProvider, helpful);

    console.log(
      `[SecondOpinion] Feedback recorded for opinion ${opinionId}: ${helpful ? 'helpful' : 'not helpful'}`
    );
  }

  /**
   * Get rate limit status for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Rate limit status
   */
  async getRateLimitStatus(userId) {
    if (!this.config.RATE_LIMIT.ENABLED) {
      return {
        enabled: false,
        unlimited: true
      };
    }

    const now = Date.now();
    const hourAgo = now - this.config.RATE_LIMIT.HOUR_WINDOW;
    const dayAgo = now - this.config.RATE_LIMIT.DAY_WINDOW;

    const [hourCount, dayCount] = await Promise.all([
      prisma.secondOpinion.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(hourAgo)
          }
        }
      }),
      prisma.secondOpinion.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(dayAgo)
          }
        }
      })
    ]);

    return {
      enabled: true,
      hourly: {
        used: hourCount,
        limit: this.config.RATE_LIMIT.MAX_REQUESTS_PER_HOUR,
        remaining: Math.max(0, this.config.RATE_LIMIT.MAX_REQUESTS_PER_HOUR - hourCount)
      },
      daily: {
        used: dayCount,
        limit: this.config.RATE_LIMIT.MAX_REQUESTS_PER_DAY,
        remaining: Math.max(0, this.config.RATE_LIMIT.MAX_REQUESTS_PER_DAY - dayCount)
      }
    };
  }

  /**
   * Clear rate limit cache
   */
  clearRateLimitCache() {
    this.rateLimitCache.clear();
    console.log('[SecondOpinion] Rate limit cache cleared');
  }
}

// Export singleton instance
export const secondOpinionService = new SecondOpinionService();
