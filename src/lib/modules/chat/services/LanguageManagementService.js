/**
 * Language Management Service
 *
 * Facade for language detection, validation, and management operations.
 * Coordinates between language detector, session manager, and consistency logger.
 */

export class LanguageManagementService {
  /**
   * @param {Object} languageDetector - Language detector instance
   * @param {Object} sessionLanguageManager - Session language manager instance
   * @param {Object} languageConsistencyLogger - Language consistency logger instance
   */
  constructor(languageDetector, sessionLanguageManager, languageConsistencyLogger) {
    this.languageDetector = languageDetector;
    this.sessionLanguageManager = sessionLanguageManager;
    this.languageConsistencyLogger = languageConsistencyLogger;
  }

  /**
   * Detects language from user message with smart fallback logic
   * @param {Object} params - Detection parameters
   * @param {string} params.content - User message content
   * @param {string} params.sessionId - Session ID
   * @param {string} params.fallbackLanguage - Fallback language if detection fails
   * @param {Array} params.images - Array of images (affects detection)
   * @param {string} params.provider - LLM provider being used
   * @returns {Object} { language: string, confidence: number, method: string }
   */
  detectLanguage({
    content,
    sessionId,
    fallbackLanguage = 'en',
    images = [],
    provider = 'default'
  }) {
    let detectedLanguage = fallbackLanguage;
    let languageConfidence = 0.5;
    let detectionMethod = 'fallback';

    if (content && content.trim().length > 0) {
      try {
        const languageDetection = this.languageDetector.detectWithConfidence(content, sessionId, {
          hasImages: !!(images && images.length > 0),
          provider
        });
        detectedLanguage = languageDetection.language;
        languageConfidence = languageDetection.confidence;
        detectionMethod = languageDetection.method;

        console.log(`Language detected: ${detectedLanguage} (confidence: ${languageConfidence})`);

        // Store language preference in session context
        this.sessionLanguageManager.setSessionLanguage(
          sessionId,
          detectedLanguage,
          languageConfidence,
          {
            method: detectionMethod,
            userMessage: content.substring(0, 100),
            timestamp: Date.now()
          }
        );
      } catch (error) {
        console.warn('Language detection failed, using fallback:', error);
        detectedLanguage = fallbackLanguage;
        languageConfidence = 0.3;
        detectionMethod = 'error_fallback';

        // Log detection failure
        try {
          this.languageConsistencyLogger.logConsistencyIssue(
            sessionId,
            'detection_failure',
            {
              errorMessage: error.message,
              severity: 'medium'
            },
            {
              provider,
              messageLength: content?.length || 0
            }
          );
        } catch (logError) {
          console.warn('Failed to log detection failure:', logError);
        }
      }
    } else {
      // Try to get language from session if no content to analyze
      const sessionLanguage = this.sessionLanguageManager.getSessionLanguage(sessionId);
      if (sessionLanguage) {
        detectedLanguage = sessionLanguage.detectedLanguage;
        languageConfidence = sessionLanguage.confidence;
        detectionMethod = 'session_history';
        console.log(
          `Using session language: ${detectedLanguage} (confidence: ${languageConfidence})`
        );
      }
    }

    return {
      language: detectedLanguage,
      confidence: languageConfidence,
      method: detectionMethod
    };
  }

  /**
   * Handles short message detection with conversation history fallback
   * @param {Object} params - Parameters
   * @param {string} params.content - User message content
   * @param {string} params.detectedLanguage - Initially detected language
   * @param {number} params.languageConfidence - Detection confidence
   * @param {Object} params.sessionContext - Session context with history
   * @returns {Object} { language: string, confidence: number, adjusted: boolean }
   */
  handleShortMessage({ content, detectedLanguage, languageConfidence, sessionContext }) {
    const wordCount = content.trim().split(/\s+/).length;

    // For very short messages with low confidence, check history
    if (wordCount <= 2 && languageConfidence < 0.9 && sessionContext?.history) {
      const userMessages = sessionContext.history.filter((msg) => msg.role === 'user');

      if (userMessages.length > 0) {
        // Get the most recent user message (not the current one)
        const previousUserMessage = userMessages[userMessages.length - 1];
        const historyDetection = this.languageDetector.detectLanguageFromText(
          previousUserMessage.content
        );

        if (historyDetection.confidence > 0.7) {
          console.log(
            `[Short Message] Overriding ${detectedLanguage} (${languageConfidence}) with history language ${historyDetection.language} (${historyDetection.confidence})`
          );
          return {
            language: historyDetection.language,
            confidence: historyDetection.confidence,
            adjusted: true
          };
        }
      }
    }

    return {
      language: detectedLanguage,
      confidence: languageConfidence,
      adjusted: false
    };
  }

  /**
   * Validates response language consistency
   * @param {Object} params - Validation parameters
   * @param {string} params.aiResponse - AI response text
   * @param {string} params.expectedLanguage - Expected language code
   * @param {string} params.sessionId - Session ID
   * @param {Object} params.metadata - Additional metadata (provider, model, etc.)
   * @returns {Object} Validation result
   */
  validateResponseLanguage({ aiResponse, expectedLanguage, sessionId, metadata = {} }) {
    try {
      const validationResult = this.languageDetector.validateLanguageConsistency(
        aiResponse,
        expectedLanguage,
        sessionId,
        metadata
      );

      // Log validation result for monitoring
      console.log(`Language validation: ${validationResult.isConsistent ? 'PASS' : 'FAIL'}`, {
        sessionId,
        expectedLanguage,
        detectedLanguage: validationResult.detectedLanguage,
        confidence: validationResult.confidence,
        severity: validationResult.severity,
        recommendation: validationResult.recommendation
      });

      // Add validation result to session history
      this.sessionLanguageManager.addValidationResult(sessionId, validationResult);

      // Handle validation failures
      if (!validationResult.isConsistent && validationResult.severity === 'high') {
        console.warn(`High severity language inconsistency detected in session ${sessionId}:`, {
          expected: expectedLanguage,
          detected: validationResult.detectedLanguage,
          confidence: validationResult.confidence,
          recommendation: validationResult.recommendation
        });

        if (validationResult.recommendation === 'regenerate') {
          // Log that regeneration is recommended
          try {
            this.languageConsistencyLogger.logConsistencyIssue(
              sessionId,
              'regeneration_recommended',
              {
                expectedLanguage,
                detectedLanguage: validationResult.detectedLanguage,
                confidence: validationResult.confidence,
                severity: validationResult.severity,
                recommendation: validationResult.recommendation
              },
              metadata
            );
          } catch (logError) {
            console.warn('Failed to log regeneration recommendation:', logError);
          }
        }
      }

      // For medium severity issues, just log for monitoring
      if (!validationResult.isConsistent && validationResult.severity === 'medium') {
        console.info(`Medium severity language inconsistency detected in session ${sessionId}`, {
          expected: expectedLanguage,
          detected: validationResult.detectedLanguage
        });
      }

      return validationResult;
    } catch (validationError) {
      console.error('Language validation failed:', validationError);

      // Log validation failure
      try {
        this.languageConsistencyLogger.logConsistencyIssue(
          sessionId,
          'validation_error',
          {
            errorMessage: validationError.message,
            severity: 'high'
          },
          metadata
        );
      } catch (logError) {
        console.warn('Failed to log validation error:', logError);
      }

      // Return a safe default result
      return {
        isConsistent: true, // Assume consistent to avoid blocking
        detectedLanguage: expectedLanguage,
        confidence: 0.5,
        severity: 'low',
        recommendation: 'continue'
      };
    }
  }

  /**
   * Gets language instructions for system prompts
   * @param {string} languageCode - Language code
   * @returns {Object} Language instructions
   */
  getLanguageInstructions(languageCode) {
    const languageNames = {
      ru: 'Russian',
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese'
    };

    const languageInstructions = {
      es: 'Responde SOLO en español. El usuario escribe en español, tú respondes en español. Cada palabra debe ser en español.',
      ru: 'Отвечай ТОЛЬКО на русском. Пользователь пишет на русском, ты отвечаешь на русском. Каждое слово должно быть на русском.',
      en: 'Respond ONLY in English. The user writes in English, you respond in English. Every word must be in English.',
      fr: "Réponds UNIQUEMENT en français. L'utilisateur écrit en français, tu réponds en français. Chaque mot doit être en français.",
      de: 'Antworte NUR auf Deutsch. Der Benutzer schreibt auf Deutsch, du antwortest auf Deutsch. Jedes Wort muss auf Deutsch sein.',
      it: "Rispondi SOLO in italiano. L'utente scrive in italiano, tu rispondi in italiano. Ogni parola deve essere in italiano.",
      pt: 'Responda APENAS em português. O usuário escreve em português, você responde em português. Cada palavra deve ser em português.'
    };

    const targetLanguage = languageNames[languageCode] || 'English';
    const instruction =
      languageInstructions[languageCode] ||
      `Respond ONLY in ${targetLanguage}. The user writes in ${targetLanguage}, you respond in ${targetLanguage}. Every word must be in ${targetLanguage}.`;

    return {
      targetLanguage,
      instruction,
      languageCode
    };
  }
}
