/**
 * Voice Performance Monitor
 * Real-time performance monitoring for audio processing and voice interactions
 */

import { voiceDiagnostics } from './VoiceDiagnostics.js';
import { voiceInteractionLogger } from './VoiceInteractionLogger.js';

export class VoicePerformanceMonitor {
  constructor() {
    this.monitorId = `perf_monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.isActive = false;
    this.monitoringInterval = null;

    // Performance thresholds
    this.thresholds = {
      audioProcessing: {
        latency: 100, // ms
        bufferUnderrun: 0.02, // 2%
        memoryUsage: 50 * 1024 * 1024 // 50MB
      },
      speechSynthesis: {
        responseTime: 2000, // ms
        failureRate: 0.05, // 5%
        queueLength: 5 // max items
      },
      userExperience: {
        stutteringRate: 0.1, // 10%
        interactionSuccessRate: 0.9, // 90%
        averageSessionDuration: 300000 // 5 minutes
      }
    };

    // Real-time metrics
    this.realTimeMetrics = {
      audioProcessing: {
        currentLatency: 0,
        bufferHealth: 'good',
        memoryUsage: 0,
        processingQueue: 0
      },
      speechSynthesis: {
        currentResponseTime: 0,
        queueLength: 0,
        recentFailures: 0,
        synthesisRate: 0
      },
      userExperience: {
        activeUsers: 0,
        currentSessionDuration: 0,
        recentInteractions: 0,
        satisfactionScore: 0
      }
    };

    // Performance alerts
    this.alertCallbacks = new Map();
    this.alertHistory = [];
    this.maxAlertHistory = 100;

    // Sampling configuration
    this.samplingConfig = {
      interval: 1000, // 1 second
      batchSize: 10,
      retentionPeriod: 3600000 // 1 hour
    };

    // Performance data buffer
    this.performanceBuffer = {
      audioLatency: [],
      synthesisTime: [],
      memoryUsage: [],
      userInteractions: [],
      errorRates: []
    };

    console.log('VoicePerformanceMonitor initialized:', this.monitorId);
  }

  /**
   * Start performance monitoring
   * @param {Object} options - Monitoring options
   */
  startMonitoring(options = {}) {
    if (this.isActive) {
      console.warn('Performance monitoring already active');
      return;
    }

    const {
      interval = this.samplingConfig.interval,
      enableAlerts = true,
      customThresholds = {}
    } = options;

    // Update thresholds if provided
    if (customThresholds) {
      this.updateThresholds(customThresholds);
    }

    this.isActive = true;

    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.collectRealTimeMetrics();
      this.analyzePerformance();

      if (enableAlerts) {
        this.checkPerformanceAlerts();
      }
    }, interval);

    console.log(`Performance monitoring started with ${interval}ms interval`);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Collect real-time performance metrics
   */
  collectRealTimeMetrics() {
    try {
      const timestamp = Date.now();

      // Collect audio processing metrics
      this.collectAudioProcessingMetrics(timestamp);

      // Collect speech synthesis metrics
      this.collectSpeechSynthesisMetrics(timestamp);

      // Collect user experience metrics
      this.collectUserExperienceMetrics(timestamp);

      // Update performance buffer
      this.updatePerformanceBuffer(timestamp);
    } catch (error) {
      console.error('Error collecting real-time metrics:', error);
    }
  }

  /**
   * Collect audio processing metrics
   * @param {number} timestamp - Current timestamp
   */
  collectAudioProcessingMetrics(timestamp) {
    try {
      // Get audio buffer manager stats (if available)
      if (typeof window !== 'undefined' && window.audioBufferManager) {
        const bufferStats = window.audioBufferManager.getBufferStats();

        this.realTimeMetrics.audioProcessing = {
          currentLatency: this.measureAudioLatency(),
          bufferHealth: this.assessBufferHealth(bufferStats),
          memoryUsage: bufferStats.totalSize || 0,
          processingQueue: bufferStats.totalBuffered || 0
        };

        // Add to performance buffer
        this.performanceBuffer.audioLatency.push({
          timestamp: timestamp,
          value: this.realTimeMetrics.audioProcessing.currentLatency
        });

        this.performanceBuffer.memoryUsage.push({
          timestamp: timestamp,
          value: this.realTimeMetrics.audioProcessing.memoryUsage
        });
      }
    } catch (error) {
      console.error('Error collecting audio processing metrics:', error);
    }
  }

  /**
   * Collect speech synthesis metrics
   * @param {number} timestamp - Current timestamp
   */
  collectSpeechSynthesisMetrics(timestamp) {
    try {
      const loggerAnalytics = voiceInteractionLogger.getPerformanceAnalytics();

      this.realTimeMetrics.speechSynthesis = {
        currentResponseTime: loggerAnalytics.averageResponseTime || 0,
        queueLength: 0, // Would need to be implemented in voice services
        recentFailures: loggerAnalytics.recentActivity?.errorRate || 0,
        synthesisRate: this.calculateSynthesisRate(loggerAnalytics)
      };

      // Add to performance buffer
      this.performanceBuffer.synthesisTime.push({
        timestamp: timestamp,
        value: this.realTimeMetrics.speechSynthesis.currentResponseTime
      });
    } catch (error) {
      console.error('Error collecting speech synthesis metrics:', error);
    }
  }

  /**
   * Collect user experience metrics
   * @param {number} timestamp - Current timestamp
   */
  collectUserExperienceMetrics(timestamp) {
    try {
      const loggerAnalytics = voiceInteractionLogger.getPerformanceAnalytics();

      this.realTimeMetrics.userExperience = {
        activeUsers: 1, // Simplified for single-user system
        currentSessionDuration: this.getCurrentSessionDuration(),
        recentInteractions: loggerAnalytics.recentActivity?.totalEvents || 0,
        satisfactionScore: this.calculateSatisfactionScore(loggerAnalytics)
      };

      // Add to performance buffer
      this.performanceBuffer.userInteractions.push({
        timestamp: timestamp,
        value: this.realTimeMetrics.userExperience.recentInteractions
      });
    } catch (error) {
      console.error('Error collecting user experience metrics:', error);
    }
  }

  /**
   * Measure current audio latency
   * @returns {number} Audio latency in milliseconds
   */
  measureAudioLatency() {
    try {
      // This would measure actual audio latency
      // For now, return a simulated value based on system performance
      const performanceNow = performance.now();
      const baseLatency = 50; // Base latency
      const jitter = Math.random() * 20; // Random jitter

      return baseLatency + jitter;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Assess buffer health
   * @param {Object} bufferStats - Buffer statistics
   * @returns {string} Buffer health status
   */
  assessBufferHealth(bufferStats) {
    if (!bufferStats) return 'unknown';

    const { totalBuffered, totalSize } = bufferStats;
    const memoryThreshold = this.thresholds.audioProcessing.memoryUsage;

    if (totalSize > memoryThreshold) return 'critical';
    if (totalBuffered > 10) return 'warning';
    if (totalBuffered > 5) return 'caution';

    return 'good';
  }

  /**
   * Calculate synthesis rate
   * @param {Object} analytics - Logger analytics
   * @returns {number} Synthesis rate (operations per minute)
   */
  calculateSynthesisRate(analytics) {
    const totalInteractions = analytics.totalInteractions || 0;
    const recentActivity = analytics.recentActivity?.totalEvents || 0;

    // Calculate rate based on recent activity (last hour)
    return recentActivity * 60; // Convert to per-hour rate
  }

  /**
   * Get current session duration
   * @returns {number} Session duration in milliseconds
   */
  getCurrentSessionDuration() {
    const loggerStats = voiceInteractionLogger.getStats();

    if (loggerStats.sessionStartTime) {
      return Date.now() - loggerStats.sessionStartTime;
    }

    return 0;
  }

  /**
   * Calculate satisfaction score
   * @param {Object} analytics - Logger analytics
   * @returns {number} Satisfaction score (0-1)
   */
  calculateSatisfactionScore(analytics) {
    const stutteringEvents = analytics.stutteringEvents || 0;
    const totalInteractions = analytics.totalInteractions || 1;
    const errorRate = analytics.recentActivity?.errorRate || 0;

    // Simple satisfaction calculation based on error rates
    const stutteringPenalty = (stutteringEvents / totalInteractions) * 0.3;
    const errorPenalty = errorRate * 0.5;

    return Math.max(0, 1 - stutteringPenalty - errorPenalty);
  }

  /**
   * Update performance buffer
   * @param {number} timestamp - Current timestamp
   */
  updatePerformanceBuffer(timestamp) {
    // Clean old data from buffers
    const maxAge = this.samplingConfig.retentionPeriod;

    Object.keys(this.performanceBuffer).forEach((bufferType) => {
      this.performanceBuffer[bufferType] = this.performanceBuffer[bufferType].filter(
        (entry) => timestamp - entry.timestamp < maxAge
      );
    });
  }

  /**
   * Analyze performance trends and patterns
   */
  analyzePerformance() {
    try {
      const analysis = {
        audioProcessing: this.analyzeAudioPerformance(),
        speechSynthesis: this.analyzeSynthesisPerformance(),
        userExperience: this.analyzeUserExperience(),
        overall: 'good'
      };

      // Determine overall performance
      const componentScores = [
        analysis.audioProcessing.score,
        analysis.speechSynthesis.score,
        analysis.userExperience.score
      ];

      const averageScore = componentScores.reduce((a, b) => a + b, 0) / componentScores.length;

      if (averageScore >= 0.8) analysis.overall = 'excellent';
      else if (averageScore >= 0.6) analysis.overall = 'good';
      else if (averageScore >= 0.4) analysis.overall = 'fair';
      else analysis.overall = 'poor';

      // Log performance analysis to diagnostics
      voiceDiagnostics.addPerformanceMetric('performance_analysis', {
        timestamp: Date.now(),
        value: averageScore,
        unit: 'score',
        context: analysis
      });
    } catch (error) {
      console.error('Error analyzing performance:', error);
    }
  }

  /**
   * Analyze audio processing performance
   * @returns {Object} Audio performance analysis
   */
  analyzeAudioPerformance() {
    const latencyData = this.performanceBuffer.audioLatency.slice(-10); // Last 10 samples
    const memoryData = this.performanceBuffer.memoryUsage.slice(-10);

    const avgLatency =
      latencyData.length > 0
        ? latencyData.reduce((sum, entry) => sum + entry.value, 0) / latencyData.length
        : 0;

    const avgMemory =
      memoryData.length > 0
        ? memoryData.reduce((sum, entry) => sum + entry.value, 0) / memoryData.length
        : 0;

    // Calculate performance score
    let score = 1.0;

    if (avgLatency > this.thresholds.audioProcessing.latency) {
      score -= 0.3;
    }

    if (avgMemory > this.thresholds.audioProcessing.memoryUsage) {
      score -= 0.4;
    }

    return {
      score: Math.max(0, score),
      averageLatency: avgLatency,
      averageMemoryUsage: avgMemory,
      trend: this.calculateTrend(latencyData.map((d) => d.value)),
      issues: this.identifyAudioIssues(avgLatency, avgMemory)
    };
  }

  /**
   * Analyze synthesis performance
   * @returns {Object} Synthesis performance analysis
   */
  analyzeSynthesisPerformance() {
    const synthesisData = this.performanceBuffer.synthesisTime.slice(-10);

    const avgResponseTime =
      synthesisData.length > 0
        ? synthesisData.reduce((sum, entry) => sum + entry.value, 0) / synthesisData.length
        : 0;

    // Calculate performance score
    let score = 1.0;

    if (avgResponseTime > this.thresholds.speechSynthesis.responseTime) {
      score -= 0.4;
    }

    const failureRate = this.realTimeMetrics.speechSynthesis.recentFailures;
    if (failureRate > this.thresholds.speechSynthesis.failureRate) {
      score -= 0.3;
    }

    return {
      score: Math.max(0, score),
      averageResponseTime: avgResponseTime,
      failureRate: failureRate,
      trend: this.calculateTrend(synthesisData.map((d) => d.value)),
      issues: this.identifySynthesisIssues(avgResponseTime, failureRate)
    };
  }

  /**
   * Analyze user experience performance
   * @returns {Object} User experience analysis
   */
  analyzeUserExperience() {
    const interactionData = this.performanceBuffer.userInteractions.slice(-10);

    const avgInteractions =
      interactionData.length > 0
        ? interactionData.reduce((sum, entry) => sum + entry.value, 0) / interactionData.length
        : 0;

    const satisfactionScore = this.realTimeMetrics.userExperience.satisfactionScore;

    return {
      score: satisfactionScore,
      averageInteractions: avgInteractions,
      sessionDuration: this.realTimeMetrics.userExperience.currentSessionDuration,
      satisfactionScore: satisfactionScore,
      trend: this.calculateTrend(interactionData.map((d) => d.value)),
      issues: this.identifyUXIssues(satisfactionScore)
    };
  }

  /**
   * Calculate trend for data points
   * @param {Array} values - Data values
   * @returns {string} Trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';

    // Use simple linear regression for trend calculation
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.5) return 'increasing';
    if (slope < -0.5) return 'decreasing';
    return 'stable';
  }

  /**
   * Identify audio processing issues
   * @param {number} avgLatency - Average latency
   * @param {number} avgMemory - Average memory usage
   * @returns {Array} List of issues
   */
  identifyAudioIssues(avgLatency, avgMemory) {
    const issues = [];

    if (avgLatency > this.thresholds.audioProcessing.latency) {
      issues.push(`High audio latency: ${avgLatency.toFixed(1)}ms`);
    }

    if (avgMemory > this.thresholds.audioProcessing.memoryUsage) {
      issues.push(`High memory usage: ${(avgMemory / 1024 / 1024).toFixed(1)}MB`);
    }

    return issues;
  }

  /**
   * Identify synthesis issues
   * @param {number} avgResponseTime - Average response time
   * @param {number} failureRate - Failure rate
   * @returns {Array} List of issues
   */
  identifySynthesisIssues(avgResponseTime, failureRate) {
    const issues = [];

    if (avgResponseTime > this.thresholds.speechSynthesis.responseTime) {
      issues.push(`Slow synthesis response: ${avgResponseTime.toFixed(0)}ms`);
    }

    if (failureRate > this.thresholds.speechSynthesis.failureRate) {
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    return issues;
  }

  /**
   * Identify UX issues
   * @param {number} satisfactionScore - Satisfaction score
   * @returns {Array} List of issues
   */
  identifyUXIssues(satisfactionScore) {
    const issues = [];

    if (satisfactionScore < 0.7) {
      issues.push(`Low user satisfaction: ${(satisfactionScore * 100).toFixed(0)}%`);
    }

    return issues;
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts() {
    try {
      const alerts = [];

      // Check audio processing alerts
      const audioMetrics = this.realTimeMetrics.audioProcessing;
      if (audioMetrics.currentLatency > this.thresholds.audioProcessing.latency) {
        alerts.push({
          type: 'audio_latency',
          severity: 'warning',
          message: `Audio latency exceeded threshold: ${audioMetrics.currentLatency.toFixed(1)}ms`,
          value: audioMetrics.currentLatency,
          threshold: this.thresholds.audioProcessing.latency
        });
      }

      // Check synthesis alerts
      const synthesisMetrics = this.realTimeMetrics.speechSynthesis;
      if (synthesisMetrics.currentResponseTime > this.thresholds.speechSynthesis.responseTime) {
        alerts.push({
          type: 'synthesis_latency',
          severity: 'warning',
          message: `Synthesis response time exceeded threshold: ${synthesisMetrics.currentResponseTime.toFixed(0)}ms`,
          value: synthesisMetrics.currentResponseTime,
          threshold: this.thresholds.speechSynthesis.responseTime
        });
      }

      // Check UX alerts
      const uxMetrics = this.realTimeMetrics.userExperience;
      if (uxMetrics.satisfactionScore < 0.5) {
        alerts.push({
          type: 'user_satisfaction',
          severity: 'critical',
          message: `User satisfaction critically low: ${(uxMetrics.satisfactionScore * 100).toFixed(0)}%`,
          value: uxMetrics.satisfactionScore,
          threshold: 0.5
        });
      }

      // Process alerts
      alerts.forEach((alert) => this.processAlert(alert));
    } catch (error) {
      console.error('Error checking performance alerts:', error);
    }
  }

  /**
   * Process performance alert
   * @param {Object} alert - Alert data
   */
  processAlert(alert) {
    // Add to alert history
    this.alertHistory.push({
      ...alert,
      timestamp: Date.now(),
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Maintain alert history size
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory.shift();
    }

    // Call registered alert callbacks
    this.alertCallbacks.forEach((callback, callbackId) => {
      try {
        callback(alert);
      } catch (error) {
        console.error(`Error in alert callback ${callbackId}:`, error);
      }
    });

    // Log alert
    console.warn('Performance alert:', alert);
  }

  /**
   * Register alert callback
   * @param {string} callbackId - Callback identifier
   * @param {Function} callback - Alert callback function
   */
  registerAlertCallback(callbackId, callback) {
    this.alertCallbacks.set(callbackId, callback);
  }

  /**
   * Unregister alert callback
   * @param {string} callbackId - Callback identifier
   */
  unregisterAlertCallback(callbackId) {
    this.alertCallbacks.delete(callbackId);
  }

  /**
   * Update performance thresholds
   * @param {Object} newThresholds - New threshold values
   */
  updateThresholds(newThresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    };

    console.log('Performance thresholds updated:', this.thresholds);
  }

  /**
   * Get current performance metrics
   * @returns {Object} Current performance metrics
   */
  getCurrentMetrics() {
    return {
      realTimeMetrics: this.realTimeMetrics,
      performanceBuffer: this.performanceBuffer,
      alertHistory: this.alertHistory.slice(-10), // Last 10 alerts
      thresholds: this.thresholds,
      isActive: this.isActive
    };
  }

  /**
   * Export performance data
   * @param {Object} options - Export options
   * @returns {Object} Exported performance data
   */
  exportPerformanceData(options = {}) {
    const {
      timeRange = 3600000, // 1 hour
      includeAlerts = true,
      format = 'json'
    } = options;

    const now = Date.now();
    const startTime = now - timeRange;

    // Filter data by time range
    const filteredData = {};
    Object.keys(this.performanceBuffer).forEach((bufferType) => {
      filteredData[bufferType] = this.performanceBuffer[bufferType].filter(
        (entry) => entry.timestamp >= startTime
      );
    });

    const exportData = {
      exportTimestamp: now,
      monitorId: this.monitorId,
      timeRange: { start: startTime, end: now },
      performanceData: filteredData,
      currentMetrics: this.realTimeMetrics,
      thresholds: this.thresholds
    };

    if (includeAlerts) {
      exportData.alerts = this.alertHistory.filter((alert) => alert.timestamp >= startTime);
    }

    if (format === 'csv') {
      return this.convertPerformanceToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Convert performance data to CSV
   * @param {Object} exportData - Export data
   * @returns {string} CSV string
   */
  convertPerformanceToCSV(exportData) {
    const headers = ['timestamp', 'metric_type', 'value', 'unit'];
    const rows = [];

    // Add performance data
    Object.entries(exportData.performanceData).forEach(([metricType, data]) => {
      data.forEach((entry) => {
        rows.push([
          entry.timestamp,
          metricType,
          entry.value,
          'ms' // Default unit
        ]);
      });
    });

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  /**
   * Reset performance data
   */
  resetPerformanceData() {
    this.performanceBuffer = {
      audioLatency: [],
      synthesisTime: [],
      memoryUsage: [],
      userInteractions: [],
      errorRates: []
    };

    this.alertHistory = [];

    console.log('Performance data reset');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopMonitoring();
    this.resetPerformanceData();
    this.alertCallbacks.clear();
    console.log('VoicePerformanceMonitor cleaned up');
  }
}

// Export singleton instance
export const voicePerformanceMonitor = new VoicePerformanceMonitor();
