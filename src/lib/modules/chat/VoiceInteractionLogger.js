/**
 * Voice Interaction Logger
 * Comprehensive logging system for voice interactions and analysis
 */

import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { isVoiceModeActive, isSpeaking } from './voiceServices.js';

export class VoiceInteractionLogger {
  constructor() {
    this.logs = [];
    this.maxLogSize = 1000;
    this.sessionId = null;
    this.sessionStartTime = null;
    
    // Log categories
    this.logCategories = {
      VOICE_STUTTERING: 'voice_stuttering',
      INTERRUPTION: 'interruption',
      LANGUAGE_DETECTION: 'language_detection',
      AUDIO_SYNTHESIS: 'audio_synthesis',
      AVATAR_SYNC: 'avatar_sync',
      CONVERSATION_FLOW: 'conversation_flow',
      ERROR: 'error',
      PERFORMANCE: 'performance',
      USER_EXPERIENCE: 'user_experience'
    };

    // Performance metrics
    this.performanceMetrics = {
      stutteringEvents: 0,
      interruptionCount: 0,
      synthesisFailures: 0,
      averageResponseTime: 0,
      totalInteractions: 0
    };

    // Stuttering detection
    this.stutteringDetection = {
      lastAudioEvent: null,
      audioGaps: [],
      stutteringThreshold: 100 // ms
    };

    console.log('VoiceInteractionLogger initialized');
  }

  /**
   * Start a new logging session
   * @param {Object} sessionInfo - Session information
   */
  startSession(sessionInfo = {}) {
    this.sessionId = `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();
    
    this.log(this.logCategories.USER_EXPERIENCE, 'session_started', {
      sessionId: this.sessionId,
      ...sessionInfo,
      timestamp: this.sessionStartTime,
      userAgent: navigator.userAgent,
      language: get(selectedLanguage)
    });

    console.log(`Voice logging session started: ${this.sessionId}`);
  }

  /**
   * End the current logging session
   */
  endSession() {
    if (!this.sessionId) return;

    const sessionDuration = Date.now() - this.sessionStartTime;
    const sessionSummary = this.generateSessionSummary();

    this.log(this.logCategories.USER_EXPERIENCE, 'session_ended', {
      sessionId: this.sessionId,
      duration: sessionDuration,
      summary: sessionSummary,
      timestamp: Date.now()
    });

    console.log(`Voice logging session ended: ${this.sessionId}, duration: ${sessionDuration}ms`);
    
    // Reset session
    this.sessionId = null;
    this.sessionStartTime = null;
  }

  /**
   * Log voice stuttering event
   * @param {Object} stutteringData - Stuttering event data
   */
  logStuttering(stutteringData) {
    const stutteringEvent = {
      type: 'audio_stuttering',
      audioGap: stutteringData.audioGap || 0,
      expectedContinuity: stutteringData.expectedContinuity || false,
      audioSource: stutteringData.audioSource || 'unknown',
      bufferUnderrun: stutteringData.bufferUnderrun || false,
      networkLatency: stutteringData.networkLatency || null,
      audioQueueState: stutteringData.audioQueueState || {},
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.VOICE_STUTTERING, 'stuttering_detected', stutteringEvent);
    this.performanceMetrics.stutteringEvents++;

    // Track stuttering patterns
    this.trackStutteringPattern(stutteringEvent);

    console.log('Voice stuttering logged:', stutteringEvent);
  }

  /**
   * Log interruption event
   * @param {Object} interruptionData - Interruption event data
   */
  logInterruption(interruptionData) {
    const interruptionEvent = {
      type: 'user_interruption',
      confidence: interruptionData.confidence || 0,
      energy: interruptionData.energy || 0,
      detectedLanguage: interruptionData.detectedLanguage || 'unknown',
      languageConfidence: interruptionData.languageConfidence || 0,
      interruptionPoint: interruptionData.interruptionPoint || null,
      currentResponseType: interruptionData.currentResponseType || 'unknown',
      handlingTime: interruptionData.handlingTime || null,
      successful: interruptionData.successful !== false,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.INTERRUPTION, 'interruption_detected', interruptionEvent);
    this.performanceMetrics.interruptionCount++;

    console.log('Interruption logged:', interruptionEvent);
  }

  /**
   * Log language detection event
   * @param {Object} languageData - Language detection data
   */
  logLanguageDetection(languageData) {
    const languageEvent = {
      type: 'language_detection',
      detectedLanguage: languageData.detectedLanguage || 'unknown',
      confidence: languageData.confidence || 0,
      method: languageData.method || 'unknown',
      audioCharacteristics: languageData.audioCharacteristics || {},
      fallbackUsed: languageData.fallbackUsed || false,
      processingTime: languageData.processingTime || null,
      previousLanguage: languageData.previousLanguage || null,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.LANGUAGE_DETECTION, 'language_detected', languageEvent);

    console.log('Language detection logged:', languageEvent);
  }

  /**
   * Log audio synthesis event
   * @param {Object} synthesisData - Synthesis event data
   */
  logAudioSynthesis(synthesisData) {
    const synthesisEvent = {
      type: 'audio_synthesis',
      text: synthesisData.text ? synthesisData.text.substring(0, 100) : '',
      language: synthesisData.language || 'unknown',
      isWaitingPhrase: synthesisData.isWaitingPhrase || false,
      synthesisTime: synthesisData.synthesisTime || null,
      networkTime: synthesisData.networkTime || null,
      audioSize: synthesisData.audioSize || null,
      success: synthesisData.success !== false,
      error: synthesisData.error || null,
      retryCount: synthesisData.retryCount || 0,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.AUDIO_SYNTHESIS, 'synthesis_completed', synthesisEvent);

    if (!synthesisEvent.success) {
      this.performanceMetrics.synthesisFailures++;
    }

    console.log('Audio synthesis logged:', synthesisEvent);
  }

  /**
   * Log avatar synchronization event
   * @param {Object} avatarData - Avatar sync data
   */
  logAvatarSync(avatarData) {
    const avatarEvent = {
      type: 'avatar_synchronization',
      mouthPosition: avatarData.mouthPosition || null,
      emotion: avatarData.emotion || 'neutral',
      speaking: avatarData.speaking || false,
      audioAmplitude: avatarData.audioAmplitude || 0,
      syncAccuracy: avatarData.syncAccuracy || null,
      animationDelay: avatarData.animationDelay || null,
      phonemeDetected: avatarData.phonemeDetected || null,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.AVATAR_SYNC, 'avatar_updated', avatarEvent);

    console.log('Avatar sync logged:', avatarEvent);
  }

  /**
   * Log conversation flow event
   * @param {Object} conversationData - Conversation flow data
   */
  logConversationFlow(conversationData) {
    const conversationEvent = {
      type: 'conversation_flow',
      action: conversationData.action || 'unknown',
      responseId: conversationData.responseId || null,
      preservedStateId: conversationData.preservedStateId || null,
      continuationStrategy: conversationData.continuationStrategy || null,
      userChoice: conversationData.userChoice || null,
      successful: conversationData.successful !== false,
      processingTime: conversationData.processingTime || null,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.CONVERSATION_FLOW, 'flow_action', conversationEvent);

    console.log('Conversation flow logged:', conversationEvent);
  }

  /**
   * Log performance metrics
   * @param {Object} performanceData - Performance data
   */
  logPerformance(performanceData) {
    const performanceEvent = {
      type: 'performance_metric',
      metric: performanceData.metric || 'unknown',
      value: performanceData.value || 0,
      unit: performanceData.unit || 'ms',
      context: performanceData.context || {},
      threshold: performanceData.threshold || null,
      withinThreshold: performanceData.withinThreshold !== false,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.PERFORMANCE, 'metric_recorded', performanceEvent);

    // Update running averages
    this.updatePerformanceMetrics(performanceEvent);

    console.log('Performance logged:', performanceEvent);
  }

  /**
   * Log error event
   * @param {Object} errorData - Error data
   */
  logError(errorData) {
    const errorEvent = {
      type: 'voice_error',
      errorType: errorData.errorType || 'unknown',
      message: errorData.message || '',
      stack: errorData.stack || null,
      context: errorData.context || {},
      recoveryAttempted: errorData.recoveryAttempted || false,
      recoverySuccessful: errorData.recoverySuccessful || false,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.log(this.logCategories.ERROR, 'error_occurred', errorEvent);

    console.log('Error logged:', errorEvent);
  }

  /**
   * Generic log method
   * @param {string} category - Log category
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  log(category, event, data) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: category,
      event: event,
      data: data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      voiceState: {
        isVoiceModeActive: get(isVoiceModeActive),
        isSpeaking: get(isSpeaking),
        currentLanguage: get(selectedLanguage)
      }
    };

    this.logs.push(logEntry);

    // Maintain log size
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    // Emit log event for real-time monitoring
    this.emitLogEvent(logEntry);
  }

  /**
   * Track stuttering patterns
   * @param {Object} stutteringEvent - Stuttering event
   */
  trackStutteringPattern(stutteringEvent) {
    this.stutteringDetection.audioGaps.push({
      gap: stutteringEvent.audioGap,
      timestamp: stutteringEvent.timestamp
    });

    // Keep only recent gaps (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    this.stutteringDetection.audioGaps = this.stutteringDetection.audioGaps
      .filter(gap => gap.timestamp > fiveMinutesAgo);

    // Detect patterns
    if (this.stutteringDetection.audioGaps.length > 5) {
      const averageGap = this.stutteringDetection.audioGaps
        .reduce((sum, gap) => sum + gap.gap, 0) / this.stutteringDetection.audioGaps.length;

      if (averageGap > this.stutteringDetection.stutteringThreshold) {
        this.log(this.logCategories.VOICE_STUTTERING, 'stuttering_pattern_detected', {
          averageGap: averageGap,
          gapCount: this.stutteringDetection.audioGaps.length,
          pattern: 'frequent_stuttering'
        });
      }
    }
  }

  /**
   * Update performance metrics
   * @param {Object} performanceEvent - Performance event
   */
  updatePerformanceMetrics(performanceEvent) {
    const { metric, value } = performanceEvent;

    switch (metric) {
      case 'response_time':
        this.performanceMetrics.totalInteractions++;
        const currentAvg = this.performanceMetrics.averageResponseTime;
        const count = this.performanceMetrics.totalInteractions;
        this.performanceMetrics.averageResponseTime = 
          ((currentAvg * (count - 1)) + value) / count;
        break;

      case 'synthesis_time':
        // Track synthesis performance
        break;

      case 'interruption_handling_time':
        // Track interruption handling performance
        break;
    }
  }

  /**
   * Generate session summary
   * @returns {Object} Session summary
   */
  generateSessionSummary() {
    const sessionLogs = this.logs.filter(log => log.sessionId === this.sessionId);
    
    const summary = {
      totalEvents: sessionLogs.length,
      eventsByCategory: {},
      stutteringEvents: this.performanceMetrics.stutteringEvents,
      interruptionCount: this.performanceMetrics.interruptionCount,
      synthesisFailures: this.performanceMetrics.synthesisFailures,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      languages: new Set(),
      errors: []
    };

    // Analyze session logs
    sessionLogs.forEach(log => {
      // Count by category
      summary.eventsByCategory[log.category] = 
        (summary.eventsByCategory[log.category] || 0) + 1;

      // Collect languages
      if (log.data.language) {
        summary.languages.add(log.data.language);
      }
      if (log.data.detectedLanguage) {
        summary.languages.add(log.data.detectedLanguage);
      }

      // Collect errors
      if (log.category === this.logCategories.ERROR) {
        summary.errors.push({
          type: log.data.errorType,
          message: log.data.message,
          timestamp: log.timestamp
        });
      }
    });

    summary.languages = Array.from(summary.languages);

    return summary;
  }

  /**
   * Get logs by category
   * @param {string} category - Log category
   * @param {number} limit - Maximum number of logs to return
   * @returns {Array} Filtered logs
   */
  getLogsByCategory(category, limit = 100) {
    return this.logs
      .filter(log => log.category === category)
      .slice(-limit);
  }

  /**
   * Get logs by time range
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {Array} Filtered logs
   */
  getLogsByTimeRange(startTime, endTime) {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Get performance analytics
   * @returns {Object} Performance analytics
   */
  getPerformanceAnalytics() {
    const recentLogs = this.logs.filter(log => 
      Date.now() - log.timestamp < 3600000 // Last hour
    );

    const analytics = {
      ...this.performanceMetrics,
      recentActivity: {
        totalEvents: recentLogs.length,
        stutteringRate: recentLogs.filter(log => 
          log.category === this.logCategories.VOICE_STUTTERING
        ).length,
        interruptionRate: recentLogs.filter(log => 
          log.category === this.logCategories.INTERRUPTION
        ).length,
        errorRate: recentLogs.filter(log => 
          log.category === this.logCategories.ERROR
        ).length
      }
    };

    return analytics;
  }

  /**
   * Export logs for analysis
   * @param {Object} options - Export options
   * @returns {Object} Exported data
   */
  exportLogs(options = {}) {
    const {
      category = null,
      startTime = null,
      endTime = null,
      format = 'json'
    } = options;

    let exportLogs = [...this.logs];

    // Apply filters
    if (category) {
      exportLogs = exportLogs.filter(log => log.category === category);
    }

    if (startTime) {
      exportLogs = exportLogs.filter(log => log.timestamp >= startTime);
    }

    if (endTime) {
      exportLogs = exportLogs.filter(log => log.timestamp <= endTime);
    }

    const exportData = {
      exportTimestamp: Date.now(),
      sessionId: this.sessionId,
      totalLogs: exportLogs.length,
      performanceMetrics: this.performanceMetrics,
      logs: exportLogs
    };

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Convert logs to CSV format
   * @param {Object} exportData - Export data
   * @returns {string} CSV string
   */
  convertToCSV(exportData) {
    const headers = ['timestamp', 'category', 'event', 'sessionId', 'data'];
    const rows = exportData.logs.map(log => [
      log.timestamp,
      log.category,
      log.event,
      log.sessionId,
      JSON.stringify(log.data)
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Emit log event for real-time monitoring
   * @param {Object} logEntry - Log entry
   */
  emitLogEvent(logEntry) {
    // This could emit events to external monitoring systems
    // For now, just console log for debugging
    if (logEntry.category === this.logCategories.ERROR) {
      console.warn('Voice error logged:', logEntry);
    }
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.performanceMetrics = {
      stutteringEvents: 0,
      interruptionCount: 0,
      synthesisFailures: 0,
      averageResponseTime: 0,
      totalInteractions: 0
    };
    console.log('Voice interaction logs cleared');
  }

  /**
   * Get logging statistics
   * @returns {Object} Logging statistics
   */
  getStats() {
    return {
      totalLogs: this.logs.length,
      currentSessionId: this.sessionId,
      sessionStartTime: this.sessionStartTime,
      performanceMetrics: { ...this.performanceMetrics },
      logCategories: Object.keys(this.logCategories),
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : null,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
    };
  }
}

// Export singleton instance
export const voiceInteractionLogger = new VoiceInteractionLogger();