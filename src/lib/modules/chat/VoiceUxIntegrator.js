/**
 * Voice UX Integrator
 * Coordinates all voice UX components for seamless user experience
 */

import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { voiceUxPolisher } from './VoiceUxPolisher.js';
import { voiceErrorHandler } from './VoiceErrorHandler.js';
import { interruptionResponseGenerator } from './InterruptionResponseGenerator.js';
import { voiceInteractionLogger } from './VoiceInteractionLogger.js';

export class VoiceUxIntegrator {
  constructor() {
    this.isInitialized = false;
    this.activeSession = null;
    this.uxMetrics = {
      sessionsCompleted: 0,
      averageSatisfaction: 0,
      edgeCasesHandled: 0,
      naturalResponsesGenerated: 0
    };
    
    console.log('VoiceUxIntegrator initialized');
  }

  /**
   * Initialize the UX integration system
   * @param {Object} options - Initialization options
   */
  async initialize(options = {}) {
    try {
      console.log('Initializing Voice UX Integration system...');

      // Load user preferences
      await this.loadUserPreferences();

      // Initialize components
      await this.initializeComponents(options);

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('Voice UX Integration system initialized successfully');

    } catch (error) {
      console.error('Error initializing Voice UX Integration system:', error);
      throw error;
    }
  }

  /**
   * Start a new voice UX session
   * @param {Object} sessionOptions - Session configuration
   * @returns {string} Session ID
   */
  startSession(sessionOptions = {}) {
    const sessionId = `ux_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.activeSession = {
      id: sessionId,
      startTime: Date.now(),
      options: sessionOptions,
      interactions: [],
      edgeCasesHandled: 0,
      userSatisfactionScore: 0.5,
      language: sessionOptions.language || get(selectedLanguage),
      preferences: { ...voiceUxPolisher.userPreferences }
    };

    console.log(`Started voice UX session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Process a voice interaction with full UX enhancement
   * @param {Object} interactionContext - Context of the interaction
   * @returns {Promise<Object>} Enhanced interaction result
   */
  async processInteraction(interactionContext) {
    if (!this.isInitialized) {
      console.warn('VoiceUxIntegrator not initialized, using basic processing');
      return { success: false, error: 'Not initialized' };
    }

    try {
      console.log('Processing voice interaction with UX enhancement:', interactionContext);

      // Add interaction to session
      if (this.activeSession) {
        this.activeSession.interactions.push({
          timestamp: Date.now(),
          context: interactionContext
        });
      }

      // Apply UX polishing
      const polishingResult = await voiceUxPolisher.applyUxPolishing(interactionContext);

      // Handle any errors that occurred
      if (interactionContext.error) {
        const errorResult = await voiceErrorHandler.handleError(
          interactionContext.error, 
          interactionContext
        );
        polishingResult.errorHandling = errorResult;
      }

      // Generate appropriate responses if needed
      if (interactionContext.needsResponse) {
        const responseResult = await this.generateEnhancedResponse(interactionContext);
        polishingResult.response = responseResult;
      }

      // Update session metrics
      this.updateSessionMetrics(polishingResult);

      // Log the interaction
      this.logInteraction(interactionContext, polishingResult);

      return {
        success: true,
        sessionId: this.activeSession?.id,
        polishingResult: polishingResult,
        enhancementsApplied: polishingResult.enhancementsApplied || 0,
        edgeCasesHandled: polishingResult.edgeCasesHandled || 0,
        userSatisfactionScore: polishingResult.userSatisfactionScore || 0.5
      };

    } catch (error) {
      console.error('Error processing voice interaction:', error);
      
      // Handle processing errors gracefully
      const fallbackResult = await this.handleProcessingError(error, interactionContext);
      return fallbackResult;
    }
  }

  /**
   * Generate enhanced response with natural language processing
   * @param {Object} context - Interaction context
   * @returns {Promise<Object>} Enhanced response
   */
  async generateEnhancedResponse(context) {
    try {
      // Determine response type based on context
      const responseType = this.determineResponseType(context);

      let response;
      switch (responseType) {
        case 'interruption_acknowledgment':
          response = await interruptionResponseGenerator.generateResponse(
            context.detectedLanguage || get(selectedLanguage),
            context
          );
          break;

        case 'error_recovery':
          response = await this.generateErrorRecoveryResponse(context);
          break;

        case 'contextual_help':
          response = await this.generateContextualHelpResponse(context);
          break;

        default:
          response = await this.generateStandardResponse(context);
      }

      // Apply natural language enhancements
      const enhancedResponse = await this.applyNaturalLanguageEnhancements(response, context);

      return {
        type: responseType,
        original: response,
        enhanced: enhancedResponse,
        language: context.detectedLanguage || get(selectedLanguage),
        confidence: response.confidence || 0.8
      };

    } catch (error) {
      console.error('Error generating enhanced response:', error);
      return this.getFallbackResponse(context);
    }
  }

  /**
   * Determine the type of response needed
   * @param {Object} context - Interaction context
   * @returns {string} Response type
   */
  determineResponseType(context) {
    if (context.isInterruption) return 'interruption_acknowledgment';
    if (context.error || context.needsErrorRecovery) return 'error_recovery';
    if (context.userFrustration || context.needsHelp) return 'contextual_help';
    return 'standard_response';
  }

  /**
   * Generate error recovery response
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery response
   */
  async generateErrorRecoveryResponse(context) { // eslint-disable-line no-unused-vars
    const language = context.detectedLanguage || get(selectedLanguage);
    
    const recoveryMessages = {
      en: {
        network_error: "I'm experiencing some connection issues, but I'm still here to help.",
        audio_error: "There seems to be an audio hiccup. Let me try that again.",
        processing_error: "I encountered a small technical issue. Please give me a moment.",
        general_error: "Something went wrong, but I'm working to fix it."
      },
      es: {
        network_error: "Estoy experimentando algunos problemas de conexión, pero sigo aquí para ayudar.",
        audio_error: "Parece haber un problema de audio. Déjame intentar de nuevo.",
        processing_error: "Encontré un pequeño problema técnico. Dame un momento por favor.",
        general_error: "Algo salió mal, pero estoy trabajando para solucionarlo."
      },
      ru: {
        network_error: "У меня проблемы с подключением, но я всё ещё здесь, чтобы помочь.",
        audio_error: "Кажется, есть проблема с аудио. Позвольте мне попробовать ещё раз.",
        processing_error: "Я столкнулся с небольшой технической проблемой. Дайте мне минуту.",
        general_error: "Что-то пошло не так, но я работаю над исправлением."
      }
    };

    const messages = recoveryMessages[language] || recoveryMessages.en;
    const errorType = this.classifyErrorType(context.error);
    const message = messages[errorType] || messages.general_error;

    return {
      text: message,
      type: 'error_recovery',
      language: language,
      confidence: 0.9
    };
  }

  /**
   * Generate contextual help response
   * @param {Object} context - Help context
   * @returns {Promise<Object>} Help response
   */
  async generateContextualHelpResponse(context) {
    const language = context.detectedLanguage || get(selectedLanguage);
    
    const helpMessages = {
      en: {
        voice_commands: "You can interrupt me anytime by just starting to speak. I'll pause and listen.",
        technical_issues: "If you're having technical issues, try refreshing the page or checking your microphone settings.",
        interaction_tips: "For the best experience, speak clearly and wait for me to acknowledge before continuing.",
        general_help: "I'm here to help! Feel free to ask questions or let me know if you need assistance with anything."
      },
      es: {
        voice_commands: "Puedes interrumpirme en cualquier momento simplemente empezando a hablar. Haré una pausa y escucharé.",
        technical_issues: "Si tienes problemas técnicos, intenta actualizar la página o revisar la configuración de tu micrófono.",
        interaction_tips: "Para la mejor experiencia, habla claramente y espera a que reconozca antes de continuar.",
        general_help: "¡Estoy aquí para ayudar! Siéntete libre de hacer preguntas o déjame saber si necesitas ayuda con algo."
      },
      ru: {
        voice_commands: "Вы можете прервать меня в любое время, просто начав говорить. Я сделаю паузу и буду слушать.",
        technical_issues: "Если у вас технические проблемы, попробуйте обновить страницу или проверить настройки микрофона.",
        interaction_tips: "Для лучшего опыта говорите четко и ждите моего подтверждения перед продолжением.",
        general_help: "Я здесь, чтобы помочь! Не стесняйтесь задавать вопросы или дайте знать, если нужна помощь с чем-либо."
      }
    };

    const messages = helpMessages[language] || helpMessages.en;
    const helpType = this.determineHelpType(context);
    const message = messages[helpType] || messages.general_help;

    return {
      text: message,
      type: 'contextual_help',
      language: language,
      confidence: 0.85
    };
  }

  /**
   * Generate standard response
   * @param {Object} context - Response context
   * @returns {Promise<Object>} Standard response
   */
  async generateStandardResponse(context) {
    return {
      text: "I'm here and ready to help.",
      type: 'standard_response',
      language: context.detectedLanguage || get(selectedLanguage),
      confidence: 0.7
    };
  }

  /**
   * Apply natural language enhancements to response
   * @param {Object} response - Original response
   * @param {Object} context - Interaction context
   * @returns {Promise<Object>} Enhanced response
   */
  async applyNaturalLanguageEnhancements(response, context) {
    // Apply user preference-based modifications
    const preferences = voiceUxPolisher.userPreferences;
    
    let enhancedText = response.text;

    // Adjust response style based on preferences
    if (preferences.responseStyle === 'concise') {
      enhancedText = this.makeConcise(enhancedText);
    } else if (preferences.responseStyle === 'detailed') {
      enhancedText = this.makeDetailed(enhancedText, context);
    }

    // Add natural variations if enabled
    if (voiceUxPolisher.advancedPreferences.contextualAcknowledgments) {
      enhancedText = this.addContextualElements(enhancedText, context);
    }

    return {
      ...response,
      text: enhancedText,
      enhanced: true,
      enhancements: {
        styleAdjusted: preferences.responseStyle !== 'natural',
        contextualElements: voiceUxPolisher.advancedPreferences.contextualAcknowledgments,
        naturalVariations: true
      }
    };
  }

  /**
   * Make response more concise
   * @param {string} text - Original text
   * @returns {string} Concise text
   */
  makeConcise(text) {
    // Remove unnecessary words and phrases
    return text
      .replace(/I'm here and ready to help\./g, "Ready to help.")
      .replace(/Let me /g, "")
      .replace(/I can /g, "")
      .replace(/Please /g, "")
      .trim();
  }

  /**
   * Make response more detailed
   * @param {string} text - Original text
   * @param {Object} context - Context for details
   * @returns {string} Detailed text
   */
  makeDetailed(text, context) {
    // Add helpful context and explanations
    if (text.includes("I'm here")) {
      return text + " Feel free to ask me anything or let me know how I can assist you today.";
    }
    return text;
  }

  /**
   * Add contextual elements to response
   * @param {string} text - Original text
   * @param {Object} context - Interaction context
   * @returns {string} Text with contextual elements
   */
  addContextualElements(text, context) {
    // Add appropriate contextual starters based on interaction history
    if (context.isFollowUp) {
      return `Continuing our conversation, ${text.toLowerCase()}`;
    }
    
    if (context.isFirstInteraction) {
      return `Welcome! ${text}`;
    }
    
    return text;
  }

  /**
   * Get fallback response for error cases
   * @param {Object} context - Error context
   * @returns {Object} Fallback response
   */
  getFallbackResponse(context) {
    const language = context.detectedLanguage || get(selectedLanguage);
    
    const fallbackMessages = {
      en: "I'm here to help. What can I do for you?",
      es: "Estoy aquí para ayudar. ¿Qué puedo hacer por ti?",
      ru: "Я здесь, чтобы помочь. Что я могу для вас сделать?"
    };

    return {
      text: fallbackMessages[language] || fallbackMessages.en,
      type: 'fallback_response',
      language: language,
      confidence: 0.5,
      isFallback: true
    };
  }

  /**
   * Classify error type for appropriate response
   * @param {Error} error - The error to classify
   * @returns {string} Error type
   */
  classifyErrorType(error) {
    if (!error) return 'general_error';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) return 'network_error';
    if (message.includes('audio') || message.includes('microphone')) return 'audio_error';
    if (message.includes('processing') || message.includes('timeout')) return 'processing_error';
    
    return 'general_error';
  }

  /**
   * Determine help type needed
   * @param {Object} context - Help context
   * @returns {string} Help type
   */
  determineHelpType(context) {
    if (context.voiceCommandIssues) return 'voice_commands';
    if (context.technicalIssues) return 'technical_issues';
    if (context.interactionDifficulties) return 'interaction_tips';
    return 'general_help';
  }

  /**
   * Handle processing errors gracefully
   * @param {Error} error - Processing error
   * @param {Object} context - Original context
   * @returns {Promise<Object>} Fallback result
   */
  async handleProcessingError(error, context) {
    console.error('Voice UX processing error:', error);

    // Log the error for analysis
    voiceInteractionLogger.log('error', 'ux_processing_error', {
      error: error.message,
      context: context,
      timestamp: Date.now()
    });

    // Provide graceful fallback
    return {
      success: false,
      error: error.message,
      fallbackApplied: true,
      fallbackResponse: this.getFallbackResponse(context)
    };
  }

  /**
   * Update session metrics
   * @param {Object} result - Processing result
   */
  updateSessionMetrics(result) {
    if (!this.activeSession) return;

    this.activeSession.edgeCasesHandled += result.edgeCasesHandled || 0;
    this.activeSession.userSatisfactionScore = result.userSatisfactionScore || this.activeSession.userSatisfactionScore;
  }

  /**
   * Log interaction for analysis
   * @param {Object} context - Interaction context
   * @param {Object} result - Processing result
   */
  logInteraction(context, result) {
    voiceInteractionLogger.log('user_experience', 'interaction_processed', {
      sessionId: this.activeSession?.id,
      context: context,
      result: result,
      timestamp: Date.now()
    });
  }

  /**
   * End current session and collect metrics
   * @returns {Object} Session summary
   */
  endSession() {
    if (!this.activeSession) {
      console.warn('No active session to end');
      return null;
    }

    const sessionSummary = {
      id: this.activeSession.id,
      duration: Date.now() - this.activeSession.startTime,
      interactions: this.activeSession.interactions.length,
      edgeCasesHandled: this.activeSession.edgeCasesHandled,
      userSatisfactionScore: this.activeSession.userSatisfactionScore,
      language: this.activeSession.language
    };

    // Update global metrics
    this.uxMetrics.sessionsCompleted++;
    this.uxMetrics.averageSatisfaction = 
      (this.uxMetrics.averageSatisfaction * (this.uxMetrics.sessionsCompleted - 1) + 
       sessionSummary.userSatisfactionScore) / this.uxMetrics.sessionsCompleted;
    this.uxMetrics.edgeCasesHandled += sessionSummary.edgeCasesHandled;

    console.log('Voice UX session ended:', sessionSummary);
    
    this.activeSession = null;
    return sessionSummary;
  }

  /**
   * Load user preferences
   */
  async loadUserPreferences() {
    // This is handled by the VoiceUxPolisher
    console.log('User preferences loaded by VoiceUxPolisher');
  }

  /**
   * Initialize components
   * @param {Object} options - Initialization options
   */
  async initializeComponents(options) { // eslint-disable-line no-unused-vars
    // Components are initialized as singletons
    console.log('Voice UX components initialized');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Set up listeners for preference changes, errors, etc.
    console.log('Voice UX event listeners set up');
  }

  /**
   * Get comprehensive UX statistics
   * @returns {Object} UX statistics
   */
  getUxStatistics() {
    return {
      global: this.uxMetrics,
      currentSession: this.activeSession ? {
        id: this.activeSession.id,
        duration: Date.now() - this.activeSession.startTime,
        interactions: this.activeSession.interactions.length,
        edgeCasesHandled: this.activeSession.edgeCasesHandled,
        userSatisfactionScore: this.activeSession.userSatisfactionScore
      } : null,
      polisher: voiceUxPolisher.getUxStats(),
      errorHandler: voiceErrorHandler.getErrorStats(),
      responseGenerator: interruptionResponseGenerator.getStats()
    };
  }
}

// Export singleton instance
export const voiceUxIntegrator = new VoiceUxIntegrator();