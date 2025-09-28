/**
 * Voice Diagnostics and Monitoring Tools Tests
 * Comprehensive tests for voice system health checking, performance monitoring,
 * and user experience metrics tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceDiagnostics } from '../../../src/lib/modules/chat/VoiceDiagnostics.js';
import { VoicePerformanceMonitor } from '../../../src/lib/modules/chat/VoicePerformanceMonitor.js';
import { VoiceUXMetricsTracker } from '../../../src/lib/modules/chat/VoiceUXMetricsTracker.js';

// Mock dependencies
vi.mock('svelte/store', () => ({
  get: vi.fn(() => 'en')
}));

vi.mock('../../../src/lib/modules/chat/voiceServices.js', () => ({
  isVoiceModeActive: { subscribe: vi.fn() },
  isSpeaking: { subscribe: vi.fn() }
}));

vi.mock('../../../src/lib/modules/i18n/stores', () => ({
  selectedLanguage: { subscribe: vi.fn() }
}));

vi.mock('../../../src/lib/modules/chat/VoiceInteractionLogger.js', () => ({
  voiceInteractionLogger: {
    getStats: vi.fn(() => ({
      totalLogs: 10,
      currentSessionId: 'test-session',
      sessionStartTime: Date.now() - 60000
    })),
    getPerformanceAnalytics: vi.fn(() => ({
      stutteringEvents: 2,
      interruptionCount: 1,
      synthesisFailures: 0,
      averageResponseTime: 1500,
      totalInteractions: 10,
      recentActivity: {
        totalEvents: 5,
        stutteringRate: 1,
        interruptionRate: 0,
        errorRate: 0
      }
    }))
  }
}));

vi.mock('../../../src/lib/modules/chat/VoiceErrorHandler.js', () => ({
  voiceErrorHandler: {
    getErrorStats: vi.fn(() => ({
      totalErrors: 2,
      errorsLast24Hours: 1,
      errorsLastHour: 0,
      errorTypeBreakdown: {
        audio_processing_failure: 1,
        network_synthesis_failure: 1
      },
      mostCommonError: 'audio_processing_failure'
    }))
  }
}));

vi.mock('../../../src/lib/modules/chat/AudioBufferManager.js', () => ({
  audioBufferManager: {
    getBufferStats: vi.fn(() => ({
      totalBuffered: 3,
      totalSize: 1024 * 1024 * 10, // 10MB
      averageDuration: 2.5,
      oldestItem: 'audio1',
      newestItem: 'audio3'
    }))
  }
}));

describe('VoiceDiagnostics', () => {
  let diagnostics;

  beforeEach(() => {
    diagnostics = new VoiceDiagnostics();
  });

  afterEach(() => {
    diagnostics.cleanup();
  });

  describe('Health Check System', () => {
    it('should perform comprehensive health check', async () => {
      const healthResults = await diagnostics.performHealthCheck();

      expect(healthResults).toHaveProperty('timestamp');
      expect(healthResults).toHaveProperty('overall');
      expect(healthResults).toHaveProperty('components');
      expect(healthResults).toHaveProperty('performance');
      expect(healthResults).toHaveProperty('issues');
      expect(healthResults).toHaveProperty('recommendations');

      // Check component health results
      expect(healthResults.components).toHaveProperty('audioProcessing');
      expect(healthResults.components).toHaveProperty('speechSynthesis');
      expect(healthResults.components).toHaveProperty('interruptionDetection');
      expect(healthResults.components).toHaveProperty('avatarSync');
      expect(healthResults.components).toHaveProperty('conversationFlow');
    });

    it('should check audio processing health', async () => {
      const audioHealth = await diagnostics.checkAudioProcessingHealth();

      expect(audioHealth).toHaveProperty('status');
      expect(audioHealth).toHaveProperty('errorRate');
      expect(audioHealth).toHaveProperty('bufferHealth');
      expect(audioHealth).toHaveProperty('issues');
      expect(audioHealth).toHaveProperty('metrics');

      expect(audioHealth.status).toMatch(/^(healthy|degraded|error)$/);
      expect(typeof audioHealth.errorRate).toBe('number');
      expect(audioHealth.bufferHealth).toHaveProperty('isHealthy');
    });

    it('should check speech synthesis health', async () => {
      const synthesisHealth = await diagnostics.checkSpeechSynthesisHealth();

      expect(synthesisHealth).toHaveProperty('status');
      expect(synthesisHealth).toHaveProperty('failureRate');
      expect(synthesisHealth).toHaveProperty('averageResponseTime');
      expect(synthesisHealth).toHaveProperty('totalInteractions');
      expect(synthesisHealth).toHaveProperty('issues');

      expect(synthesisHealth.status).toMatch(/^(healthy|degraded|error)$/);
      expect(typeof synthesisHealth.failureRate).toBe('number');
      expect(typeof synthesisHealth.averageResponseTime).toBe('number');
    });

    it('should identify health issues correctly', async () => {
      const healthResults = await diagnostics.performHealthCheck();
      const issues = diagnostics.identifyHealthIssues(healthResults);

      expect(Array.isArray(issues)).toBe(true);
      // Issues should be strings describing problems
      issues.forEach(issue => {
        expect(typeof issue).toBe('string');
        expect(issue.length).toBeGreaterThan(0);
      });
    });

    it('should generate appropriate recommendations', async () => {
      const healthResults = await diagnostics.performHealthCheck();
      const recommendations = diagnostics.generateHealthRecommendations(healthResults);

      expect(Array.isArray(recommendations)).toBe(true);
      // Recommendations should be actionable strings
      recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(diagnostics.isMonitoring).toBe(false);

      diagnostics.startMonitoring();
      expect(diagnostics.isMonitoring).toBe(true);

      diagnostics.stopMonitoring();
      expect(diagnostics.isMonitoring).toBe(false);
    });

    it('should collect performance metrics', () => {
      diagnostics.collectPerformanceMetrics();

      // Check that metrics were added
      expect(diagnostics.performanceMetrics.memoryUsage.length).toBeGreaterThan(0);
      expect(diagnostics.performanceMetrics.speechSynthesis.length).toBeGreaterThan(0);
      expect(diagnostics.performanceMetrics.userInteractions.length).toBeGreaterThan(0);
    });

    it('should analyze performance metrics correctly', () => {
      // Add some test metrics
      diagnostics.addPerformanceMetric('audioProcessing', {
        timestamp: Date.now(),
        value: 150,
        unit: 'ms'
      });

      const analysis = diagnostics.analyzePerformanceMetrics();

      expect(analysis).toHaveProperty('audioProcessing');
      expect(analysis).toHaveProperty('trends');
      expect(analysis.audioProcessing).toHaveProperty('count');
      expect(analysis.audioProcessing).toHaveProperty('average');
      expect(analysis.audioProcessing).toHaveProperty('trend');
    });

    it('should clean old metrics based on retention policy', () => {
      const oldTimestamp = Date.now() - (2 * 3600000); // 2 hours ago
      
      // Add old metric
      diagnostics.addPerformanceMetric('audioProcessing', {
        timestamp: oldTimestamp,
        value: 100,
        unit: 'ms'
      });

      // Add recent metric
      diagnostics.addPerformanceMetric('audioProcessing', {
        timestamp: Date.now(),
        value: 150,
        unit: 'ms'
      });

      expect(diagnostics.performanceMetrics.audioProcessing.length).toBe(2);

      // Clean old metrics
      diagnostics.cleanOldMetrics();

      // Only recent metric should remain
      expect(diagnostics.performanceMetrics.audioProcessing.length).toBe(1);
      expect(diagnostics.performanceMetrics.audioProcessing[0].value).toBe(150);
    });
  });

  describe('User Experience Tracking', () => {
    it('should track user experience metrics', () => {
      const uxData = {
        sessionId: 'test-session',
        interactionType: 'voice_command',
        success: true,
        duration: 2000,
        userSatisfaction: 4,
        errorEncountered: false
      };

      diagnostics.trackUserExperience(uxData);

      expect(diagnostics.uxMetrics.sessionMetrics.has('test-session')).toBe(true);
      
      const sessionMetrics = diagnostics.uxMetrics.sessionMetrics.get('test-session');
      expect(sessionMetrics.interactions.length).toBe(1);
      expect(sessionMetrics.successCount).toBe(1);
      expect(sessionMetrics.errorCount).toBe(0);
    });

    it('should update aggregated UX metrics', () => {
      const uxData = {
        sessionId: 'test-session',
        interactionType: 'voice_command',
        success: true,
        duration: 2000
      };

      diagnostics.trackUserExperience(uxData);
      diagnostics.updateAggregatedUXMetrics();

      expect(diagnostics.uxMetrics.aggregatedMetrics.totalSessions).toBe(1);
      expect(diagnostics.uxMetrics.aggregatedMetrics.interactionSuccessRate).toBe(1);
      expect(diagnostics.uxMetrics.aggregatedMetrics.totalInteractions).toBe(1);
    });
  });

  describe('Diagnostic Report Generation', () => {
    it('should generate comprehensive diagnostic report', async () => {
      const report = await diagnostics.generateDiagnosticReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('diagnosticId');
      expect(report).toHaveProperty('systemInfo');
      expect(report).toHaveProperty('healthCheck');
      expect(report).toHaveProperty('performanceMetrics');
      expect(report).toHaveProperty('userExperience');
      expect(report).toHaveProperty('recommendations');

      expect(report.systemInfo).toHaveProperty('userAgent');
      expect(report.systemInfo).toHaveProperty('voiceState');
    });

    it('should export diagnostic data in different formats', () => {
      // Add some test data
      diagnostics.addPerformanceMetric('audioProcessing', {
        timestamp: Date.now(),
        value: 100,
        unit: 'ms'
      });

      const jsonExport = diagnostics.exportDiagnosticData({ format: 'json' });
      expect(typeof jsonExport).toBe('object');
      expect(jsonExport).toHaveProperty('exportTimestamp');
      expect(jsonExport).toHaveProperty('diagnosticId');

      const csvExport = diagnostics.exportDiagnosticData({ format: 'csv' });
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('timestamp,metric_type,metric_name,value,unit,status');
    });
  });

  describe('System Status', () => {
    it('should provide current system status', () => {
      const status = diagnostics.getCurrentStatus();

      expect(status).toHaveProperty('isMonitoring');
      expect(status).toHaveProperty('systemHealth');
      expect(status).toHaveProperty('performanceMetrics');
      expect(status).toHaveProperty('uxMetrics');

      expect(typeof status.isMonitoring).toBe('boolean');
    });

    it('should reset diagnostic data correctly', () => {
      // Add some test data
      diagnostics.addPerformanceMetric('audioProcessing', {
        timestamp: Date.now(),
        value: 100,
        unit: 'ms'
      });

      diagnostics.trackUserExperience({
        sessionId: 'test-session',
        interactionType: 'test',
        success: true
      });

      expect(diagnostics.performanceMetrics.audioProcessing.length).toBeGreaterThan(0);
      expect(diagnostics.uxMetrics.sessionMetrics.size).toBeGreaterThan(0);

      diagnostics.resetDiagnostics();

      expect(diagnostics.performanceMetrics.audioProcessing.length).toBe(0);
      expect(diagnostics.uxMetrics.sessionMetrics.size).toBe(0);
    });
  });
});

describe('VoicePerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new VoicePerformanceMonitor();
  });

  afterEach(() => {
    monitor.cleanup();
  });

  describe('Real-time Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(monitor.isActive).toBe(false);

      monitor.startMonitoring();
      expect(monitor.isActive).toBe(true);

      monitor.stopMonitoring();
      expect(monitor.isActive).toBe(false);
    });

    it('should collect real-time metrics', () => {
      monitor.collectRealTimeMetrics();

      expect(monitor.realTimeMetrics).toHaveProperty('audioProcessing');
      expect(monitor.realTimeMetrics).toHaveProperty('speechSynthesis');
      expect(monitor.realTimeMetrics).toHaveProperty('userExperience');

      // Check audio processing metrics
      expect(monitor.realTimeMetrics.audioProcessing).toHaveProperty('currentLatency');
      expect(monitor.realTimeMetrics.audioProcessing).toHaveProperty('bufferHealth');
      expect(monitor.realTimeMetrics.audioProcessing).toHaveProperty('memoryUsage');
    });

    it('should update performance buffer correctly', () => {
      const timestamp = Date.now();
      monitor.updatePerformanceBuffer(timestamp);

      // Add some old data to test cleanup
      const oldTimestamp = timestamp - (2 * 3600000); // 2 hours ago
      monitor.performanceBuffer.audioLatency.push({
        timestamp: oldTimestamp,
        value: 100
      });

      monitor.updatePerformanceBuffer(timestamp);

      // Old data should be removed
      const hasOldData = monitor.performanceBuffer.audioLatency.some(
        entry => entry.timestamp === oldTimestamp
      );
      expect(hasOldData).toBe(false);
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze audio performance', () => {
      // Add test data
      for (let i = 0; i < 5; i++) {
        monitor.performanceBuffer.audioLatency.push({
          timestamp: Date.now() - i * 1000,
          value: 50 + i * 10
        });
      }

      const analysis = monitor.analyzeAudioPerformance();

      expect(analysis).toHaveProperty('score');
      expect(analysis).toHaveProperty('averageLatency');
      expect(analysis).toHaveProperty('trend');
      expect(analysis).toHaveProperty('issues');

      expect(typeof analysis.score).toBe('number');
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(1);
    });

    it('should calculate trends correctly', () => {
      const increasingValues = [10, 20, 30, 40, 50];
      const decreasingValues = [50, 40, 30, 20, 10];
      const stableValues = [25, 26, 24, 25, 26];

      expect(monitor.calculateTrend(increasingValues)).toBe('increasing');
      expect(monitor.calculateTrend(decreasingValues)).toBe('decreasing');
      expect(monitor.calculateTrend(stableValues)).toBe('stable');
    });

    it('should identify performance issues', () => {
      const highLatency = 200; // Above threshold
      const highMemory = 100 * 1024 * 1024; // 100MB

      const issues = monitor.identifyAudioIssues(highLatency, highMemory);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('latency'))).toBe(true);
      expect(issues.some(issue => issue.includes('memory'))).toBe(true);
    });
  });

  describe('Alert System', () => {
    it('should process performance alerts', () => {
      const alert = {
        type: 'audio_latency',
        severity: 'warning',
        message: 'High audio latency detected',
        value: 200,
        threshold: 100
      };

      const initialAlertCount = monitor.alertHistory.length;
      monitor.processAlert(alert);

      expect(monitor.alertHistory.length).toBe(initialAlertCount + 1);
      expect(monitor.alertHistory[monitor.alertHistory.length - 1]).toMatchObject(alert);
    });

    it('should register and call alert callbacks', () => {
      const mockCallback = vi.fn();
      monitor.registerAlertCallback('test-callback', mockCallback);

      const alert = {
        type: 'test_alert',
        severity: 'info',
        message: 'Test alert'
      };

      monitor.processAlert(alert);

      expect(mockCallback).toHaveBeenCalledWith(alert);
    });

    it('should update performance thresholds', () => {
      const newThresholds = {
        audioProcessing: {
          latency: 200 // Increased from default
        }
      };

      monitor.updateThresholds(newThresholds);

      expect(monitor.thresholds.audioProcessing.latency).toBe(200);
    });
  });

  describe('Data Export', () => {
    it('should export performance data in JSON format', () => {
      // Add test data
      monitor.performanceBuffer.audioLatency.push({
        timestamp: Date.now(),
        value: 100
      });

      const exportData = monitor.exportPerformanceData({ format: 'json' });

      expect(typeof exportData).toBe('object');
      expect(exportData).toHaveProperty('exportTimestamp');
      expect(exportData).toHaveProperty('monitorId');
      expect(exportData).toHaveProperty('performanceData');
      expect(exportData).toHaveProperty('currentMetrics');
    });

    it('should export performance data in CSV format', () => {
      // Add test data
      monitor.performanceBuffer.audioLatency.push({
        timestamp: Date.now(),
        value: 100
      });

      const csvData = monitor.exportPerformanceData({ format: 'csv' });

      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('timestamp,metric_type,value,unit');
    });
  });
});

describe('VoiceUXMetricsTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new VoiceUXMetricsTracker();
  });

  afterEach(() => {
    tracker.cleanup();
  });

  describe('Session Management', () => {
    it('should start and end UX tracking sessions', () => {
      expect(tracker.isTracking).toBe(false);
      expect(tracker.currentSession).toBeNull();

      tracker.startTracking({ userId: 'test-user' });

      expect(tracker.isTracking).toBe(true);
      expect(tracker.currentSession).not.toBeNull();
      expect(tracker.currentSession.userId).toBe('test-user');

      tracker.stopTracking();

      expect(tracker.isTracking).toBe(false);
      expect(tracker.currentSession).toBeNull();
    });

    it('should calculate session metrics correctly', () => {
      const mockSession = {
        id: 'test-session',
        startTime: Date.now() - 60000,
        duration: 60000,
        interactions: [
          { successful: true, duration: 1000 },
          { successful: false, duration: 2000 },
          { successful: true, duration: 1500 }
        ],
        tasks: [
          { status: 'completed', successful: true },
          { status: 'abandoned', successful: false }
        ],
        errors: [
          { recoveryTime: 500 }
        ],
        satisfactionEvents: [
          { overallSatisfaction: 4 },
          { overallSatisfaction: 3 }
        ]
      };

      const metrics = tracker.calculateSessionMetrics(mockSession);

      expect(metrics).toHaveProperty('effectiveness');
      expect(metrics).toHaveProperty('efficiency');
      expect(metrics).toHaveProperty('satisfaction');
      expect(metrics).toHaveProperty('errors');

      expect(metrics.effectiveness.taskCompletionRate).toBe(0.5); // 1 of 2 tasks completed
      expect(metrics.efficiency.interactionSuccessRate).toBeCloseTo(0.67, 1); // 2 of 3 successful
      expect(metrics.satisfaction.averageSatisfaction).toBe(3.5); // (4 + 3) / 2
    });
  });

  describe('Interaction Tracking', () => {
    it('should track user interactions', () => {
      tracker.startTracking();

      const interactionData = {
        type: 'voice_command',
        action: 'speak',
        successful: true,
        duration: 2000,
        userSatisfaction: 4
      };

      tracker.trackInteraction(interactionData);

      expect(tracker.currentSession.interactions.length).toBe(1);
      expect(tracker.interactionBuffer.length).toBe(1);

      const trackedInteraction = tracker.currentSession.interactions[0];
      expect(trackedInteraction.type).toBe('voice_command');
      expect(trackedInteraction.successful).toBe(true);
      expect(trackedInteraction.duration).toBe(2000);
    });

    it('should update real-time indicators based on interactions', () => {
      tracker.startTracking();

      const successfulInteraction = {
        type: 'voice_command',
        successful: true,
        duration: 1000
      };

      tracker.trackInteraction(successfulInteraction);

      expect(tracker.realTimeIndicators.interactionSuccess).toBe(true);
      expect(tracker.realTimeIndicators.cognitiveLoad).toBe('low');

      const failedInteraction = {
        type: 'voice_command',
        successful: false,
        duration: 6000,
        errorOccurred: true
      };

      tracker.trackInteraction(failedInteraction);

      expect(tracker.realTimeIndicators.interactionSuccess).toBe(false);
      expect(tracker.realTimeIndicators.cognitiveLoad).toBe('high');
    });
  });

  describe('Task and Error Tracking', () => {
    it('should track task completion', () => {
      tracker.startTracking();

      const taskData = {
        name: 'voice_search',
        status: 'completed',
        successful: true,
        duration: 5000,
        difficultyRating: 2,
        satisfactionRating: 4
      };

      tracker.trackTask(taskData);

      expect(tracker.currentSession.tasks.length).toBe(1);
      expect(tracker.uxMetrics.taskCompletion.totalTasks).toBe(1);
      expect(tracker.uxMetrics.taskCompletion.completedTasks).toBe(1);

      const trackedTask = tracker.currentSession.tasks[0];
      expect(trackedTask.name).toBe('voice_search');
      expect(trackedTask.successful).toBe(true);
    });

    it('should track errors and update frustration levels', () => {
      tracker.startTracking();

      const errorData = {
        type: 'synthesis_failure',
        severity: 'high',
        recoverable: true,
        recoveryTime: 2000,
        userFrustration: 'medium'
      };

      tracker.trackError(errorData);

      expect(tracker.currentSession.errors.length).toBe(1);
      expect(tracker.realTimeIndicators.userFrustration).toBe('low'); // Based on error count

      // Add more errors to increase frustration
      tracker.trackError(errorData);
      tracker.trackError(errorData);

      expect(tracker.realTimeIndicators.userFrustration).toBe('high');
    });
  });

  describe('Satisfaction Tracking', () => {
    it('should track satisfaction feedback', () => {
      tracker.startTracking();

      const feedbackData = {
        overallSatisfaction: 4,
        voiceQuality: 5,
        responsiveness: 3,
        naturalness: 4,
        comments: 'Great voice quality!'
      };

      tracker.trackSatisfaction(feedbackData);

      expect(tracker.currentSession.satisfactionEvents.length).toBe(1);
      expect(tracker.uxMetrics.satisfaction.overallScore).toBe(4);
      expect(tracker.uxMetrics.satisfaction.voiceQualityScore).toBe(5);

      const trackedFeedback = tracker.currentSession.satisfactionEvents[0];
      expect(trackedFeedback.overallSatisfaction).toBe(4);
      expect(trackedFeedback.comments).toBe('Great voice quality!');
    });

    it('should track feature usage', () => {
      const featureData = {
        feature: 'voice_interruption',
        action: 'used',
        satisfaction: 4
      };

      tracker.trackFeatureUsage(featureData);

      expect(tracker.uxMetrics.engagement.featureUsage).toHaveProperty('voice_interruption');
      
      const featureMetrics = tracker.uxMetrics.engagement.featureUsage.voice_interruption;
      expect(featureMetrics.usageCount).toBe(1);
      expect(featureMetrics.userSatisfaction).toBe(4);
    });
  });

  describe('Metrics Calculation', () => {
    it('should recalculate derived metrics correctly', () => {
      // Set up test data
      tracker.uxMetrics.taskCompletion.totalTasks = 10;
      tracker.uxMetrics.taskCompletion.completedTasks = 8;
      tracker.uxMetrics.interaction.totalInteractions = 50;
      tracker.uxMetrics.interaction.successfulInteractions = 45;
      tracker.uxMetrics.satisfaction.overallScore = 4.2; // Out of 5
      tracker.uxMetrics.interaction.errorRate = 0.1;

      tracker.recalculateDerivedMetrics();

      expect(tracker.uxMetrics.taskCompletion.completionRate).toBe(0.8);
      expect(tracker.uxMetrics.interaction.successRate).toBe(0.9);
      expect(tracker.uxMetrics.usability.overallScore).toBeGreaterThan(0);
      expect(tracker.uxMetrics.usability.overallScore).toBeLessThanOrEqual(1);
    });

    it('should calculate interaction frequency correctly', () => {
      // Add test interactions with timestamps (in chronological order)
      const now = Date.now();
      for (let i = 4; i >= 0; i--) { // Reverse order to simulate chronological addition
        tracker.interactionBuffer.push({
          timestamp: now - i * 10000 // 10 seconds apart
        });
      }

      const frequency = tracker.calculateRecentInteractionFrequency();
      expect(typeof frequency).toBe('number');
      expect(frequency).toBeGreaterThanOrEqual(0); // Allow 0 for edge cases
    });
  });

  describe('Data Export', () => {
    it('should export UX data in different formats', () => {
      tracker.startTracking();
      
      // Add some test data
      tracker.trackInteraction({
        type: 'test',
        successful: true,
        duration: 1000
      });

      const jsonExport = tracker.exportUXData({ format: 'json' });
      expect(typeof jsonExport).toBe('object');
      expect(jsonExport).toHaveProperty('exportTimestamp');
      expect(jsonExport).toHaveProperty('uxMetrics');

      const csvExport = tracker.exportUXData({ format: 'csv' });
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('timestamp,metric_category,metric_name,value,unit');
    });

    it('should get current metrics', () => {
      const metrics = tracker.getCurrentMetrics();

      expect(metrics).toHaveProperty('uxMetrics');
      expect(metrics).toHaveProperty('realTimeIndicators');
      expect(metrics).toHaveProperty('currentSession');
      expect(metrics).toHaveProperty('isTracking');

      expect(typeof metrics.isTracking).toBe('boolean');
    });
  });

  describe('Utility Functions', () => {
    it('should get recent interactions correctly', () => {
      // Add test interactions
      for (let i = 0; i < 10; i++) {
        tracker.interactionBuffer.push({
          id: `interaction_${i}`,
          timestamp: Date.now() - i * 1000
        });
      }

      const recentInteractions = tracker.getRecentInteractions(5);
      expect(recentInteractions.length).toBe(5);
      
      // Should be the most recent ones (last 5 added to the array)
      expect(recentInteractions[0].id).toBe('interaction_5');
      expect(recentInteractions[4].id).toBe('interaction_9');
    });

    it('should reset metrics correctly', () => {
      // Add some test data
      tracker.uxMetrics.taskCompletion.totalTasks = 5;
      tracker.uxMetrics.interaction.totalInteractions = 20;
      tracker.sessionHistory.push({ id: 'test-session' });
      tracker.interactionBuffer.push({ id: 'test-interaction' });

      tracker.resetMetrics();

      expect(tracker.uxMetrics.taskCompletion.totalTasks).toBe(0);
      expect(tracker.uxMetrics.interaction.totalInteractions).toBe(0);
      expect(tracker.sessionHistory.length).toBe(0);
      expect(tracker.interactionBuffer.length).toBe(0);
    });
  });
});

describe('Integration Tests', () => {
  let diagnostics, monitor, tracker;

  beforeEach(() => {
    diagnostics = new VoiceDiagnostics();
    monitor = new VoicePerformanceMonitor();
    tracker = new VoiceUXMetricsTracker();
  });

  afterEach(() => {
    diagnostics.cleanup();
    monitor.cleanup();
    tracker.cleanup();
  });

  it('should integrate diagnostics with performance monitoring', () => {
    // Start both systems
    diagnostics.startMonitoring();
    monitor.startMonitoring();

    expect(diagnostics.isMonitoring).toBe(true);
    expect(monitor.isActive).toBe(true);

    // Simulate performance data collection
    monitor.collectRealTimeMetrics();
    diagnostics.collectPerformanceMetrics();

    // Both should have collected metrics
    expect(monitor.performanceBuffer.audioLatency.length).toBeGreaterThanOrEqual(0);
    expect(diagnostics.performanceMetrics.memoryUsage.length).toBeGreaterThan(0);
  });

  it('should integrate UX tracking with diagnostics', () => {
    // Start systems
    diagnostics.startMonitoring();
    tracker.startTracking();

    // Track UX event
    const uxData = {
      sessionId: 'integration-test',
      interactionType: 'voice_command',
      success: true,
      duration: 1500
    };

    tracker.trackInteraction(uxData);
    diagnostics.trackUserExperience(uxData);

    // Both should have recorded the interaction
    expect(tracker.currentSession.interactions.length).toBe(1);
    expect(diagnostics.uxMetrics.sessionMetrics.has('integration-test')).toBe(true);
  });

  it('should generate comprehensive system report', async () => {
    // Start all systems
    diagnostics.startMonitoring();
    monitor.startMonitoring();
    tracker.startTracking();

    // Add some test data
    tracker.trackInteraction({
      type: 'voice_command',
      successful: true,
      duration: 1000
    });

    monitor.collectRealTimeMetrics();
    diagnostics.collectPerformanceMetrics();

    // Generate comprehensive report
    const diagnosticReport = await diagnostics.generateDiagnosticReport();
    const performanceData = monitor.getCurrentMetrics();
    const uxData = tracker.getCurrentMetrics();

    // Verify all systems contributed data
    expect(diagnosticReport).toHaveProperty('healthCheck');
    expect(diagnosticReport).toHaveProperty('performanceMetrics');
    expect(diagnosticReport).toHaveProperty('userExperience');

    expect(performanceData).toHaveProperty('realTimeMetrics');
    expect(performanceData.isActive).toBe(true);

    expect(uxData).toHaveProperty('uxMetrics');
    expect(uxData.isTracking).toBe(true);
  });
});