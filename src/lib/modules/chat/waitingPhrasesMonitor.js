/**
 * Waiting Phrases Monitoring and Logging System
 * Provides performance monitoring, error tracking, and debugging capabilities
 */

import { waitingPhrasesService } from './waitingPhrasesService.js';
import { translationBridge } from './translationBridge.js';
import { get } from 'svelte/store';
import { isVoiceModeActive, getAudioQueueStatus } from './voiceServices.js';

/**
 * Performance Monitor for Waiting Phrases System
 */
export class WaitingPhrasesMonitor {
  constructor() {
    this.metrics = {
      phraseSelections: 0,
      translations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      averageSelectionTime: 0,
      averageTranslationTime: 0
    };

    this.performanceLog = [];
    this.errorLog = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.startTime = Date.now();

    // Performance thresholds
    this.thresholds = {
      selectionTime: 100, // ms
      translationTime: 2000, // ms
      cacheHitRate: 0.8, // 80%
      errorRate: 0.05 // 5%
    };
  }

  /**
   * Start monitoring the waiting phrases system
   * @param {Object} options - Monitoring options
   */
  startMonitoring(options = {}) {
    if (this.isMonitoring) {
      console.warn('Monitoring already active');
      return;
    }

    const {
      interval = 30000, // 30 seconds
      enablePerformanceLogging = true,
      enableErrorTracking = true,
      enableMetrics = true
    } = options;

    this.isMonitoring = true;
    this.startTime = Date.now();

    console.log('Starting waiting phrases monitoring...');

    if (enableMetrics) {
      this.monitoringInterval = setInterval(() => {
        this.collectMetrics();
      }, interval);
    }

    if (enablePerformanceLogging) {
      this.setupPerformanceLogging();
    }

    if (enableErrorTracking) {
      this.setupErrorTracking();
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Stopped waiting phrases monitoring');
  }

  /**
   * Collect current system metrics
   */
  collectMetrics() {
    try {
      const serviceStats = waitingPhrasesService.getCacheStats();
      const translationStats = translationBridge.getTranslationStats();
      const voiceMode = get(isVoiceModeActive);
      const audioQueue = getAudioQueueStatus();

      const currentMetrics = {
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
        service: {
          initialized: waitingPhrasesService.isServiceInitialized(),
          cacheSize: serviceStats.size || 0,
          historySize: serviceStats.historySize || 0,
          currentLanguage: serviceStats.currentLanguage,
          supportedLanguages: serviceStats.supportedLanguages?.length || 0
        },
        translation: {
          cacheSize: translationStats.cacheSize || 0,
          hitRate: translationStats.stats?.hitRate || 0,
          successRate: translationStats.stats?.successRate || 0,
          supportedLanguages: translationStats.supportedLanguages?.length || 0
        },
        voice: {
          modeActive: voiceMode,
          queueSize: audioQueue?.totalItems || 0,
          waitingPhrases: audioQueue?.waitingPhrases || 0,
          responses: audioQueue?.responses || 0,
          isPlaying: audioQueue?.isPlaying || false
        },
        performance: {
          ...this.metrics
        }
      };

      // Check for performance issues
      this.checkPerformanceThresholds(currentMetrics);

      // Log metrics if enabled
      if (waitingPhrasesService.config?.settings?.enableLogging) {
        console.log('Waiting Phrases Metrics:', currentMetrics);
      }

      return currentMetrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.logError('METRICS_COLLECTION_ERROR', error);
    }
  }

  /**
   * Check performance against thresholds and log warnings
   * @param {Object} metrics - Current metrics
   */
  checkPerformanceThresholds(metrics) {
    const warnings = [];

    // Check cache hit rate
    if (metrics.translation.hitRate < this.thresholds.cacheHitRate) {
      warnings.push(
        `Low translation cache hit rate: ${(metrics.translation.hitRate * 100).toFixed(1)}%`
      );
    }

    // Check error rate
    const totalOperations = this.metrics.phraseSelections + this.metrics.translations;
    const errorRate = totalOperations > 0 ? this.metrics.errors / totalOperations : 0;

    if (errorRate > this.thresholds.errorRate) {
      warnings.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    // Check average performance
    if (this.metrics.averageSelectionTime > this.thresholds.selectionTime) {
      warnings.push(`Slow phrase selection: ${this.metrics.averageSelectionTime.toFixed(1)}ms avg`);
    }

    if (this.metrics.averageTranslationTime > this.thresholds.translationTime) {
      warnings.push(`Slow translation: ${this.metrics.averageTranslationTime.toFixed(1)}ms avg`);
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('Performance warnings:', warnings);
    }
  }

  /**
   * Set up performance logging for phrase selection
   */
  setupPerformanceLogging() {
    // Wrap phrase selection method
    const originalSelectPhrase = waitingPhrasesService.selectWaitingPhrase;

    waitingPhrasesService.selectWaitingPhrase = async function (...args) {
      const startTime = performance.now();

      try {
        const result = await originalSelectPhrase.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Update metrics
        monitor.metrics.phraseSelections++;
        monitor.updateAverageTime('selection', duration);

        // Log performance entry
        monitor.logPerformance('PHRASE_SELECTION', {
          duration,
          language: args[0],
          category: args[1],
          success: true,
          phraseLength: result?.length || 0
        });

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        monitor.metrics.errors++;
        monitor.logError('PHRASE_SELECTION_ERROR', error, {
          duration,
          language: args[0],
          category: args[1]
        });

        throw error;
      }
    };

    // Wrap translation method
    const originalTranslate = translationBridge.translatePhrase;

    translationBridge.translatePhrase = async function (...args) {
      const startTime = performance.now();

      try {
        const result = await originalTranslate.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Update metrics
        monitor.metrics.translations++;
        monitor.updateAverageTime('translation', duration);

        if (result !== null) {
          monitor.metrics.cacheHits++;
        } else {
          monitor.metrics.cacheMisses++;
        }

        // Log performance entry
        monitor.logPerformance('TRANSLATION', {
          duration,
          phrase: args[0]?.substring(0, 50) + '...',
          language: args[1],
          success: result !== null,
          cached: monitor.translationBridge.translationCache.has(`${args[0]}:${args[1]}`)
        });

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        monitor.metrics.errors++;
        monitor.logError('TRANSLATION_ERROR', error, {
          duration,
          phrase: args[0]?.substring(0, 50) + '...',
          language: args[1]
        });

        throw error;
      }
    };
  }

  /**
   * Set up error tracking
   */
  setupErrorTracking() {
    // Global error handler for waiting phrases
    window.addEventListener('error', (event) => {
      if (
        event.filename?.includes('waitingPhrases') ||
        event.error?.stack?.includes('waitingPhrases')
      ) {
        this.logError('GLOBAL_ERROR', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.stack?.includes('waitingPhrases')) {
        this.logError('UNHANDLED_REJECTION', event.reason);
      }
    });
  }

  /**
   * Update average time metrics
   * @param {string} type - 'selection' or 'translation'
   * @param {number} duration - Duration in milliseconds
   */
  updateAverageTime(type, duration) {
    const key = type === 'selection' ? 'averageSelectionTime' : 'averageTranslationTime';
    const countKey = type === 'selection' ? 'phraseSelections' : 'translations';

    const currentAvg = this.metrics[key];
    const count = this.metrics[countKey];

    // Calculate new average using incremental formula
    this.metrics[key] = (currentAvg * (count - 1) + duration) / count;
  }

  /**
   * Log performance entry
   * @param {string} operation - Operation type
   * @param {Object} data - Performance data
   */
  logPerformance(operation, data) {
    const entry = {
      timestamp: Date.now(),
      operation,
      ...data
    };

    this.performanceLog.push(entry);

    // Limit log size
    if (this.performanceLog.length > 1000) {
      this.performanceLog = this.performanceLog.slice(-500);
    }

    // Log to console if debug mode enabled
    if (waitingPhrasesService.config?.settings?.logLevel === 'debug') {
      console.debug('Performance:', entry);
    }
  }

  /**
   * Log error entry
   * @param {string} type - Error type
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logError(type, error, context = {}) {
    const entry = {
      timestamp: Date.now(),
      type,
      message: error.message,
      stack: error.stack,
      context
    };

    this.errorLog.push(entry);

    // Limit log size
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }

    // Always log errors to console
    console.error(`Waiting Phrases Error [${type}]:`, entry);
  }

  /**
   * Get performance report
   * @returns {Object} Performance report
   */
  getPerformanceReport() {
    const uptime = Date.now() - this.startTime;
    const totalOperations = this.metrics.phraseSelections + this.metrics.translations;

    return {
      uptime,
      totalOperations,
      metrics: { ...this.metrics },
      rates: {
        phraseSelectionsPerMinute: (this.metrics.phraseSelections / (uptime / 60000)).toFixed(2),
        translationsPerMinute: (this.metrics.translations / (uptime / 60000)).toFixed(2),
        errorRate: totalOperations > 0 ? (this.metrics.errors / totalOperations).toFixed(4) : 0,
        cacheHitRate:
          this.metrics.translations > 0
            ? (this.metrics.cacheHits / this.metrics.translations).toFixed(4)
            : 0
      },
      thresholds: { ...this.thresholds },
      recentErrors: this.errorLog.slice(-10),
      recentPerformance: this.performanceLog.slice(-20)
    };
  }

  /**
   * Get system health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const report = this.getPerformanceReport();
    const issues = [];

    // Check for issues
    if (report.rates.errorRate > this.thresholds.errorRate) {
      issues.push(`High error rate: ${(report.rates.errorRate * 100).toFixed(1)}%`);
    }

    if (report.rates.cacheHitRate < this.thresholds.cacheHitRate) {
      issues.push(`Low cache hit rate: ${(report.rates.cacheHitRate * 100).toFixed(1)}%`);
    }

    if (this.metrics.averageSelectionTime > this.thresholds.selectionTime) {
      issues.push(`Slow phrase selection: ${this.metrics.averageSelectionTime.toFixed(1)}ms`);
    }

    if (this.metrics.averageTranslationTime > this.thresholds.translationTime) {
      issues.push(`Slow translation: ${this.metrics.averageTranslationTime.toFixed(1)}ms`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
      uptime: report.uptime,
      lastCheck: Date.now()
    };
  }

  /**
   * Export monitoring data for analysis
   * @returns {Object} Monitoring data
   */
  exportData() {
    return {
      metrics: { ...this.metrics },
      performanceLog: [...this.performanceLog],
      errorLog: [...this.errorLog],
      startTime: this.startTime,
      exportTime: Date.now(),
      thresholds: { ...this.thresholds }
    };
  }

  /**
   * Reset monitoring data
   */
  reset() {
    this.metrics = {
      phraseSelections: 0,
      translations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      averageSelectionTime: 0,
      averageTranslationTime: 0
    };

    this.performanceLog = [];
    this.errorLog = [];
    this.startTime = Date.now();

    console.log('Monitoring data reset');
  }
}

// Create singleton instance
export const monitor = new WaitingPhrasesMonitor();

// Auto-start monitoring in development mode
if (import.meta.env.DEV) {
  monitor.startMonitoring({
    interval: 10000, // 10 seconds in dev mode
    enablePerformanceLogging: true,
    enableErrorTracking: true,
    enableMetrics: true
  });
}

export default WaitingPhrasesMonitor;
