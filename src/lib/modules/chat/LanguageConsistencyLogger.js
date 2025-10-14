/**
 * Language Consistency Logger
 * Provides comprehensive logging and monitoring for language detection and validation
 */

export class LanguageConsistencyLogger {
  constructor() {
    // In-memory storage for metrics and logs
    // In production, this could be backed by a proper logging service
    this.detectionLogs = [];
    this.validationLogs = [];
    this.sessionMetrics = new Map();
    this.globalMetrics = {
      totalDetections: 0,
      totalValidations: 0,
      detectionAccuracy: 0,
      validationFailures: 0,
      languageDistribution: {},
      confidenceDistribution: {
        veryHigh: 0, // >= 0.9
        high: 0, // >= 0.7
        medium: 0, // >= 0.5
        low: 0, // >= 0.3
        veryLow: 0 // < 0.3
      },
      severityDistribution: {
        none: 0,
        low: 0,
        medium: 0,
        high: 0
      }
    };

    // Configuration
    this.config = {
      // Maximum number of logs to keep in memory
      maxLogEntries: 1000,

      // Log levels
      logLevels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
      },

      // Current log level
      currentLogLevel: 1, // INFO

      // Enable detailed logging
      enableDetailedLogging: true,

      // Enable metrics collection
      enableMetrics: true,

      // Metrics aggregation interval (ms)
      metricsInterval: 60000, // 1 minute

      // Auto-cleanup interval (ms)
      cleanupInterval: 300000 // 5 minutes
    };

    // Start periodic cleanup
    this.startPeriodicCleanup();

    console.log('LanguageConsistencyLogger initialized');
  }

  /**
   * Log language detection result
   * @param {string} sessionId - Session identifier
   * @param {Object} detectionResult - Detection result from LanguageDetector
   * @param {Object} context - Additional context information
   */
  logDetection(sessionId, detectionResult, context = {}) {
    try {
      const logEntry = {
        timestamp: Date.now(),
        sessionId,
        type: 'detection',
        language: detectionResult.language,
        confidence: detectionResult.confidence,
        confidenceLevel:
          detectionResult.confidenceLevel || this.getConfidenceLevel(detectionResult.confidence),
        method: detectionResult.method,
        scores: detectionResult.scores || {},
        confidenceFactors: detectionResult.confidenceFactors || [],
        context: {
          userMessage: context.userMessage?.substring(0, 200) || '', // First 200 chars
          messageLength: context.messageLength || 0,
          hasImages: context.hasImages || false,
          provider: context.provider || 'unknown',
          ...context
        }
      };

      // Add to detection logs
      this.addLogEntry(this.detectionLogs, logEntry);

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateDetectionMetrics(logEntry);
      }

      // Log to console based on log level
      this.logToConsole(
        'INFO',
        `Language detected: ${detectionResult.language} (${detectionResult.confidence.toFixed(3)})`,
        {
          sessionId,
          method: detectionResult.method,
          confidenceLevel: logEntry.confidenceLevel
        }
      );
    } catch (error) {
      console.error('Error logging detection result:', error);
    }
  }

  /**
   * Log language validation result
   * @param {string} sessionId - Session identifier
   * @param {Object} validationResult - Validation result from LanguageDetector
   * @param {Object} context - Additional context information
   */
  logValidation(sessionId, validationResult, context = {}) {
    try {
      const logEntry = {
        timestamp: Date.now(),
        sessionId,
        type: 'validation',
        isConsistent: validationResult.isConsistent,
        expectedLanguage: validationResult.expectedLanguage,
        detectedLanguage: validationResult.detectedLanguage,
        confidence: validationResult.confidence,
        confidenceGap: validationResult.confidenceGap,
        severity: validationResult.severity,
        recommendation: validationResult.recommendation,
        detectionDetails: validationResult.detectionDetails || {},
        context: {
          responseLength: context.responseLength || 0,
          provider: context.provider || 'unknown',
          model: context.model || 'unknown',
          correctionApplied: context.correctionApplied || false,
          regenerationAttempt: context.regenerationAttempt || 0,
          ...context
        }
      };

      // Add to validation logs
      this.addLogEntry(this.validationLogs, logEntry);

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateValidationMetrics(logEntry);
      }

      // Log to console based on severity
      const logLevel = validationResult.isConsistent
        ? 'INFO'
        : validationResult.severity === 'high'
          ? 'ERROR'
          : validationResult.severity === 'medium'
            ? 'WARN'
            : 'INFO';

      this.logToConsole(
        logLevel,
        `Language validation: ${validationResult.isConsistent ? 'PASS' : 'FAIL'}`,
        {
          sessionId,
          expected: validationResult.expectedLanguage,
          detected: validationResult.detectedLanguage,
          severity: validationResult.severity,
          recommendation: validationResult.recommendation
        }
      );
    } catch (error) {
      console.error('Error logging validation result:', error);
    }
  }

  /**
   * Log language consistency issue
   * @param {string} sessionId - Session identifier
   * @param {string} issueType - Type of issue ('detection_failure', 'validation_failure', 'correction_failure')
   * @param {Object} details - Issue details
   * @param {Object} context - Additional context
   */
  logConsistencyIssue(sessionId, issueType, details = {}, context = {}) {
    try {
      const logEntry = {
        timestamp: Date.now(),
        sessionId,
        type: 'consistency_issue',
        issueType,
        severity: details.severity || 'medium',
        details: {
          expectedLanguage: details.expectedLanguage,
          detectedLanguage: details.detectedLanguage,
          confidence: details.confidence,
          errorMessage: details.errorMessage,
          ...details
        },
        context: {
          provider: context.provider || 'unknown',
          model: context.model || 'unknown',
          attemptNumber: context.attemptNumber || 1,
          ...context
        }
      };

      // Add to validation logs (consistency issues are validation-related)
      this.addLogEntry(this.validationLogs, logEntry);

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateConsistencyIssueMetrics(logEntry);
      }

      // Log to console
      const logLevel = details.severity === 'high' ? 'ERROR' : 'WARN';
      this.logToConsole(logLevel, `Language consistency issue: ${issueType}`, {
        sessionId,
        severity: details.severity,
        details: details.errorMessage || 'No details provided'
      });
    } catch (error) {
      console.error('Error logging consistency issue:', error);
    }
  }

  /**
   * Log session language metrics
   * @param {string} sessionId - Session identifier
   * @param {Object} sessionStats - Session statistics from SessionLanguageManager
   */
  logSessionMetrics(sessionId, sessionStats) {
    try {
      if (!this.config.enableMetrics) return;

      const metricsEntry = {
        timestamp: Date.now(),
        sessionId,
        language: sessionStats.language,
        isStable: sessionStats.isStable,
        interactionCount: sessionStats.interactionCount,
        sessionAge: sessionStats.sessionAge,
        confidence: sessionStats.confidence,
        validation: sessionStats.validation,
        consistency: sessionStats.consistency
      };

      // Store session metrics
      this.sessionMetrics.set(sessionId, metricsEntry);

      // Log significant session events
      if (sessionStats.isStable && sessionStats.interactionCount >= 3) {
        this.logToConsole('INFO', `Session language stabilized: ${sessionStats.language}`, {
          sessionId,
          interactionCount: sessionStats.interactionCount,
          avgConfidence: sessionStats.confidence.average.toFixed(3)
        });
      }

      if (
        sessionStats.validation.successRate < 0.8 &&
        sessionStats.validation.totalValidations >= 3
      ) {
        this.logToConsole('WARN', `Low validation success rate in session`, {
          sessionId,
          successRate: (sessionStats.validation.successRate * 100).toFixed(1) + '%',
          totalValidations: sessionStats.validation.totalValidations
        });
      }
    } catch (error) {
      console.error('Error logging session metrics:', error);
    }
  }

  /**
   * Get detection statistics
   * @param {Object} filters - Optional filters {sessionId, language, timeRange}
   * @returns {Object} Detection statistics
   */
  getDetectionStats(filters = {}) {
    try {
      const filteredLogs = this.filterLogs(this.detectionLogs, filters);

      if (filteredLogs.length === 0) {
        return {
          totalDetections: 0,
          languageDistribution: {},
          confidenceStats: {},
          methodDistribution: {},
          timeRange: null
        };
      }

      // Calculate statistics
      const languageDistribution = {};
      const methodDistribution = {};
      const confidences = [];
      let minTimestamp = Infinity;
      let maxTimestamp = 0;

      filteredLogs.forEach((log) => {
        // Language distribution
        languageDistribution[log.language] = (languageDistribution[log.language] || 0) + 1;

        // Method distribution
        methodDistribution[log.method] = (methodDistribution[log.method] || 0) + 1;

        // Confidence tracking
        confidences.push(log.confidence);

        // Time range
        minTimestamp = Math.min(minTimestamp, log.timestamp);
        maxTimestamp = Math.max(maxTimestamp, log.timestamp);
      });

      // Calculate confidence statistics
      const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
      const minConfidence = Math.min(...confidences);
      const maxConfidence = Math.max(...confidences);

      return {
        totalDetections: filteredLogs.length,
        languageDistribution,
        methodDistribution,
        confidenceStats: {
          average: avgConfidence,
          min: minConfidence,
          max: maxConfidence,
          distribution: this.calculateConfidenceDistribution(confidences)
        },
        timeRange: {
          start: new Date(minTimestamp),
          end: new Date(maxTimestamp),
          duration: maxTimestamp - minTimestamp
        }
      };
    } catch (error) {
      console.error('Error getting detection stats:', error);
      return null;
    }
  }

  /**
   * Get validation statistics
   * @param {Object} filters - Optional filters {sessionId, language, timeRange}
   * @returns {Object} Validation statistics
   */
  getValidationStats(filters = {}) {
    try {
      const filteredLogs = this.filterLogs(this.validationLogs, filters);

      if (filteredLogs.length === 0) {
        return {
          totalValidations: 0,
          successRate: 0,
          severityDistribution: {},
          recommendationDistribution: {},
          timeRange: null
        };
      }

      // Calculate statistics
      const severityDistribution = {};
      const recommendationDistribution = {};
      let successfulValidations = 0;
      let minTimestamp = Infinity;
      let maxTimestamp = 0;

      filteredLogs.forEach((log) => {
        if (log.type === 'validation') {
          // Success rate
          if (log.isConsistent) {
            successfulValidations++;
          }

          // Severity distribution
          severityDistribution[log.severity] = (severityDistribution[log.severity] || 0) + 1;

          // Recommendation distribution
          recommendationDistribution[log.recommendation] =
            (recommendationDistribution[log.recommendation] || 0) + 1;

          // Time range
          minTimestamp = Math.min(minTimestamp, log.timestamp);
          maxTimestamp = Math.max(maxTimestamp, log.timestamp);
        }
      });

      const validationLogs = filteredLogs.filter((log) => log.type === 'validation');
      const successRate =
        validationLogs.length > 0 ? successfulValidations / validationLogs.length : 0;

      return {
        totalValidations: validationLogs.length,
        successRate,
        severityDistribution,
        recommendationDistribution,
        timeRange: {
          start: new Date(minTimestamp),
          end: new Date(maxTimestamp),
          duration: maxTimestamp - minTimestamp
        }
      };
    } catch (error) {
      console.error('Error getting validation stats:', error);
      return null;
    }
  }

  /**
   * Get comprehensive language consistency metrics
   * @param {Object} filters - Optional filters
   * @returns {Object} Comprehensive metrics
   */
  getLanguageConsistencyMetrics(filters = {}) {
    try {
      const detectionStats = this.getDetectionStats(filters);
      const validationStats = this.getValidationStats(filters);
      const sessionStats = this.getSessionStats(filters);

      return {
        detection: detectionStats,
        validation: validationStats,
        sessions: sessionStats,
        global: { ...this.globalMetrics },
        summary: {
          totalSessions: sessionStats.totalSessions,
          averageSessionStability: sessionStats.averageStability,
          overallValidationSuccessRate: validationStats.successRate,
          mostDetectedLanguage: this.getMostFrequentLanguage(detectionStats.languageDistribution),
          averageDetectionConfidence: detectionStats.confidenceStats?.average || 0,
          criticalIssuesCount: this.getCriticalIssuesCount(filters)
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting language consistency metrics:', error);
      return null;
    }
  }

  /**
   * Get session statistics
   * @param {Object} filters - Optional filters
   * @returns {Object} Session statistics
   */
  getSessionStats(filters = {}) {
    try {
      const sessions = Array.from(this.sessionMetrics.values());
      const filteredSessions = this.filterSessionMetrics(sessions, filters);

      if (filteredSessions.length === 0) {
        return {
          totalSessions: 0,
          stableSessions: 0,
          averageStability: 0,
          languageDistribution: {},
          averageInteractionCount: 0
        };
      }

      const stableSessions = filteredSessions.filter((s) => s.isStable).length;
      const languageDistribution = {};
      const totalInteractions = filteredSessions.reduce((sum, s) => sum + s.interactionCount, 0);

      filteredSessions.forEach((session) => {
        languageDistribution[session.language] = (languageDistribution[session.language] || 0) + 1;
      });

      return {
        totalSessions: filteredSessions.length,
        stableSessions,
        averageStability: stableSessions / filteredSessions.length,
        languageDistribution,
        averageInteractionCount: totalInteractions / filteredSessions.length
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return null;
    }
  }

  /**
   * Export logs for external analysis
   * @param {Object} options - Export options {format, filters, includeContext}
   * @returns {Object} Exported data
   */
  exportLogs(options = {}) {
    try {
      const { format = 'json', filters = {}, includeContext = false } = options;

      const detectionLogs = this.filterLogs(this.detectionLogs, filters);
      const validationLogs = this.filterLogs(this.validationLogs, filters);

      const exportData = {
        metadata: {
          exportTimestamp: Date.now(),
          totalDetectionLogs: detectionLogs.length,
          totalValidationLogs: validationLogs.length,
          filters,
          includeContext
        },
        detectionLogs: includeContext ? detectionLogs : detectionLogs.map(this.stripContext),
        validationLogs: includeContext ? validationLogs : validationLogs.map(this.stripContext),
        metrics: this.getLanguageConsistencyMetrics(filters)
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting logs:', error);
      return null;
    }
  }

  /**
   * Clear logs and reset metrics
   * @param {Object} options - Clear options {olderThan, type}
   */
  clearLogs(options = {}) {
    try {
      const { olderThan, type } = options;

      if (type === 'detection' || !type) {
        if (olderThan) {
          this.detectionLogs = this.detectionLogs.filter((log) => log.timestamp > olderThan);
        } else {
          this.detectionLogs = [];
        }
      }

      if (type === 'validation' || !type) {
        if (olderThan) {
          this.validationLogs = this.validationLogs.filter((log) => log.timestamp > olderThan);
        } else {
          this.validationLogs = [];
        }
      }

      if (!type) {
        // Reset global metrics if clearing all logs
        this.resetGlobalMetrics();
      }

      console.log(
        `Cleared ${type || 'all'} logs${olderThan ? ` older than ${new Date(olderThan)}` : ''}`
      );
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }

  // Private helper methods

  /**
   * Add log entry with size management
   * @param {Array} logArray - Target log array
   * @param {Object} entry - Log entry to add
   */
  addLogEntry(logArray, entry) {
    logArray.push(entry);

    // Maintain maximum log size
    if (logArray.length > this.config.maxLogEntries) {
      logArray.splice(0, logArray.length - this.config.maxLogEntries);
    }
  }

  /**
   * Update detection metrics
   * @param {Object} logEntry - Detection log entry
   */
  updateDetectionMetrics(logEntry) {
    this.globalMetrics.totalDetections++;

    // Language distribution
    const lang = logEntry.language;
    this.globalMetrics.languageDistribution[lang] =
      (this.globalMetrics.languageDistribution[lang] || 0) + 1;

    // Confidence distribution
    const confidenceLevel = logEntry.confidenceLevel;
    if (this.globalMetrics.confidenceDistribution[confidenceLevel] !== undefined) {
      this.globalMetrics.confidenceDistribution[confidenceLevel]++;
    }
  }

  /**
   * Update validation metrics
   * @param {Object} logEntry - Validation log entry
   */
  updateValidationMetrics(logEntry) {
    if (logEntry.type === 'validation') {
      this.globalMetrics.totalValidations++;

      if (!logEntry.isConsistent) {
        this.globalMetrics.validationFailures++;
      }

      // Severity distribution
      const severity = logEntry.severity;
      if (this.globalMetrics.severityDistribution[severity] !== undefined) {
        this.globalMetrics.severityDistribution[severity]++;
      }
    }
  }

  /**
   * Update consistency issue metrics
   * @param {Object} logEntry - Consistency issue log entry
   */
  updateConsistencyIssueMetrics(logEntry) {
    // Consistency issues count as validation failures
    this.globalMetrics.validationFailures++;

    const severity = logEntry.details.severity || 'medium';
    if (this.globalMetrics.severityDistribution[severity] !== undefined) {
      this.globalMetrics.severityDistribution[severity]++;
    }
  }

  /**
   * Get confidence level from confidence score
   * @param {number} confidence - Confidence score (0-1)
   * @returns {string} Confidence level
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.9) return 'veryHigh';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'veryLow';
  }

  /**
   * Filter logs based on criteria
   * @param {Array} logs - Log array to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered logs
   */
  filterLogs(logs, filters) {
    return logs.filter((log) => {
      if (filters.sessionId && log.sessionId !== filters.sessionId) return false;
      if (filters.language && log.language !== filters.language) return false;
      if (filters.timeRange) {
        if (filters.timeRange.start && log.timestamp < filters.timeRange.start) return false;
        if (filters.timeRange.end && log.timestamp > filters.timeRange.end) return false;
      }
      if (filters.type && log.type !== filters.type) return false;
      if (filters.severity && log.severity !== filters.severity) return false;
      return true;
    });
  }

  /**
   * Filter session metrics
   * @param {Array} sessions - Session metrics array
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered sessions
   */
  filterSessionMetrics(sessions, filters) {
    return sessions.filter((session) => {
      if (filters.sessionId && session.sessionId !== filters.sessionId) return false;
      if (filters.language && session.language !== filters.language) return false;
      if (filters.timeRange) {
        if (filters.timeRange.start && session.timestamp < filters.timeRange.start) return false;
        if (filters.timeRange.end && session.timestamp > filters.timeRange.end) return false;
      }
      return true;
    });
  }

  /**
   * Calculate confidence distribution
   * @param {Array} confidences - Array of confidence scores
   * @returns {Object} Confidence distribution
   */
  calculateConfidenceDistribution(confidences) {
    const distribution = {
      veryHigh: 0,
      high: 0,
      medium: 0,
      low: 0,
      veryLow: 0
    };

    confidences.forEach((confidence) => {
      const level = this.getConfidenceLevel(confidence);
      distribution[level]++;
    });

    return distribution;
  }

  /**
   * Get most frequent language
   * @param {Object} languageDistribution - Language distribution object
   * @returns {string|null} Most frequent language
   */
  getMostFrequentLanguage(languageDistribution) {
    if (!languageDistribution || Object.keys(languageDistribution).length === 0) {
      return null;
    }

    return Object.entries(languageDistribution).reduce(
      (max, [lang, count]) => (count > max.count ? { language: lang, count } : max),
      { count: 0 }
    ).language;
  }

  /**
   * Get count of critical issues
   * @param {Object} filters - Filter criteria
   * @returns {number} Count of critical issues
   */
  getCriticalIssuesCount(filters = {}) {
    const criticalFilters = { ...filters, severity: 'high' };
    const criticalValidationLogs = this.filterLogs(this.validationLogs, criticalFilters);
    return criticalValidationLogs.length;
  }

  /**
   * Strip context from log entry for export
   * @param {Object} logEntry - Log entry
   * @returns {Object} Log entry without context
   */
  stripContext(logEntry) {
    const { context, ...strippedEntry } = logEntry;
    return strippedEntry;
  }

  /**
   * Convert export data to CSV format
   * @param {Object} exportData - Export data
   * @returns {string} CSV formatted data
   */
  convertToCSV(exportData) {
    // This is a simplified CSV conversion
    // In a real implementation, you might want to use a proper CSV library
    const lines = [];

    // Headers
    lines.push('timestamp,sessionId,type,language,confidence,isConsistent,severity');

    // Detection logs
    exportData.detectionLogs.forEach((log) => {
      lines.push(
        `${log.timestamp},${log.sessionId},${log.type},${log.language},${log.confidence},,`
      );
    });

    // Validation logs
    exportData.validationLogs.forEach((log) => {
      if (log.type === 'validation') {
        lines.push(
          `${log.timestamp},${log.sessionId},${log.type},${log.expectedLanguage},${log.confidence},${log.isConsistent},${log.severity}`
        );
      }
    });

    return lines.join('\n');
  }

  /**
   * Reset global metrics
   */
  resetGlobalMetrics() {
    this.globalMetrics = {
      totalDetections: 0,
      totalValidations: 0,
      detectionAccuracy: 0,
      validationFailures: 0,
      languageDistribution: {},
      confidenceDistribution: {
        veryHigh: 0,
        high: 0,
        medium: 0,
        low: 0,
        veryLow: 0
      },
      severityDistribution: {
        none: 0,
        low: 0,
        medium: 0,
        high: 0
      }
    };
  }

  /**
   * Log to console with level filtering
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  logToConsole(level, message, data = {}) {
    const levelValue = this.config.logLevels[level] || 1;

    if (levelValue >= this.config.currentLogLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level}] [LanguageConsistency] ${message}`;

      switch (level) {
        case 'ERROR':
          console.error(logMessage, data);
          break;
        case 'WARN':
          console.warn(logMessage, data);
          break;
        case 'DEBUG':
          console.debug(logMessage, data);
          break;
        default:
          console.log(logMessage, data);
      }
    }
  }

  /**
   * Start periodic cleanup of old logs and metrics
   */
  startPeriodicCleanup() {
    setInterval(() => {
      try {
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

        // Clean old logs
        const oldDetectionCount = this.detectionLogs.length;
        const oldValidationCount = this.validationLogs.length;

        this.detectionLogs = this.detectionLogs.filter((log) => log.timestamp > cutoffTime);
        this.validationLogs = this.validationLogs.filter((log) => log.timestamp > cutoffTime);

        // Clean old session metrics
        const oldSessionCount = this.sessionMetrics.size;
        for (const [sessionId, metrics] of this.sessionMetrics.entries()) {
          if (metrics.timestamp < cutoffTime) {
            this.sessionMetrics.delete(sessionId);
          }
        }

        const cleanedDetection = oldDetectionCount - this.detectionLogs.length;
        const cleanedValidation = oldValidationCount - this.validationLogs.length;
        const cleanedSessions = oldSessionCount - this.sessionMetrics.size;

        if (cleanedDetection > 0 || cleanedValidation > 0 || cleanedSessions > 0) {
          this.logToConsole('INFO', 'Periodic cleanup completed', {
            cleanedDetectionLogs: cleanedDetection,
            cleanedValidationLogs: cleanedValidation,
            cleanedSessions: cleanedSessions
          });
        }
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Update logger configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    console.log('LanguageConsistencyLogger configuration updated:', this.config);
  }

  /**
   * Get logger statistics
   * @returns {Object} Logger statistics
   */
  getLoggerStats() {
    return {
      detectionLogsCount: this.detectionLogs.length,
      validationLogsCount: this.validationLogs.length,
      sessionMetricsCount: this.sessionMetrics.size,
      globalMetrics: { ...this.globalMetrics },
      config: { ...this.config },
      memoryUsage: {
        detectionLogs: this.detectionLogs.length * 1024, // Rough estimate
        validationLogs: this.validationLogs.length * 1024,
        sessionMetrics: this.sessionMetrics.size * 512
      }
    };
  }
}

// Export singleton instance
export const languageConsistencyLogger = new LanguageConsistencyLogger();
