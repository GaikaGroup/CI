import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageConsistencyLogger } from '../../../src/lib/modules/chat/LanguageConsistencyLogger.js';

describe('LanguageConsistencyLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new LanguageConsistencyLogger();
    // Disable console logging for tests
    logger.updateConfig({ currentLogLevel: 4 }); // Above ERROR level
  });

  describe('Detection Logging', () => {
    it('should log detection results correctly', () => {
      const sessionId = 'test-session-1';
      const detectionResult = {
        language: 'en',
        confidence: 0.85,
        confidenceLevel: 'high',
        method: 'text_analysis',
        scores: { en: 0.85, es: 0.1, ru: 0.05 },
        confidenceFactors: [{ factor: 'english_keywords', weight: 0.7, confidence: 0.8 }]
      };
      const context = {
        messageLength: 50,
        hasImages: false,
        provider: 'openai'
      };

      logger.logDetection(sessionId, detectionResult, context);

      const stats = logger.getDetectionStats();
      expect(stats.totalDetections).toBe(1);
      expect(stats.languageDistribution.en).toBe(1);
      expect(stats.confidenceStats.average).toBeCloseTo(0.85);
    });

    it('should handle detection logging errors gracefully', () => {
      const sessionId = 'test-session-2';
      const invalidDetectionResult = null;

      // Should not throw
      expect(() => {
        logger.logDetection(sessionId, invalidDetectionResult);
      }).not.toThrow();
    });

    it('should update global metrics correctly', () => {
      const sessionId = 'test-session-3';
      const detectionResult = {
        language: 'ru',
        confidence: 0.92,
        confidenceLevel: 'veryHigh',
        method: 'enhanced_russian_analysis'
      };

      logger.logDetection(sessionId, detectionResult);

      const loggerStats = logger.getLoggerStats();
      expect(loggerStats.globalMetrics.totalDetections).toBe(1);
      expect(loggerStats.globalMetrics.languageDistribution.ru).toBe(1);
      expect(loggerStats.globalMetrics.confidenceDistribution.veryHigh).toBe(1);
    });
  });

  describe('Validation Logging', () => {
    it('should log validation results correctly', () => {
      const sessionId = 'test-session-4';
      const validationResult = {
        isConsistent: true,
        expectedLanguage: 'en',
        detectedLanguage: 'en',
        confidence: 0.88,
        confidenceGap: 0.02,
        severity: 'none',
        recommendation: 'accept'
      };
      const context = {
        responseLength: 200,
        provider: 'openai',
        model: 'gpt-4'
      };

      logger.logValidation(sessionId, validationResult, context);

      const stats = logger.getValidationStats();
      expect(stats.totalValidations).toBe(1);
      expect(stats.successRate).toBe(1);
      expect(stats.severityDistribution.none).toBe(1);
    });

    it('should log validation failures correctly', () => {
      const sessionId = 'test-session-5';
      const validationResult = {
        isConsistent: false,
        expectedLanguage: 'en',
        detectedLanguage: 'ru',
        confidence: 0.75,
        confidenceGap: 0.6,
        severity: 'high',
        recommendation: 'regenerate'
      };

      logger.logValidation(sessionId, validationResult);

      const stats = logger.getValidationStats();
      expect(stats.totalValidations).toBe(1);
      expect(stats.successRate).toBe(0);
      expect(stats.severityDistribution.high).toBe(1);
      expect(stats.recommendationDistribution.regenerate).toBe(1);
    });
  });

  describe('Consistency Issue Logging', () => {
    it('should log consistency issues correctly', () => {
      const sessionId = 'test-session-6';
      const issueType = 'validation_failure';
      const details = {
        expectedLanguage: 'en',
        detectedLanguage: 'zh',
        confidence: 0.9,
        severity: 'high',
        errorMessage: 'Language switched to Chinese unexpectedly'
      };
      const context = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        attemptNumber: 1
      };

      logger.logConsistencyIssue(sessionId, issueType, details, context);

      const loggerStats = logger.getLoggerStats();
      expect(loggerStats.globalMetrics.validationFailures).toBe(1);
      expect(loggerStats.globalMetrics.severityDistribution.high).toBe(1);
    });
  });

  describe('Session Metrics Logging', () => {
    it('should log session metrics correctly', () => {
      const sessionId = 'test-session-7';
      const sessionStats = {
        language: 'es',
        isStable: true,
        interactionCount: 5,
        sessionAge: 300000,
        confidence: {
          current: 0.85,
          average: 0.82,
          min: 0.75,
          max: 0.9
        },
        validation: {
          totalValidations: 4,
          validValidations: 4,
          successRate: 1.0
        },
        consistency: {
          languageConsistency: 1.0,
          uniqueLanguages: 1,
          detectedLanguages: ['es']
        }
      };

      logger.logSessionMetrics(sessionId, sessionStats);

      const sessionMetrics = logger.sessionMetrics.get(sessionId);
      expect(sessionMetrics).toBeDefined();
      expect(sessionMetrics.language).toBe('es');
      expect(sessionMetrics.isStable).toBe(true);
    });
  });

  describe('Statistics and Filtering', () => {
    beforeEach(() => {
      // Add some test data
      const testData = [
        {
          sessionId: 'session-1',
          detectionResult: { language: 'en', confidence: 0.9, method: 'text_analysis' },
          validationResult: { isConsistent: true, severity: 'none', recommendation: 'accept' }
        },
        {
          sessionId: 'session-2',
          detectionResult: { language: 'ru', confidence: 0.8, method: 'enhanced_russian_analysis' },
          validationResult: {
            isConsistent: false,
            severity: 'medium',
            recommendation: 'review_and_correct'
          }
        },
        {
          sessionId: 'session-3',
          detectionResult: { language: 'es', confidence: 0.75, method: 'text_analysis' },
          validationResult: { isConsistent: true, severity: 'none', recommendation: 'accept' }
        }
      ];

      testData.forEach(({ sessionId, detectionResult, validationResult }) => {
        logger.logDetection(sessionId, detectionResult);
        logger.logValidation(sessionId, validationResult);
      });
    });

    it('should calculate detection statistics correctly', () => {
      const stats = logger.getDetectionStats();

      expect(stats.totalDetections).toBe(3);
      expect(stats.languageDistribution.en).toBe(1);
      expect(stats.languageDistribution.ru).toBe(1);
      expect(stats.languageDistribution.es).toBe(1);
      expect(stats.confidenceStats.average).toBeCloseTo(0.817, 2);
    });

    it('should calculate validation statistics correctly', () => {
      const stats = logger.getValidationStats();

      expect(stats.totalValidations).toBe(3);
      expect(stats.successRate).toBeCloseTo(0.667, 2);
      expect(stats.severityDistribution.none).toBe(2);
      expect(stats.severityDistribution.medium).toBe(1);
    });

    it('should filter statistics by session ID', () => {
      const stats = logger.getDetectionStats({ sessionId: 'session-1' });

      expect(stats.totalDetections).toBe(1);
      expect(stats.languageDistribution.en).toBe(1);
      expect(stats.languageDistribution.ru).toBeUndefined();
    });

    it('should filter statistics by language', () => {
      const stats = logger.getDetectionStats({ language: 'ru' });

      expect(stats.totalDetections).toBe(1);
      expect(stats.languageDistribution.ru).toBe(1);
      expect(stats.languageDistribution.en).toBeUndefined();
    });
  });

  describe('Export and Clear Functionality', () => {
    beforeEach(() => {
      // Add test data
      logger.logDetection('session-1', {
        language: 'en',
        confidence: 0.9,
        method: 'text_analysis'
      });

      logger.logValidation('session-1', {
        isConsistent: true,
        expectedLanguage: 'en',
        detectedLanguage: 'en',
        severity: 'none',
        recommendation: 'accept'
      });
    });

    it('should export logs correctly', () => {
      const exportData = logger.exportLogs({ format: 'json', includeContext: false });

      expect(exportData).toBeDefined();
      expect(exportData.metadata.totalDetectionLogs).toBe(1);
      expect(exportData.metadata.totalValidationLogs).toBe(1);
      expect(exportData.detectionLogs).toHaveLength(1);
      expect(exportData.validationLogs).toHaveLength(1);
    });

    it('should clear logs correctly', () => {
      expect(logger.detectionLogs).toHaveLength(1);
      expect(logger.validationLogs).toHaveLength(1);

      logger.clearLogs();

      expect(logger.detectionLogs).toHaveLength(0);
      expect(logger.validationLogs).toHaveLength(0);
    });

    it('should clear logs by type', () => {
      logger.clearLogs({ type: 'detection' });

      expect(logger.detectionLogs).toHaveLength(0);
      expect(logger.validationLogs).toHaveLength(1);
    });
  });

  describe('Configuration and Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxLogEntries: 500,
        enableMetrics: false
      };

      logger.updateConfig(newConfig);

      expect(logger.config.maxLogEntries).toBe(500);
      expect(logger.config.enableMetrics).toBe(false);
    });

    it('should provide logger statistics', () => {
      const stats = logger.getLoggerStats();

      expect(stats).toHaveProperty('detectionLogsCount');
      expect(stats).toHaveProperty('validationLogsCount');
      expect(stats).toHaveProperty('sessionMetricsCount');
      expect(stats).toHaveProperty('globalMetrics');
      expect(stats).toHaveProperty('config');
    });

    it('should get comprehensive language consistency metrics', () => {
      // Add some test data first
      logger.logDetection('session-1', {
        language: 'en',
        confidence: 0.9,
        method: 'text_analysis'
      });

      const metrics = logger.getLanguageConsistencyMetrics();

      expect(metrics).toHaveProperty('detection');
      expect(metrics).toHaveProperty('validation');
      expect(metrics).toHaveProperty('sessions');
      expect(metrics).toHaveProperty('global');
      expect(metrics).toHaveProperty('summary');
      expect(metrics.summary).toHaveProperty('totalSessions');
      expect(metrics.summary).toHaveProperty('overallValidationSuccessRate');
    });
  });
});
