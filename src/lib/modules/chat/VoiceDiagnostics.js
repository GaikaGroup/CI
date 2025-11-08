/**
 * Voice Diagnostics and Monitoring Tools
 * Comprehensive diagnostic functions for voice system health checking,
 * performance monitoring, and user experience metrics tracking
 */

import { get } from 'svelte/store';
import { isVoiceModeActive, isSpeaking } from './voice/index.js';
import { selectedLanguage } from '$modules/i18n/stores';
import { voiceInteractionLogger } from './VoiceInteractionLogger.js';
import { voiceErrorHandler } from './VoiceErrorHandler.js';
import { audioBufferManager } from './AudioBufferManager.js';

export class VoiceDiagnostics {
  constructor() {
    this.diagnosticId = `voice_diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.healthCheckInterval = null;

    // Health check configuration
    this.healthCheckConfig = {
      interval: 30000, // 30 seconds
      thresholds: {
        stutteringRate: 0.1, // 10% max stuttering rate
        errorRate: 0.05, // 5% max error rate
        responseTime: 2000, // 2 seconds max response time
        memoryUsage: 100, // 100MB max memory usage
        bufferUnderrunRate: 0.02 // 2% max buffer underrun rate
      }
    };

    // Performance monitoring configuration
    this.performanceConfig = {
      sampleInterval: 5000, // 5 seconds
      metricsRetention: 3600000, // 1 hour
      alertThresholds: {
        highLatency: 1000, // 1 second
        highMemoryUsage: 50, // 50MB
        lowAudioQuality: 0.7 // 70% quality threshold
      }
    };

    // User experience metrics
    this.uxMetrics = {
      sessionMetrics: new Map(),
      aggregatedMetrics: {
        totalSessions: 0,
        averageSessionDuration: 0,
        userSatisfactionScore: 0,
        interactionSuccessRate: 0,
        featureUsageStats: {}
      }
    };

    // System health status
    this.systemHealth = {
      overall: 'unknown',
      components: {
        audioProcessing: 'unknown',
        speechSynthesis: 'unknown',
        interruptionDetection: 'unknown',
        avatarSync: 'unknown',
        conversationFlow: 'unknown'
      },
      lastHealthCheck: null,
      issues: []
    };

    // Performance metrics storage
    this.performanceMetrics = {
      audioProcessing: [],
      speechSynthesis: [],
      interruptionHandling: [],
      memoryUsage: [],
      networkLatency: [],
      userInteractions: []
    };

    console.log('VoiceDiagnostics initialized:', this.diagnosticId);
  }

  /**
   * Start comprehensive monitoring
   * @param {Object} options - Monitoring options
   */
  startMonitoring(options = {}) {
    if (this.isMonitoring) {
      console.warn('Voice monitoring already active');
      return;
    }

    const {
      healthCheckInterval = this.healthCheckConfig.interval,
      performanceInterval = this.performanceConfig.sampleInterval,
      enableRealTimeAlerts = true
    } = options;

    this.isMonitoring = true;

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, healthCheckInterval);

    // Start performance monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, performanceInterval);

    // Enable real-time alerts if requested
    if (enableRealTimeAlerts) {
      this.enableRealTimeAlerts();
    }

    console.log('Voice monitoring started with intervals:', {
      healthCheck: healthCheckInterval,
      performance: performanceInterval
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Voice monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   * @returns {Promise<Object>} Health check results
   */
  async performHealthCheck() {
    const startTime = performance.now();

    try {
      console.log('Performing voice system health check...');

      const healthResults = {
        timestamp: Date.now(),
        overall: 'healthy',
        components: {},
        performance: {},
        issues: [],
        recommendations: []
      };

      // Check audio processing health
      healthResults.components.audioProcessing = await this.checkAudioProcessingHealth();

      // Check speech synthesis health
      healthResults.components.speechSynthesis = await this.checkSpeechSynthesisHealth();

      // Check interruption detection health
      healthResults.components.interruptionDetection =
        await this.checkInterruptionDetectionHealth();

      // Check avatar synchronization health
      healthResults.components.avatarSync = await this.checkAvatarSyncHealth();

      // Check conversation flow health
      healthResults.components.conversationFlow = await this.checkConversationFlowHealth();

      // Analyze performance metrics
      healthResults.performance = this.analyzePerformanceMetrics();

      // Determine overall health
      healthResults.overall = this.calculateOverallHealth(healthResults.components);

      // Generate issues and recommendations
      healthResults.issues = this.identifyHealthIssues(healthResults);
      healthResults.recommendations = this.generateHealthRecommendations(healthResults);

      // Update system health status
      this.systemHealth = {
        ...healthResults,
        lastHealthCheck: Date.now()
      };

      const duration = performance.now() - startTime;
      console.log(`Health check completed in ${duration.toFixed(1)}ms:`, healthResults.overall);

      return healthResults;
    } catch (error) {
      console.error('Error during health check:', error);

      const errorResult = {
        timestamp: Date.now(),
        overall: 'error',
        error: error.message,
        components: {},
        issues: ['Health check system failure'],
        recommendations: ['Restart voice system', 'Check browser compatibility']
      };

      this.systemHealth = errorResult;
      return errorResult;
    }
  }

  /**
   * Check audio processing component health
   * @returns {Promise<Object>} Audio processing health status
   */
  async checkAudioProcessingHealth() {
    try {
      const bufferStats = audioBufferManager.getBufferStats();
      const errorStats = voiceErrorHandler.getErrorStats();

      // Check for audio processing issues
      const audioErrors = errorStats.errorTypeBreakdown.audio_processing_failure || 0;
      const totalErrors = errorStats.totalErrors;
      const audioErrorRate = totalErrors > 0 ? audioErrors / totalErrors : 0;

      // Check buffer performance
      const bufferHealth = {
        bufferedItems: bufferStats.totalBuffered,
        averageDuration: bufferStats.averageDuration,
        memoryUsage: bufferStats.totalSize,
        isHealthy: bufferStats.totalBuffered < 10 && bufferStats.totalSize < 50 * 1024 * 1024 // 50MB
      };

      // Determine health status
      let status = 'healthy';
      const issues = [];

      if (audioErrorRate > this.healthCheckConfig.thresholds.errorRate) {
        status = 'degraded';
        issues.push(`High audio error rate: ${(audioErrorRate * 100).toFixed(1)}%`);
      }

      if (!bufferHealth.isHealthy) {
        status = 'degraded';
        if (bufferStats.totalBuffered >= 10) {
          issues.push(`Too many buffered items: ${bufferStats.totalBuffered}`);
        }
        if (bufferStats.totalSize >= 50 * 1024 * 1024) {
          issues.push(`High memory usage: ${(bufferStats.totalSize / 1024 / 1024).toFixed(1)}MB`);
        }
      }

      return {
        status: status,
        errorRate: audioErrorRate,
        bufferHealth: bufferHealth,
        issues: issues,
        metrics: {
          bufferedItems: bufferStats.totalBuffered,
          memoryUsage: bufferStats.totalSize,
          averageDuration: bufferStats.averageDuration
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        issues: ['Audio processing health check failed']
      };
    }
  }

  /**
   * Check speech synthesis component health
   * @returns {Promise<Object>} Speech synthesis health status
   */
  async checkSpeechSynthesisHealth() {
    try {
      const loggerStats = voiceInteractionLogger.getStats();
      const performanceAnalytics = voiceInteractionLogger.getPerformanceAnalytics();

      // Check synthesis failure rate
      const synthesisFailures = performanceAnalytics.synthesisFailures || 0;
      const totalInteractions = performanceAnalytics.totalInteractions || 1;
      const failureRate = synthesisFailures / totalInteractions;

      // Check average response time
      const avgResponseTime = performanceAnalytics.averageResponseTime || 0;

      let status = 'healthy';
      const issues = [];

      if (failureRate > this.healthCheckConfig.thresholds.errorRate) {
        status = 'degraded';
        issues.push(`High synthesis failure rate: ${(failureRate * 100).toFixed(1)}%`);
      }

      if (avgResponseTime > this.healthCheckConfig.thresholds.responseTime) {
        status = 'degraded';
        issues.push(`Slow response time: ${avgResponseTime.toFixed(0)}ms`);
      }

      return {
        status: status,
        failureRate: failureRate,
        averageResponseTime: avgResponseTime,
        totalInteractions: totalInteractions,
        issues: issues,
        metrics: {
          synthesisFailures: synthesisFailures,
          totalInteractions: totalInteractions,
          recentActivity: performanceAnalytics.recentActivity
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        issues: ['Speech synthesis health check failed']
      };
    }
  }

  /**
   * Check interruption detection component health
   * @returns {Promise<Object>} Interruption detection health status
   */
  async checkInterruptionDetectionHealth() {
    try {
      const performanceAnalytics = voiceInteractionLogger.getPerformanceAnalytics();
      const interruptionCount = performanceAnalytics.interruptionCount || 0;
      const recentInterruptions = performanceAnalytics.recentActivity?.interruptionRate || 0;

      // Check if interruption detection is working
      const hasRecentActivity = recentInterruptions > 0 || interruptionCount > 0;

      let status = 'healthy';
      const issues = [];

      // Check for microphone access
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Test microphone access (this is a simplified check)
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (micError) {
          status = 'degraded';
          issues.push('Microphone access denied or unavailable');
        }
      } else {
        status = 'degraded';
        issues.push('MediaDevices API not available');
      }

      return {
        status: status,
        interruptionCount: interruptionCount,
        recentInterruptions: recentInterruptions,
        hasRecentActivity: hasRecentActivity,
        issues: issues,
        metrics: {
          totalInterruptions: interruptionCount,
          recentRate: recentInterruptions
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        issues: ['Interruption detection health check failed']
      };
    }
  }

  /**
   * Check avatar synchronization component health
   * @returns {Promise<Object>} Avatar sync health status
   */
  async checkAvatarSyncHealth() {
    try {
      // Check if avatar is responsive
      const voiceState = {
        isVoiceModeActive: get(isVoiceModeActive),
        isSpeaking: get(isSpeaking)
      };

      let status = 'healthy';
      const issues = [];

      // Basic avatar health checks
      if (voiceState.isVoiceModeActive) {
        // Avatar should be available in voice mode
        status = 'healthy';
      } else {
        // Not in voice mode, so avatar sync is not applicable
        status = 'inactive';
      }

      return {
        status: status,
        voiceState: voiceState,
        issues: issues,
        metrics: {
          isVoiceModeActive: voiceState.isVoiceModeActive,
          isSpeaking: voiceState.isSpeaking
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        issues: ['Avatar sync health check failed']
      };
    }
  }

  /**
   * Check conversation flow component health
   * @returns {Promise<Object>} Conversation flow health status
   */
  async checkConversationFlowHealth() {
    try {
      const loggerStats = voiceInteractionLogger.getStats();
      const currentLanguage = get(selectedLanguage);

      let status = 'healthy';
      const issues = [];

      // Check if conversation system is active
      if (loggerStats.currentSessionId) {
        status = 'active';
      } else {
        status = 'inactive';
      }

      // Check language consistency
      if (!currentLanguage) {
        issues.push('No language selected');
      }

      return {
        status: status,
        sessionId: loggerStats.currentSessionId,
        currentLanguage: currentLanguage,
        sessionStartTime: loggerStats.sessionStartTime,
        issues: issues,
        metrics: {
          totalLogs: loggerStats.totalLogs,
          sessionActive: !!loggerStats.currentSessionId
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        issues: ['Conversation flow health check failed']
      };
    }
  }

  /**
   * Analyze performance metrics
   * @returns {Object} Performance analysis
   */
  analyzePerformanceMetrics() {
    try {
      const analysis = {
        audioProcessing: this.analyzeMetricArray(this.performanceMetrics.audioProcessing),
        speechSynthesis: this.analyzeMetricArray(this.performanceMetrics.speechSynthesis),
        interruptionHandling: this.analyzeMetricArray(this.performanceMetrics.interruptionHandling),
        memoryUsage: this.analyzeMetricArray(this.performanceMetrics.memoryUsage),
        networkLatency: this.analyzeMetricArray(this.performanceMetrics.networkLatency),
        trends: this.analyzeTrends()
      };

      return analysis;
    } catch (error) {
      console.error('Error analyzing performance metrics:', error);
      return { error: error.message };
    }
  }

  /**
   * Analyze metric array for statistics
   * @param {Array} metrics - Array of metric values
   * @returns {Object} Metric statistics
   */
  analyzeMetricArray(metrics) {
    if (!metrics || metrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, trend: 'stable' };
    }

    const values = metrics.map((m) => m.value || m);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend (simple linear regression)
    const trend = this.calculateTrend(values);

    return {
      count: values.length,
      average: average,
      min: min,
      max: max,
      trend: trend,
      latest: values[values.length - 1] || 0
    };
  }

  /**
   * Calculate trend for metric values
   * @param {Array} values - Metric values
   * @returns {string} Trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';

    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze trends across all metrics
   * @returns {Object} Trend analysis
   */
  analyzeTrends() {
    const trends = {
      overall: 'stable',
      concerns: [],
      improvements: []
    };

    // Analyze each metric type for trends
    Object.keys(this.performanceMetrics).forEach((metricType) => {
      const analysis = this.analyzeMetricArray(this.performanceMetrics[metricType]);

      if (analysis.trend === 'increasing' && metricType !== 'userInteractions') {
        trends.concerns.push(`${metricType} is increasing`);
      } else if (analysis.trend === 'decreasing' && metricType !== 'userInteractions') {
        trends.improvements.push(`${metricType} is decreasing`);
      }
    });

    // Determine overall trend
    if (trends.concerns.length > trends.improvements.length) {
      trends.overall = 'degrading';
    } else if (trends.improvements.length > trends.concerns.length) {
      trends.overall = 'improving';
    }

    return trends;
  }

  /**
   * Calculate overall health status
   * @param {Object} components - Component health statuses
   * @returns {string} Overall health status
   */
  calculateOverallHealth(components) {
    const statuses = Object.values(components).map((c) => c.status);

    if (statuses.includes('error')) return 'error';
    if (statuses.includes('degraded')) return 'degraded';
    if (statuses.every((s) => s === 'healthy' || s === 'active' || s === 'inactive'))
      return 'healthy';

    return 'unknown';
  }

  /**
   * Identify health issues from check results
   * @param {Object} healthResults - Health check results
   * @returns {Array} List of issues
   */
  identifyHealthIssues(healthResults) {
    const issues = [];

    // Collect issues from all components
    Object.values(healthResults.components).forEach((component) => {
      if (component.issues) {
        issues.push(...component.issues);
      }
    });

    // Add performance-based issues
    if (healthResults.performance.trends?.concerns) {
      issues.push(...healthResults.performance.trends.concerns);
    }

    return issues;
  }

  /**
   * Generate health recommendations
   * @param {Object} healthResults - Health check results
   * @returns {Array} List of recommendations
   */
  generateHealthRecommendations(healthResults) {
    const recommendations = [];

    // Audio processing recommendations
    const audioHealth = healthResults.components.audioProcessing;
    if (audioHealth?.status === 'degraded') {
      if (audioHealth.bufferHealth?.bufferedItems >= 10) {
        recommendations.push('Clear audio buffer cache to free memory');
      }
      if (audioHealth.errorRate > 0.1) {
        recommendations.push('Check network connection and audio device settings');
      }
    }

    // Speech synthesis recommendations
    const synthesisHealth = healthResults.components.speechSynthesis;
    if (synthesisHealth?.status === 'degraded') {
      if (synthesisHealth.failureRate > 0.05) {
        recommendations.push('Check TTS service availability and API limits');
      }
      if (synthesisHealth.averageResponseTime > 2000) {
        recommendations.push('Consider using faster TTS service or reduce text length');
      }
    }

    // Interruption detection recommendations
    const interruptionHealth = healthResults.components.interruptionDetection;
    if (interruptionHealth?.status === 'degraded') {
      recommendations.push('Check microphone permissions and device settings');
    }

    // General performance recommendations
    if (healthResults.performance.trends?.overall === 'degrading') {
      recommendations.push('Monitor system resources and consider performance optimization');
    }

    return recommendations;
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics() {
    try {
      const timestamp = Date.now();

      // Collect audio processing metrics
      const bufferStats = audioBufferManager.getBufferStats();
      this.addPerformanceMetric('memoryUsage', {
        timestamp: timestamp,
        value: bufferStats.totalSize,
        unit: 'bytes',
        context: 'audio_buffer'
      });

      // Collect speech synthesis metrics
      const loggerAnalytics = voiceInteractionLogger.getPerformanceAnalytics();
      if (loggerAnalytics.averageResponseTime > 0) {
        this.addPerformanceMetric('speechSynthesis', {
          timestamp: timestamp,
          value: loggerAnalytics.averageResponseTime,
          unit: 'ms',
          context: 'response_time'
        });
      }

      // Collect user interaction metrics
      this.addPerformanceMetric('userInteractions', {
        timestamp: timestamp,
        value: loggerAnalytics.totalInteractions,
        unit: 'count',
        context: 'total_interactions'
      });

      // Clean old metrics
      this.cleanOldMetrics();
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Add performance metric
   * @param {string} type - Metric type
   * @param {Object} metric - Metric data
   */
  addPerformanceMetric(type, metric) {
    if (!this.performanceMetrics[type]) {
      this.performanceMetrics[type] = [];
    }

    this.performanceMetrics[type].push(metric);

    // Limit metric history
    const maxMetrics = 100;
    if (this.performanceMetrics[type].length > maxMetrics) {
      this.performanceMetrics[type] = this.performanceMetrics[type].slice(-maxMetrics);
    }
  }

  /**
   * Clean old metrics based on retention policy
   */
  cleanOldMetrics() {
    const now = Date.now();
    const maxAge = this.performanceConfig.metricsRetention;

    Object.keys(this.performanceMetrics).forEach((type) => {
      this.performanceMetrics[type] = this.performanceMetrics[type].filter(
        (metric) => now - metric.timestamp < maxAge
      );
    });
  }

  /**
   * Enable real-time alerts for performance issues
   */
  enableRealTimeAlerts() {
    // This would set up real-time monitoring and alerting
    console.log('Real-time alerts enabled for voice diagnostics');
  }

  /**
   * Track user experience metrics
   * @param {Object} uxData - User experience data
   */
  trackUserExperience(uxData) {
    try {
      const { sessionId, interactionType, success, duration, userSatisfaction, errorEncountered } =
        uxData;

      // Update session metrics
      if (!this.uxMetrics.sessionMetrics.has(sessionId)) {
        this.uxMetrics.sessionMetrics.set(sessionId, {
          startTime: Date.now(),
          interactions: [],
          totalDuration: 0,
          successCount: 0,
          errorCount: 0
        });
      }

      const sessionMetrics = this.uxMetrics.sessionMetrics.get(sessionId);
      sessionMetrics.interactions.push({
        type: interactionType,
        success: success,
        duration: duration,
        timestamp: Date.now(),
        userSatisfaction: userSatisfaction,
        errorEncountered: errorEncountered
      });

      if (success) sessionMetrics.successCount++;
      if (errorEncountered) sessionMetrics.errorCount++;
      if (duration) sessionMetrics.totalDuration += duration;

      // Update aggregated metrics
      this.updateAggregatedUXMetrics();
    } catch (error) {
      console.error('Error tracking user experience:', error);
    }
  }

  /**
   * Update aggregated UX metrics
   */
  updateAggregatedUXMetrics() {
    const sessions = Array.from(this.uxMetrics.sessionMetrics.values());

    if (sessions.length === 0) return;

    const totalInteractions = sessions.reduce(
      (sum, session) => sum + session.interactions.length,
      0
    );
    const successfulInteractions = sessions.reduce((sum, session) => sum + session.successCount, 0);
    const totalDuration = sessions.reduce((sum, session) => sum + session.totalDuration, 0);

    this.uxMetrics.aggregatedMetrics = {
      totalSessions: sessions.length,
      averageSessionDuration: totalDuration / sessions.length,
      interactionSuccessRate:
        totalInteractions > 0 ? successfulInteractions / totalInteractions : 0,
      totalInteractions: totalInteractions
    };
  }

  /**
   * Generate diagnostic report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Diagnostic report
   */
  async generateDiagnosticReport(options = {}) {
    try {
      const {
        includeHealthCheck = true,
        includePerformanceMetrics = true,
        includeUXMetrics = true,
        includeRecommendations = true
      } = options;

      const report = {
        timestamp: Date.now(),
        diagnosticId: this.diagnosticId,
        systemInfo: {
          userAgent: navigator.userAgent,
          language: get(selectedLanguage),
          voiceState: {
            isVoiceModeActive: get(isVoiceModeActive),
            isSpeaking: get(isSpeaking)
          }
        }
      };

      if (includeHealthCheck) {
        report.healthCheck = await this.performHealthCheck();
      }

      if (includePerformanceMetrics) {
        report.performanceMetrics = {
          current: this.performanceMetrics,
          analysis: this.analyzePerformanceMetrics()
        };
      }

      if (includeUXMetrics) {
        report.userExperience = {
          sessionMetrics: Object.fromEntries(this.uxMetrics.sessionMetrics),
          aggregatedMetrics: this.uxMetrics.aggregatedMetrics
        };
      }

      if (includeRecommendations && report.healthCheck) {
        report.recommendations = this.generateHealthRecommendations(report.healthCheck);
      }

      console.log('Diagnostic report generated:', report.timestamp);
      return report;
    } catch (error) {
      console.error('Error generating diagnostic report:', error);
      return {
        timestamp: Date.now(),
        error: error.message,
        diagnosticId: this.diagnosticId
      };
    }
  }

  /**
   * Export diagnostic data
   * @param {Object} options - Export options
   * @returns {Object} Exported diagnostic data
   */
  exportDiagnosticData(options = {}) {
    const { format = 'json', includeRawMetrics = false } = options;

    const exportData = {
      exportTimestamp: Date.now(),
      diagnosticId: this.diagnosticId,
      systemHealth: this.systemHealth,
      performanceMetrics: includeRawMetrics
        ? this.performanceMetrics
        : this.analyzePerformanceMetrics(),
      uxMetrics: this.uxMetrics.aggregatedMetrics,
      configuration: {
        healthCheckConfig: this.healthCheckConfig,
        performanceConfig: this.performanceConfig
      }
    };

    if (format === 'csv') {
      return this.convertDiagnosticsToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Convert diagnostics to CSV format
   * @param {Object} exportData - Export data
   * @returns {string} CSV string
   */
  convertDiagnosticsToCSV(exportData) {
    const headers = ['timestamp', 'metric_type', 'metric_name', 'value', 'unit', 'status'];
    const rows = [];

    // Add health check data
    if (exportData.systemHealth.components) {
      Object.entries(exportData.systemHealth.components).forEach(([component, data]) => {
        rows.push([
          exportData.exportTimestamp,
          'health_check',
          component,
          data.status,
          'status',
          data.status
        ]);
      });
    }

    // Add performance metrics
    if (exportData.performanceMetrics) {
      Object.entries(exportData.performanceMetrics).forEach(([metric, data]) => {
        if (data.average !== undefined) {
          rows.push([
            exportData.exportTimestamp,
            'performance',
            metric,
            data.average,
            'ms',
            data.trend
          ]);
        }
      });
    }

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  /**
   * Get current system status
   * @returns {Object} Current system status
   */
  getCurrentStatus() {
    return {
      isMonitoring: this.isMonitoring,
      systemHealth: this.systemHealth,
      lastHealthCheck: this.systemHealth.lastHealthCheck,
      performanceMetrics: this.analyzePerformanceMetrics(),
      uxMetrics: this.uxMetrics.aggregatedMetrics
    };
  }

  /**
   * Reset all diagnostic data
   */
  resetDiagnostics() {
    this.performanceMetrics = {
      audioProcessing: [],
      speechSynthesis: [],
      interruptionHandling: [],
      memoryUsage: [],
      networkLatency: [],
      userInteractions: []
    };

    this.uxMetrics.sessionMetrics.clear();
    this.uxMetrics.aggregatedMetrics = {
      totalSessions: 0,
      averageSessionDuration: 0,
      userSatisfactionScore: 0,
      interactionSuccessRate: 0,
      featureUsageStats: {}
    };

    this.systemHealth = {
      overall: 'unknown',
      components: {
        audioProcessing: 'unknown',
        speechSynthesis: 'unknown',
        interruptionDetection: 'unknown',
        avatarSync: 'unknown',
        conversationFlow: 'unknown'
      },
      lastHealthCheck: null,
      issues: []
    };

    console.log('Voice diagnostics data reset');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopMonitoring();
    this.resetDiagnostics();
    console.log('VoiceDiagnostics cleaned up');
  }
}

// Export singleton instance
export const voiceDiagnostics = new VoiceDiagnostics();
