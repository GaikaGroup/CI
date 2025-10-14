/**
 * Session Language Persistence Service
 * Handles persistence of language preferences in session context
 * Integrates with existing session management system
 */

import { sessionLanguageManager } from './SessionLanguageManager.js';
import { languageDetector } from './LanguageDetector.js';

export class SessionLanguagePersistence {
  constructor() {
    // Configuration for persistence behavior
    this.config = {
      // Key used to store language data in session metadata
      sessionMetadataKey: 'languageState',
      
      // Whether to automatically detect and update language from user messages
      autoDetectFromMessages: true,
      
      // Whether to persist language changes to session database
      persistToDatabase: true,
      
      // Minimum confidence required to update session language
      minConfidenceForUpdate: 0.7
    };

    console.log('SessionLanguagePersistence initialized');
  }

  /**
   * Initialize language state for a session
   * @param {string} sessionId - Session identifier
   * @param {Object} sessionData - Session data from database
   * @returns {Promise<Object>} Language state
   */
  async initializeSessionLanguage(sessionId, sessionData) {
    if (!sessionId || !sessionData) {
      throw new Error('Session ID and session data are required');
    }

    try {
      // Check if language state exists in session metadata
      const existingLanguageState = this.extractLanguageStateFromSession(sessionData);
      
      if (existingLanguageState) {
        // Restore language state from session metadata
        const restoredState = sessionLanguageManager.setSessionLanguage(
          sessionId,
          existingLanguageState.detectedLanguage,
          existingLanguageState.confidence,
          {
            source: 'session_metadata',
            restoredAt: Date.now(),
            originalData: existingLanguageState
          }
        );

        console.log(`Language state restored for session ${sessionId}: ${existingLanguageState.detectedLanguage}`);
        return restoredState;
      } else {
        // Initialize with session's default language
        const defaultLanguage = sessionData.language || 'en';
        const initialState = sessionLanguageManager.setSessionLanguage(
          sessionId,
          defaultLanguage,
          0.8, // High confidence for explicitly set session language
          {
            source: 'session_default',
            initializedAt: Date.now()
          }
        );

        console.log(`Language state initialized for session ${sessionId}: ${defaultLanguage}`);
        return initialState;
      }
    } catch (error) {
      console.error(`Failed to initialize language state for session ${sessionId}:`, error);
      
      // Fallback to default language
      return sessionLanguageManager.setSessionLanguage(
        sessionId,
        'en',
        0.5,
        {
          source: 'fallback',
          error: error.message,
          initializedAt: Date.now()
        }
      );
    }
  }

  /**
   * Update session language based on user message
   * @param {string} sessionId - Session identifier
   * @param {string} messageContent - User message content
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated language state or null if no update needed
   */
  async updateLanguageFromMessage(sessionId, messageContent, options = {}) {
    if (!sessionId || !messageContent) {
      return null;
    }

    if (!this.config.autoDetectFromMessages) {
      return null;
    }

    try {
      // Detect language from message content
      const detection = languageDetector.detectWithConfidence(messageContent);
      
      if (!detection || detection.confidence < this.config.minConfidenceForUpdate) {
        console.log(`Language detection confidence too low for session ${sessionId}: ${detection?.confidence || 0}`);
        return null;
      }

      // Get current session language state
      const currentState = sessionLanguageManager.getSessionLanguage(sessionId);
      
      // Check if language has changed significantly
      if (currentState && currentState.detectedLanguage === detection.language) {
        // Same language, just update confidence
        return sessionLanguageManager.updateLanguageConfidence(
          sessionId,
          detection.confidence,
          {
            source: 'message_analysis',
            messageLength: messageContent.length,
            detectionMethod: detection.method,
            updatedAt: Date.now()
          }
        );
      }

      // Language has changed or this is the first detection
      const updatedState = sessionLanguageManager.setSessionLanguage(
        sessionId,
        detection.language,
        detection.confidence,
        {
          source: 'message_analysis',
          messageLength: messageContent.length,
          detectionMethod: detection.method,
          previousLanguage: currentState?.detectedLanguage,
          updatedAt: Date.now()
        }
      );

      console.log(`Language updated for session ${sessionId}: ${currentState?.detectedLanguage || 'none'} -> ${detection.language}`);

      // Persist to session metadata if enabled
      if (this.config.persistToDatabase && options.sessionUpdateCallback) {
        await this.persistLanguageStateToSession(sessionId, updatedState, options.sessionUpdateCallback);
      }

      return updatedState;
    } catch (error) {
      console.error(`Failed to update language from message for session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get language preferences for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Language preferences or null if not found
   */
  getSessionLanguagePreferences(sessionId) {
    if (!sessionId) {
      return null;
    }

    const languageState = sessionLanguageManager.getSessionLanguage(sessionId);
    
    if (!languageState) {
      return null;
    }

    return {
      language: languageState.detectedLanguage,
      confidence: languageState.confidence,
      isStable: languageState.isStable,
      lastUpdated: languageState.lastUpdated,
      interactionCount: languageState.interactionCount,
      
      // Additional preferences for chat API
      preferences: {
        enforceLanguageConsistency: languageState.isStable,
        confidenceThreshold: languageState.confidence,
        allowLanguageSwitching: !languageState.isStable || languageState.confidence < 0.8
      }
    };
  }

  /**
   * Persist language state to session metadata
   * @param {string} sessionId - Session identifier
   * @param {Object} languageState - Language state to persist
   * @param {Function} sessionUpdateCallback - Callback to update session in database
   * @returns {Promise<boolean>} Success status
   */
  async persistLanguageStateToSession(sessionId, languageState, sessionUpdateCallback) {
    if (!sessionId || !languageState || !sessionUpdateCallback) {
      return false;
    }

    try {
      // Prepare language state for persistence (remove circular references and functions)
      const persistableState = {
        detectedLanguage: languageState.detectedLanguage,
        confidence: languageState.confidence,
        isStable: languageState.isStable,
        firstDetected: languageState.firstDetected,
        lastUpdated: languageState.lastUpdated,
        interactionCount: languageState.interactionCount,
        
        // Keep only recent confidence history for persistence
        recentConfidenceHistory: languageState.confidenceHistory.slice(-5),
        
        // Summary statistics
        stats: {
          averageConfidence: languageState.confidenceHistory.reduce((sum, entry) => sum + entry.confidence, 0) / languageState.confidenceHistory.length,
          languageConsistency: languageState.confidenceHistory.every(entry => entry.language === languageState.detectedLanguage),
          totalValidations: languageState.validationHistory.length,
          validValidations: languageState.validationHistory.filter(v => v.isValid).length
        }
      };

      // Update session metadata
      const metadata = {
        [this.config.sessionMetadataKey]: persistableState,
        languageUpdatedAt: Date.now()
      };

      await sessionUpdateCallback(sessionId, { metadata });
      
      console.log(`Language state persisted for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`Failed to persist language state for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Extract language state from session data
   * @param {Object} sessionData - Session data from database
   * @returns {Object|null} Extracted language state or null
   */
  extractLanguageStateFromSession(sessionData) {
    if (!sessionData || !sessionData.metadata) {
      return null;
    }

    try {
      const metadata = typeof sessionData.metadata === 'string' 
        ? JSON.parse(sessionData.metadata) 
        : sessionData.metadata;

      return metadata[this.config.sessionMetadataKey] || null;
    } catch (error) {
      console.warn('Failed to parse session metadata for language state:', error);
      return null;
    }
  }

  /**
   * Handle session language validation result
   * @param {string} sessionId - Session identifier
   * @param {Object} validationResult - Validation result from ResponseValidator
   * @returns {Promise<void>}
   */
  async handleValidationResult(sessionId, validationResult) {
    if (!sessionId || !validationResult) {
      return;
    }

    try {
      // Add validation result to session language manager
      sessionLanguageManager.addValidationResult(sessionId, validationResult);

      // If validation failed and we have a session update callback, we might want to
      // trigger additional actions like regenerating the response
      if (!validationResult.isValid) {
        console.warn(`Language validation failed for session ${sessionId}:`, {
          expected: validationResult.expectedLanguage,
          detected: validationResult.detectedLanguage,
          confidence: validationResult.confidence
        });
      }
    } catch (error) {
      console.error(`Failed to handle validation result for session ${sessionId}:`, error);
    }
  }

  /**
   * Get language enforcement instructions for chat API
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Language enforcement instructions
   */
  getLanguageEnforcementInstructions(sessionId) {
    const preferences = this.getSessionLanguagePreferences(sessionId);
    
    if (!preferences) {
      return null;
    }

    const { language, confidence, isStable } = preferences;

    // Language enforcement templates
    const enforcementTemplates = {
      ru: {
        strong: "КРИТИЧЕСКИ ВАЖНО: Отвечай ТОЛЬКО на русском языке. Никогда не используй китайский, английский или другие языки в своем ответе. Проверь, что весь твой ответ написан на русском языке перед отправкой.",
        moderate: "Пожалуйста, отвечай на русском языке, как это было установлено в начале нашего разговора.",
        weak: "Предпочтительно отвечать на русском языке."
      },
      en: {
        strong: "CRITICAL: Respond ONLY in English. Never use Russian, Chinese, or other languages in your response. Verify that your entire response is in English before sending.",
        moderate: "Please respond in English, as established at the beginning of our conversation.",
        weak: "Preferably respond in English."
      },
      es: {
        strong: "CRÍTICO: Responde SOLO en español. Nunca uses ruso, chino u otros idiomas en tu respuesta. Verifica que toda tu respuesta esté en español antes de enviar.",
        moderate: "Por favor, responde en español, como se estableció al inicio de nuestra conversación.",
        weak: "Preferiblemente responde en español."
      }
    };

    // Determine enforcement strength based on stability and confidence
    let enforcementLevel = 'weak';
    if (isStable && confidence >= 0.8) {
      enforcementLevel = 'strong';
    } else if (confidence >= 0.6) {
      enforcementLevel = 'moderate';
    }

    const template = enforcementTemplates[language];
    if (!template) {
      return null;
    }

    return {
      language,
      enforcementLevel,
      instruction: template[enforcementLevel],
      confidence,
      isStable,
      shouldValidateResponse: enforcementLevel !== 'weak'
    };
  }

  /**
   * Clean up expired session language data
   * @returns {Promise<number>} Number of sessions cleaned up
   */
  async cleanupExpiredSessions() {
    return sessionLanguageManager.cleanupExpiredSessions();
  }

  /**
   * Get persistence statistics
   * @returns {Object} Persistence statistics
   */
  getStats() {
    const managerStats = sessionLanguageManager.getManagerStats();
    
    return {
      ...managerStats,
      persistence: {
        config: { ...this.config },
        activeSessions: sessionLanguageManager.getActiveSessions().length
      }
    };
  }

  /**
   * Update persistence configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    console.log('SessionLanguagePersistence configuration updated:', this.config);
  }

  /**
   * Reset all persistence data (useful for testing)
   */
  reset() {
    sessionLanguageManager.reset();
    console.log('SessionLanguagePersistence reset - all data cleared');
  }
}

// Export singleton instance
export const sessionLanguagePersistence = new SessionLanguagePersistence();