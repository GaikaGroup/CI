/**
 * Session Language Integration Utilities
 * Provides helper functions to integrate language management with existing session system
 */

import { sessionLanguagePersistence } from '../SessionLanguagePersistence.js';
import { SessionService } from '../../session/services/SessionService.js';

/**
 * Initialize language state when a session is loaded
 * @param {string} sessionId - Session identifier
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} Language state
 */
export async function initializeSessionLanguageState(sessionId, userId) {
  if (!sessionId || !userId) {
    throw new Error('Session ID and User ID are required');
  }

  try {
    // Get session data from database
    const sessionData = await SessionService.getSession(sessionId, userId, false);

    // Initialize language state
    const languageState = await sessionLanguagePersistence.initializeSessionLanguage(
      sessionId,
      sessionData
    );

    return languageState;
  } catch (error) {
    console.error(`Failed to initialize language state for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Update session language based on user message and persist changes
 * @param {string} sessionId - Session identifier
 * @param {string} userId - User identifier
 * @param {string} messageContent - User message content
 * @returns {Promise<Object|null>} Updated language state or null
 */
export async function updateSessionLanguageFromMessage(sessionId, userId, messageContent) {
  if (!sessionId || !userId || !messageContent) {
    return null;
  }

  try {
    // Create session update callback
    const sessionUpdateCallback = async (sessionId, updates) => {
      try {
        await SessionService.updateSession(sessionId, userId, updates);
      } catch (error) {
        console.error(`Failed to update session ${sessionId} with language data:`, error);
        // Don't throw here to avoid breaking the language update flow
      }
    };

    // Update language from message
    const updatedState = await sessionLanguagePersistence.updateLanguageFromMessage(
      sessionId,
      messageContent,
      { sessionUpdateCallback }
    );

    return updatedState;
  } catch (error) {
    console.error(
      `Failed to update session language from message for session ${sessionId}:`,
      error
    );
    return null;
  }
}

/**
 * Get language preferences for chat API integration
 * @param {string} sessionId - Session identifier
 * @returns {Object|null} Language preferences for chat API
 */
export function getSessionLanguageForChat(sessionId) {
  if (!sessionId) {
    return null;
  }

  const preferences = sessionLanguagePersistence.getSessionLanguagePreferences(sessionId);

  if (!preferences) {
    return null;
  }

  return {
    language: preferences.language,
    confidence: preferences.confidence,
    isStable: preferences.isStable,
    enforcementInstructions:
      sessionLanguagePersistence.getLanguageEnforcementInstructions(sessionId),
    shouldValidateResponse: preferences.preferences.enforceLanguageConsistency
  };
}

/**
 * Create enhanced session context with language information
 * @param {Object} originalContext - Original session context
 * @param {string} sessionId - Session identifier
 * @returns {Object} Enhanced session context
 */
export function enhanceSessionContextWithLanguage(originalContext, sessionId) {
  if (!originalContext || !sessionId) {
    return originalContext;
  }

  const languageInfo = getSessionLanguageForChat(sessionId);

  if (!languageInfo) {
    return originalContext;
  }

  return {
    ...originalContext,
    language: {
      detected: languageInfo.language,
      confidence: languageInfo.confidence,
      isStable: languageInfo.isStable,
      enforcement: languageInfo.enforcementInstructions
    }
  };
}

/**
 * Prepare language-aware system messages for chat API
 * @param {Array} originalMessages - Original system messages
 * @param {string} sessionId - Session identifier
 * @returns {Array} Enhanced messages with language enforcement
 */
export function enhanceSystemMessagesWithLanguage(originalMessages, sessionId) {
  if (!Array.isArray(originalMessages) || !sessionId) {
    return originalMessages;
  }

  const languageInfo = getSessionLanguageForChat(sessionId);

  if (!languageInfo || !languageInfo.enforcementInstructions) {
    return originalMessages;
  }

  const enforcementMessage = {
    role: 'system',
    content: languageInfo.enforcementInstructions.instruction
  };

  // Insert language enforcement message at the beginning of system messages
  return [enforcementMessage, ...originalMessages];
}

/**
 * Handle session cleanup when session ends
 * @param {string} sessionId - Session identifier
 * @returns {Promise<void>}
 */
export async function cleanupSessionLanguageState(sessionId) {
  if (!sessionId) {
    return;
  }

  try {
    // Get final statistics before cleanup
    const stats = sessionLanguagePersistence.getSessionLanguagePreferences(sessionId);

    if (stats) {
      console.log(`Session ${sessionId} language stats:`, {
        language: stats.language,
        confidence: stats.confidence,
        isStable: stats.isStable,
        interactions: stats.interactionCount
      });
    }

    // Remove session from language manager
    sessionLanguagePersistence.sessionLanguageManager.removeSession(sessionId);
  } catch (error) {
    console.error(`Failed to cleanup language state for session ${sessionId}:`, error);
  }
}

/**
 * Validate response language and handle inconsistencies
 * @param {string} sessionId - Session identifier
 * @param {string} responseContent - AI response content
 * @returns {Promise<Object>} Validation result
 */
export async function validateResponseLanguage(sessionId, responseContent) {
  if (!sessionId || !responseContent) {
    return { isValid: true, reason: 'No validation needed' };
  }

  const languageInfo = getSessionLanguageForChat(sessionId);

  if (!languageInfo || !languageInfo.shouldValidateResponse) {
    return { isValid: true, reason: 'Validation not required' };
  }

  try {
    // Import language detector for validation
    const { languageDetector } = await import('../LanguageDetector.js');

    // Validate response language
    const validationResult = languageDetector.validateLanguageConsistency(
      responseContent,
      languageInfo.language
    );

    // Handle validation result
    await sessionLanguagePersistence.handleValidationResult(sessionId, validationResult);

    return {
      isValid: validationResult.isConsistent,
      detectedLanguage: validationResult.detectedLanguage,
      expectedLanguage: validationResult.expectedLanguage,
      confidence: validationResult.confidence,
      severity: validationResult.severity,
      recommendation: validationResult.recommendation,
      validationDetails: validationResult
    };
  } catch (error) {
    console.error(`Failed to validate response language for session ${sessionId}:`, error);
    return {
      isValid: false,
      error: error.message,
      reason: 'Validation failed due to error'
    };
  }
}

/**
 * Get session language statistics for monitoring
 * @param {string} sessionId - Session identifier
 * @returns {Object|null} Language statistics
 */
export function getSessionLanguageStats(sessionId) {
  if (!sessionId) {
    return null;
  }

  return sessionLanguagePersistence.sessionLanguageManager.getSessionLanguageStats(sessionId);
}

/**
 * Middleware function to automatically handle language detection and persistence
 * @param {string} sessionId - Session identifier
 * @param {string} userId - User identifier
 * @param {string} userMessage - User message content
 * @returns {Promise<Function>} Middleware function
 */
export async function createLanguageMiddleware(sessionId, userId, userMessage) {
  // Initialize or update language state
  let languageState = null;

  try {
    // Try to update from message first
    languageState = await updateSessionLanguageFromMessage(sessionId, userId, userMessage);

    // If no update occurred, ensure we have initialized state
    if (!languageState) {
      languageState = await initializeSessionLanguageState(sessionId, userId);
    }
  } catch (error) {
    console.error(`Language middleware initialization failed for session ${sessionId}:`, error);
  }

  // Return middleware function
  return {
    enhanceContext: (context) => enhanceSessionContextWithLanguage(context, sessionId),
    enhanceMessages: (messages) => enhanceSystemMessagesWithLanguage(messages, sessionId),
    validateResponse: (response) => validateResponseLanguage(sessionId, response),
    getLanguageInfo: () => getSessionLanguageForChat(sessionId),
    languageState
  };
}
