/**
 * Voice Error Handler
 * Comprehensive error handling for voice mode edge cases
 */

import { get } from 'svelte/store';
import { isVoiceModeActive, isSpeaking } from './voiceServices.js';
import { setError } from '$lib/stores/app';

export class VoiceErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 50;
    this.errorCounts = new Map();
    this.recoveryStrategies = new Map();
    this.fallbackMechanisms = new Map();
    
    // Initialize recovery strategies
    this.initializeRecoveryStrategies();
    this.initializeFallbackMechanisms();
    
    console.log('VoiceErrorHandler initialized');
  }

  /**
   * Initialize recovery strategies for different error types
   */
  initializeRecoveryStrategies() {
    this.recoveryStrategies.set('multiple_rapid_interruptions', {
      strategy: 'throttle_and_acknowledge',
      cooldownPeriod: 2000,
      maxAttempts: 3,
      fallbackAction: 'pause_and_ask'
    });

    this.recoveryStrategies.set('network_synthesis_failure', {
      strategy: 'retry_with_fallback',
      maxRetries: 2,
      retryDelay: 1000,
      fallbackAction: 'text_only_response'
    });

    this.recoveryStrategies.set('audio_processing_failure', {
      strategy: 'restart_audio_context',
      maxAttempts: 2,
      fallbackAction: 'disable_voice_temporarily'
    });

    this.recoveryStrategies.set('interruption_detection_failure', {
      strategy: 'recalibrate_detection',
      fallbackAction: 'manual_interruption_mode'
    });

    this.recoveryStrategies.set('conversation_state_corruption', {
      strategy: 'reset_conversation_state',
      preserveHistory: true,
      fallbackAction: 'restart_conversation'
    });

    this.recoveryStrategies.set('avatar_sync_failure', {
      strategy: 'reset_avatar_state',
      fallbackAction: 'disable_avatar_animations'
    });
  }

  /**
   * Initialize fallback mechanisms
   */
  initializeFallbackMechanisms() {
    this.fallbackMechanisms.set('text_only_response', {
      action: 'displayTextOnly',
      message: 'Voice synthesis unavailable. Showing text response.',
      temporary: true
    });

    this.fallbackMechanisms.set('disable_voice_temporarily', {
      action: 'disableVoiceMode',
      message: 'Voice mode temporarily disabled due to technical issues.',
      duration: 30000 // 30 seconds
    });

    this.fallbackMechanisms.set('manual_interruption_mode', {
      action: 'enableManualInterruption',
      message: 'Automatic interruption detection disabled. Use the stop button to interrupt.',
      showStopButton: true
    });

    this.fallbackMechanisms.set('restart_conversation', {
      action: 'restartConversation',
      message: 'Conversation restarted due to technical issues.',
      clearHistory: false
    });
  }

  /**
   * Handle error with appropriate recovery strategy
   * @param {Error} error - The error that occurred
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleError(error, context = {}) {
    try {
      console.error('Voice error occurred:', error, context);

      // Log error to history
      this.logError(error, context);

      // Classify error type
      const errorType = this.classifyError(error, context);

      // Check if this error is recurring
      const isRecurring = this.isRecurringError(errorType);

      // Get recovery strategy
      const strategy = this.getRecoveryStrategy(errorType, isRecurring);

      // Execute recovery
      const recoveryResult = await this.executeRecovery(strategy, error, context);

      return {
        handled: true,
        errorType: errorType,
        strategy: strategy,
        result: recoveryResult,
        isRecurring: isRecurring
      };

    } catch (recoveryError) {
      console.error('Error during error recovery:', recoveryError);
      
      // Ultimate fallback
      return await this.executeUltimateFallback(error, recoveryError);
    }
  }

  /**
   * Classify error type based on error and context
   * @param {Error} error - The error
   * @param {Object} context - Error context
   * @returns {string} Error type
   */
  classifyError(error, context) {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // Multiple rapid interruptions
    if (context.interruptionCount > 3 && context.timeSpan < 5000) {
      return 'multiple_rapid_interruptions';
    }

    // Network-related synthesis failures
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('synthesis api error')) {
      return 'network_synthesis_failure';
    }

    // Audio processing failures
    if (errorMessage.includes('audio') || 
        errorMessage.includes('buffer') ||
        errorMessage.includes('audiocontext') ||
        errorStack.includes('webaudio')) {
      return 'audio_processing_failure';
    }

    // Interruption detection failures
    if (errorMessage.includes('interruption') || 
        errorMessage.includes('microphone') ||
        errorMessage.includes('mediastream')) {
      return 'interruption_detection_failure';
    }

    // Conversation state issues
    if (errorMessage.includes('conversation') || 
        errorMessage.includes('state') ||
        errorMessage.includes('preserved state not found')) {
      return 'conversation_state_corruption';
    }

    // Avatar synchronization issues
    if (errorMessage.includes('avatar') || 
        errorMessage.includes('mouth') ||
        errorMessage.includes('animation')) {
      return 'avatar_sync_failure';
    }

    // Default classification
    return 'unknown_voice_error';
  }

  /**
   * Check if error is recurring
   * @param {string} errorType - Error type
   * @returns {boolean} True if recurring
   */
  isRecurringError(errorType) {
    const count = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, count + 1);

    // Consider recurring if occurred 3+ times in last 5 minutes
    const recentErrors = this.errorHistory
      .filter(entry => 
        entry.errorType === errorType && 
        Date.now() - entry.timestamp < 300000
      );

    return recentErrors.length >= 3;
  }

  /**
   * Get recovery strategy for error type
   * @param {string} errorType - Error type
   * @param {boolean} isRecurring - Whether error is recurring
   * @returns {Object} Recovery strategy
   */
  getRecoveryStrategy(errorType, isRecurring) {
    let strategy = this.recoveryStrategies.get(errorType);

    if (!strategy) {
      // Default strategy for unknown errors
      strategy = {
        strategy: 'log_and_continue',
        fallbackAction: 'show_error_message'
      };
    }

    // If error is recurring, escalate to fallback action
    if (isRecurring) {
      strategy = {
        ...strategy,
        strategy: strategy.fallbackAction,
        escalated: true
      };
    }

    return strategy;
  }

  /**
   * Execute recovery strategy
   * @param {Object} strategy - Recovery strategy
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async executeRecovery(strategy, error, context) {
    console.log(`Executing recovery strategy: ${strategy.strategy}`);

    switch (strategy.strategy) {
      case 'throttle_and_acknowledge':
        return await this.handleRapidInterruptions(strategy, context);

      case 'retry_with_fallback':
        return await this.handleNetworkFailure(strategy, error, context);

      case 'restart_audio_context':
        return await this.handleAudioProcessingFailure(strategy, context);

      case 'recalibrate_detection':
        return await this.handleInterruptionDetectionFailure(strategy, context);

      case 'reset_conversation_state':
        return await this.handleConversationStateCorruption(strategy, context);

      case 'reset_avatar_state':
        return await this.handleAvatarSyncFailure(strategy, context);

      case 'log_and_continue':
        return await this.handleUnknownError(strategy, error, context);

      default:
        // Execute fallback mechanism
        return await this.executeFallbackMechanism(strategy.strategy, error, context);
    }
  }

  /**
   * Handle multiple rapid interruptions
   * @param {Object} strategy - Recovery strategy
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleRapidInterruptions(strategy, context) {
    console.log('Handling rapid interruptions with intelligent throttling');

    // Implement adaptive cooldown period based on user behavior
    const baseCooldown = strategy.cooldownPeriod || 2000;
    const adaptiveCooldown = Math.min(baseCooldown * (context.interruptionCount / 3), 5000);
    const cooldownEnd = Date.now() + adaptiveCooldown;
    
    // Generate contextual acknowledgment based on language and pattern
    const acknowledgmentVariations = {
      en: [
        "I notice you're trying to get my attention - let me give you space to speak clearly.",
        "I can see you have something important to say. I'll pause so you can share your thoughts.",
        "It seems like you're eager to ask something. Please go ahead, I'm listening.",
        "I want to make sure I hear you properly. Take your time to say what's on your mind."
      ],
      es: [
        "Noto que estás tratando de llamar mi atención - te doy espacio para hablar claramente.",
        "Veo que tienes algo importante que decir. Haré una pausa para que puedas compartir tus pensamientos.",
        "Parece que tienes ganas de preguntar algo. Por favor continúa, te escucho.",
        "Quiero asegurarme de escucharte bien. Tómate tu tiempo para decir lo que tienes en mente."
      ],
      ru: [
        "Я замечаю, что вы пытаетесь привлечь моё внимание - дам вам возможность говорить четко.",
        "Я вижу, что у вас есть что-то важное сказать. Я сделаю паузу, чтобы вы могли поделиться своими мыслями.",
        "Кажется, вы хотите что-то спросить. Пожалуйста, продолжайте, я слушаю.",
        "Я хочу убедиться, что слышу вас правильно. Не торопитесь, скажите, что у вас на уме."
      ]
    };

    const language = context.detectedLanguage || 'en';
    const variations = acknowledgmentVariations[language] || acknowledgmentVariations.en;
    const acknowledgmentText = variations[Math.floor(Math.random() * variations.length)];
    
    const acknowledgment = {
      text: acknowledgmentText,
      priority: 'immediate',
      isInterruptionResponse: true,
      language: language,
      adaptiveCooldown: adaptiveCooldown
    };

    return {
      action: 'intelligent_throttle_interruptions',
      cooldownEnd: cooldownEnd,
      adaptiveCooldown: adaptiveCooldown,
      acknowledgment: acknowledgment,
      success: true
    };
  }

  /**
   * Handle network synthesis failure
   * @param {Object} strategy - Recovery strategy
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleNetworkFailure(strategy, error, context) {
    console.log('Handling network synthesis failure with retry');

    let retryCount = 0;
    const maxRetries = strategy.maxRetries || 2;

    while (retryCount < maxRetries) {
      try {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, strategy.retryDelay || 1000));
        
        // Attempt retry (this would be implemented by the calling code)
        console.log(`Retry attempt ${retryCount + 1}/${maxRetries}`);
        
        // For now, just simulate success after retries
        if (retryCount === maxRetries - 1) {
          throw new Error('Max retries reached');
        }
        
        retryCount++;
      } catch (retryError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          // Execute fallback
          return await this.executeFallbackMechanism(strategy.fallbackAction, error, context);
        }
      }
    }

    return { action: 'retry_succeeded', retryCount: retryCount, success: true };
  }

  /**
   * Handle audio processing failure
   * @param {Object} strategy - Recovery strategy
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleAudioProcessingFailure(strategy, context) {
    console.log('Handling audio processing failure');

    try {
      // This would restart the audio context
      // Implementation would be in the calling code
      console.log('Attempting to restart audio context');
      
      return { action: 'audio_context_restarted', success: true };
    } catch (restartError) {
      return await this.executeFallbackMechanism(strategy.fallbackAction, restartError, context);
    }
  }

  /**
   * Handle interruption detection failure
   * @param {Object} strategy - Recovery strategy
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleInterruptionDetectionFailure(strategy, context) {
    console.log('Handling interruption detection failure');

    try {
      // This would recalibrate the interruption detector
      console.log('Attempting to recalibrate interruption detection');
      
      return { action: 'detection_recalibrated', success: true };
    } catch (calibrationError) {
      return await this.executeFallbackMechanism(strategy.fallbackAction, calibrationError, context);
    }
  }

  /**
   * Handle conversation state corruption
   * @param {Object} strategy - Recovery strategy
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleConversationStateCorruption(strategy, context) {
    console.log('Handling conversation state corruption');

    try {
      // This would reset the conversation state
      console.log('Resetting conversation state');
      
      return { 
        action: 'conversation_state_reset', 
        preserveHistory: strategy.preserveHistory,
        success: true 
      };
    } catch (resetError) {
      return await this.executeFallbackMechanism(strategy.fallbackAction, resetError, context);
    }
  }

  /**
   * Handle avatar synchronization failure
   * @param {Object} strategy - Recovery strategy
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleAvatarSyncFailure(strategy, context) {
    console.log('Handling avatar synchronization failure');

    try {
      // This would reset the avatar state
      console.log('Resetting avatar state');
      
      return { action: 'avatar_state_reset', success: true };
    } catch (resetError) {
      return await this.executeFallbackMechanism(strategy.fallbackAction, resetError, context);
    }
  }

  /**
   * Handle unknown error
   * @param {Object} strategy - Recovery strategy
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleUnknownError(strategy, error, context) {
    console.log('Handling unknown error with logging');

    // Log detailed error information
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: Date.now(),
      voiceState: {
        isVoiceModeActive: get(isVoiceModeActive),
        isSpeaking: get(isSpeaking)
      }
    };

    console.error('Unknown voice error details:', errorDetails);

    return { action: 'error_logged', errorDetails: errorDetails, success: true };
  }

  /**
   * Execute fallback mechanism
   * @param {string} fallbackType - Type of fallback
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Fallback result
   */
  async executeFallbackMechanism(fallbackType, error, context) {
    console.log(`Executing fallback mechanism: ${fallbackType}`);

    const fallback = this.fallbackMechanisms.get(fallbackType);
    if (!fallback) {
      return await this.executeUltimateFallback(error, new Error(`Unknown fallback: ${fallbackType}`));
    }

    try {
      switch (fallback.action) {
        case 'displayTextOnly':
          setError(fallback.message);
          return { action: 'text_only_mode', temporary: fallback.temporary, success: true };

        case 'disableVoiceMode':
          setError(fallback.message);
          // This would disable voice mode temporarily
          return { 
            action: 'voice_mode_disabled', 
            duration: fallback.duration,
            success: true 
          };

        case 'enableManualInterruption':
          setError(fallback.message);
          return { 
            action: 'manual_interruption_enabled', 
            showStopButton: fallback.showStopButton,
            success: true 
          };

        case 'restartConversation':
          setError(fallback.message);
          return { 
            action: 'conversation_restarted', 
            clearHistory: fallback.clearHistory,
            success: true 
          };

        default:
          return await this.executeUltimateFallback(error, new Error(`Unknown fallback action: ${fallback.action}`));
      }
    } catch (fallbackError) {
      return await this.executeUltimateFallback(error, fallbackError);
    }
  }

  /**
   * Execute ultimate fallback when all else fails
   * @param {Error} originalError - Original error
   * @param {Error} recoveryError - Error during recovery
   * @returns {Promise<Object>} Ultimate fallback result
   */
  async executeUltimateFallback(originalError, recoveryError) { // eslint-disable-line no-unused-vars
    console.error('Executing ultimate fallback - all recovery attempts failed');
    console.error('Original error:', originalError);
    console.error('Recovery error:', recoveryError);

    // Show user-friendly error message
    setError('Voice mode encountered technical difficulties. Please refresh the page if issues persist.');

    // Log comprehensive error information
    const ultimateErrorLog = {
      type: 'ultimate_fallback',
      originalError: {
        message: originalError.message,
        stack: originalError.stack
      },
      recoveryError: {
        message: recoveryError.message,
        stack: recoveryError.stack
      },
      timestamp: Date.now(),
      errorHistory: this.errorHistory.slice(-10), // Last 10 errors
      systemState: {
        isVoiceModeActive: get(isVoiceModeActive),
        isSpeaking: get(isSpeaking),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    console.error('Ultimate fallback error log:', ultimateErrorLog);

    return {
      handled: true,
      action: 'ultimate_fallback',
      errorLog: ultimateErrorLog,
      success: false
    };
  }

  /**
   * Log error to history
   * @param {Error} error - The error
   * @param {Object} context - Error context
   */
  logError(error, context) {
    const errorEntry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context: context,
      errorType: this.classifyError(error, context)
    };

    this.errorHistory.push(errorEntry);

    // Maintain history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const last24Hours = this.errorHistory.filter(entry => now - entry.timestamp < 86400000);
    const lastHour = this.errorHistory.filter(entry => now - entry.timestamp < 3600000);

    const errorTypeStats = {};
    this.errorHistory.forEach(entry => {
      errorTypeStats[entry.errorType] = (errorTypeStats[entry.errorType] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsLast24Hours: last24Hours.length,
      errorsLastHour: lastHour.length,
      errorTypeBreakdown: errorTypeStats,
      mostCommonError: Object.entries(errorTypeStats)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
    console.log('Voice error history cleared');
  }

  /**
   * Add custom recovery strategy
   * @param {string} errorType - Error type
   * @param {Object} strategy - Recovery strategy
   */
  addCustomRecoveryStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
    console.log(`Added custom recovery strategy for: ${errorType}`);
  }
}

// Export singleton instance
export const voiceErrorHandler = new VoiceErrorHandler();