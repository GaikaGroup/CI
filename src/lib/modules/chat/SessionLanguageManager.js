/**
 * Session Language Manager
 * Manages language state and preferences throughout conversation sessions
 */

import { languageConsistencyLogger } from './LanguageConsistencyLogger.js';

export class SessionLanguageManager {
  constructor() {
    // In-memory storage for session language states
    // In a production environment, this could be backed by Redis or database
    this.sessionLanguages = new Map();

    // Configuration
    this.config = {
      // Minimum confidence threshold for language detection
      minConfidenceThreshold: 0.7,

      // Maximum age for session language data (in milliseconds)
      maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours

      // Number of confidence updates to track for stability calculation
      confidenceHistorySize: 10,

      // Minimum number of interactions before language is considered stable
      minInteractionsForStability: 3
    };

    console.log('SessionLanguageManager initialized');
  }

  /**
   * Set the language for a session with confidence scoring
   * @param {string} sessionId - Session identifier
   * @param {string} language - Language code (e.g., 'en', 'es', 'ru')
   * @param {number} confidence - Confidence score (0-1)
   * @param {Object} detectionDetails - Additional detection information
   */
  setSessionLanguage(sessionId, language, confidence = 0.5, detectionDetails = {}) {
    if (!sessionId || !language) {
      throw new Error('SessionId and language are required');
    }

    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    const now = Date.now();
    const existing = this.sessionLanguages.get(sessionId);

    // Create or update session language state
    const sessionState = {
      sessionId,
      detectedLanguage: language,
      confidence,
      firstDetected: existing?.firstDetected || now,
      lastUpdated: now,
      interactionCount: (existing?.interactionCount || 0) + 1,
      confidenceHistory: [
        ...(existing?.confidenceHistory || []),
        {
          confidence,
          language,
          timestamp: now,
          detectionDetails
        }
      ].slice(-this.config.confidenceHistorySize), // Keep only recent history
      validationHistory: existing?.validationHistory || [],
      isStable: false // Will be calculated
    };

    // Calculate language stability
    sessionState.isStable = this.calculateLanguageStability(sessionState);

    // Store the updated state
    this.sessionLanguages.set(sessionId, sessionState);

    console.log(
      `Session language set: ${sessionId} -> ${language} (confidence: ${confidence}, stable: ${sessionState.isStable})`
    );

    // Log session metrics if language becomes stable
    if (sessionState.isStable && (!existing || !existing.isStable)) {
      try {
        const sessionStats = this.getSessionLanguageStats(sessionId);
        if (sessionStats) {
          languageConsistencyLogger.logSessionMetrics(sessionId, sessionStats);
        }
      } catch (error) {
        console.warn('Failed to log session metrics:', error);
      }
    }

    return sessionState;
  }

  /**
   * Get the current language for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session language state or null if not found
   */
  getSessionLanguage(sessionId) {
    if (!sessionId) {
      return null;
    }

    const sessionState = this.sessionLanguages.get(sessionId);

    if (!sessionState) {
      return null;
    }

    // Check if session data is still valid (not expired)
    const age = Date.now() - sessionState.lastUpdated;
    if (age > this.config.maxSessionAge) {
      this.sessionLanguages.delete(sessionId);
      console.log(`Session language expired and removed: ${sessionId}`);
      return null;
    }

    return sessionState;
  }

  /**
   * Update language confidence for an existing session
   * @param {string} sessionId - Session identifier
   * @param {number} newConfidence - New confidence score
   * @param {Object} detectionDetails - Additional detection information
   * @returns {Object|null} Updated session state or null if session not found
   */
  updateLanguageConfidence(sessionId, newConfidence, detectionDetails = {}) {
    const existing = this.getSessionLanguage(sessionId);

    if (!existing) {
      console.warn(`Cannot update confidence for non-existent session: ${sessionId}`);
      return null;
    }

    if (newConfidence < 0 || newConfidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    // Update confidence while keeping the same language
    return this.setSessionLanguage(
      sessionId,
      existing.detectedLanguage,
      newConfidence,
      detectionDetails
    );
  }

  /**
   * Check if the language detection for a session is stable
   * @param {string} sessionId - Session identifier
   * @returns {boolean} True if language is stable, false otherwise
   */
  isLanguageStable(sessionId) {
    const sessionState = this.getSessionLanguage(sessionId);

    if (!sessionState) {
      return false;
    }

    return sessionState.isStable;
  }

  /**
   * Calculate language stability based on confidence history and consistency
   * @param {Object} sessionState - Session state object
   * @returns {boolean} True if language is considered stable
   */
  calculateLanguageStability(sessionState) {
    const { confidenceHistory, interactionCount, detectedLanguage } = sessionState;

    // Need minimum interactions for stability
    if (interactionCount < this.config.minInteractionsForStability) {
      return false;
    }

    // Check confidence consistency
    const recentConfidences = confidenceHistory.slice(-5); // Last 5 interactions
    const avgConfidence =
      recentConfidences.reduce((sum, entry) => sum + entry.confidence, 0) /
      recentConfidences.length;

    // Language must be consistent across recent interactions
    const languageConsistency = recentConfidences.every(
      (entry) => entry.language === detectedLanguage
    );

    // Confidence must be above threshold and consistent
    const confidenceStability =
      avgConfidence >= this.config.minConfidenceThreshold &&
      recentConfidences.every(
        (entry) => entry.confidence >= this.config.minConfidenceThreshold * 0.8
      );

    return languageConsistency && confidenceStability;
  }

  /**
   * Add validation result to session history
   * @param {string} sessionId - Session identifier
   * @param {Object} validationResult - Validation result from ResponseValidator
   */
  addValidationResult(sessionId, validationResult) {
    const sessionState = this.getSessionLanguage(sessionId);

    if (!sessionState) {
      console.warn(`Cannot add validation result for non-existent session: ${sessionId}`);
      return;
    }

    const validationEntry = {
      timestamp: Date.now(),
      expectedLanguage: sessionState.detectedLanguage,
      actualLanguage: validationResult.detectedLanguage,
      confidence: validationResult.confidence,
      isValid: validationResult.isValid,
      correctionApplied: validationResult.correctionApplied || false,
      validationDetails: validationResult
    };

    sessionState.validationHistory.push(validationEntry);

    // Keep only recent validation history (last 50 entries)
    if (sessionState.validationHistory.length > 50) {
      sessionState.validationHistory = sessionState.validationHistory.slice(-50);
    }

    // Update the session state
    this.sessionLanguages.set(sessionId, sessionState);

    console.log(
      `Validation result added for session ${sessionId}: ${validationResult.isValid ? 'valid' : 'invalid'}`
    );

    // Log consistency issue if validation failed
    if (!validationResult.isValid) {
      try {
        languageConsistencyLogger.logConsistencyIssue(
          sessionId,
          'validation_failure',
          {
            expectedLanguage: sessionState.detectedLanguage,
            detectedLanguage: validationResult.detectedLanguage,
            confidence: validationResult.confidence,
            severity: validationResult.severity || 'medium'
          },
          {
            correctionApplied: validationResult.correctionApplied || false
          }
        );
      } catch (error) {
        console.warn('Failed to log consistency issue:', error);
      }
    }
  }

  /**
   * Get language statistics for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Language statistics or null if session not found
   */
  getSessionLanguageStats(sessionId) {
    const sessionState = this.getSessionLanguage(sessionId);

    if (!sessionState) {
      return null;
    }

    const { confidenceHistory, validationHistory } = sessionState;

    // Calculate confidence statistics
    const confidences = confidenceHistory.map((entry) => entry.confidence);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);
    const maxConfidence = Math.max(...confidences);

    // Calculate validation statistics
    const totalValidations = validationHistory.length;
    const validValidations = validationHistory.filter((v) => v.isValid).length;
    const validationSuccessRate = totalValidations > 0 ? validValidations / totalValidations : 0;

    // Calculate language consistency
    const languages = confidenceHistory.map((entry) => entry.language);
    const uniqueLanguages = [...new Set(languages)];
    const languageConsistency =
      uniqueLanguages.length === 1 ? 1 : 1 - (uniqueLanguages.length - 1) * 0.2;

    return {
      sessionId,
      language: sessionState.detectedLanguage,
      isStable: sessionState.isStable,
      interactionCount: sessionState.interactionCount,
      sessionAge: Date.now() - sessionState.firstDetected,
      confidence: {
        current: sessionState.confidence,
        average: avgConfidence,
        min: minConfidence,
        max: maxConfidence
      },
      validation: {
        totalValidations,
        validValidations,
        successRate: validationSuccessRate
      },
      consistency: {
        languageConsistency,
        uniqueLanguages: uniqueLanguages.length,
        detectedLanguages: uniqueLanguages
      }
    };
  }

  /**
   * Remove session language data
   * @param {string} sessionId - Session identifier
   * @returns {boolean} True if session was removed, false if not found
   */
  removeSession(sessionId) {
    const existed = this.sessionLanguages.has(sessionId);
    this.sessionLanguages.delete(sessionId);

    if (existed) {
      console.log(`Session language data removed: ${sessionId}`);
    }

    return existed;
  }

  /**
   * Clean up expired sessions
   * @returns {number} Number of sessions cleaned up
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, sessionState] of this.sessionLanguages.entries()) {
      const age = now - sessionState.lastUpdated;
      if (age > this.config.maxSessionAge) {
        this.sessionLanguages.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired session language entries`);
    }

    return cleanedCount;
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of session IDs with active language data
   */
  getActiveSessions() {
    this.cleanupExpiredSessions(); // Clean up first
    return Array.from(this.sessionLanguages.keys());
  }

  /**
   * Get manager statistics
   * @returns {Object} Manager statistics
   */
  getManagerStats() {
    this.cleanupExpiredSessions(); // Clean up first

    const sessions = Array.from(this.sessionLanguages.values());
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        stableSessions: 0,
        languageDistribution: {},
        averageConfidence: 0,
        averageInteractions: 0
      };
    }

    const stableSessions = sessions.filter((s) => s.isStable).length;
    const totalInteractions = sessions.reduce((sum, s) => sum + s.interactionCount, 0);
    const totalConfidence = sessions.reduce((sum, s) => sum + s.confidence, 0);

    // Language distribution
    const languageDistribution = {};
    sessions.forEach((session) => {
      const lang = session.detectedLanguage;
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    });

    return {
      totalSessions,
      stableSessions,
      stabilityRate: stableSessions / totalSessions,
      languageDistribution,
      averageConfidence: totalConfidence / totalSessions,
      averageInteractions: totalInteractions / totalSessions,
      config: { ...this.config }
    };
  }

  /**
   * Update manager configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    console.log('SessionLanguageManager configuration updated:', this.config);
  }

  /**
   * Reset all session data (useful for testing)
   */
  reset() {
    this.sessionLanguages.clear();
    console.log('SessionLanguageManager reset - all session data cleared');
  }
}

// Export singleton instance
export const sessionLanguageManager = new SessionLanguageManager();
