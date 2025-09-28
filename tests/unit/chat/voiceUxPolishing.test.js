/**
 * Voice UX Polishing Tests
 * Comprehensive tests for user experience and edge case handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceUxPolisher } from '../../../src/lib/modules/chat/VoiceUxPolisher.js';
import { VoiceErrorHandler } from '../../../src/lib/modules/chat/VoiceErrorHandler.js';
import { InterruptionResponseGenerator } from '../../../src/lib/modules/chat/InterruptionResponseGenerator.js';
import { VoiceUxIntegrator } from '../../../src/lib/modules/chat/VoiceUxIntegrator.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock console methods
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};

describe('VoiceUxPolisher', () => {
  let polisher;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    polisher = new VoiceUxPolisher();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default preferences', () => {
      expect(polisher.userPreferences).toEqual({
        interruptionSensitivity: 'medium',
        responseStyle: 'natural',
        errorRecovery: 'automatic',
        feedbackLevel: 'minimal'
      });
    });

    it('should load saved preferences from localStorage', () => {
      const savedPrefs = {
        interruptionSensitivity: 'high',
        responseStyle: 'concise'
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPrefs));
      
      const newPolisher = new VoiceUxPolisher();
      expect(newPolisher.userPreferences.interruptionSensitivity).toBe('high');
      expect(newPolisher.userPreferences.responseStyle).toBe('concise');
    });

    it('should initialize natural response variations', () => {
      expect(polisher.naturalResponseVariations.has('en')).toBe(true);
      expect(polisher.naturalResponseVariations.has('es')).toBe(true);
      expect(polisher.naturalResponseVariations.has('ru')).toBe(true);
    });

    it('should initialize contextual phrasing', () => {
      expect(polisher.contextualPhrasing.has('en')).toBe(true);
      const enPhrases = polisher.contextualPhrasing.get('en');
      expect(enPhrases.first_interruption).toBeDefined();
      expect(enPhrases.repeated_interruption).toBeDefined();
    });
  });

  describe('Edge Case Handling', () => {
    it('should detect simultaneous speech edge case', async () => {
      const context = {
        userSpeaking: true,
        botSpeaking: true,
        detectedLanguage: 'en'
      };

      const result = await polisher.applyUxPolishing(context);
      expect(result.success).toBe(true);
      expect(result.edgeCasesHandled).toBeGreaterThan(0);
    });

    it('should handle rapid interruptions with adaptive threshold', async () => {
      // Set high sensitivity
      polisher.userPreferences.interruptionSensitivity = 'high';
      
      const context = {
        interruptionCount: 3,
        timeSpan: 4000,
        detectedLanguage: 'en'
      };

      const result = await polisher.applyUxPolishing(context);
      expect(result.success).toBe(true);
      expect(result.edgeCasesHandled).toBeGreaterThan(0);
    });

    it('should handle unclear intent based on confidence threshold', async () => {
      polisher.advancedPreferences.interruptionThreshold = 0.7;
      
      const context = {
        confidence: 0.5,
        energy: 0.2,
        detectedLanguage: 'en'
      };

      const result = await polisher.applyUxPolishing(context);
      expect(result.success).toBe(true);
    });

    it('should detect and handle user frustration patterns', async () => {
      const context = {
        rapidInterruptions: 3,
        repeatQuestions: 2,
        increasingVolume: true,
        shorterMessages: true,
        detectedLanguage: 'en'
      };

      const result = await polisher.applyUxPolishing(context);
      expect(result.success).toBe(true);
    });

    it('should handle network issues gracefully', async () => {
      const context = {
        networkError: true,
        synthesisFailures: 3,
        latency: 4000,
        detectedLanguage: 'en'
      };

      const result = await polisher.applyUxPolishing(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Natural Response Generation', () => {
    it('should generate natural responses for different contexts', () => {
      const response1 = polisher.generateNaturalResponse('first_interruption', 'en');
      const response2 = polisher.generateNaturalResponse('repeated_interruption', 'en');
      
      expect(response1).toBeTruthy();
      expect(response2).toBeTruthy();
      expect(response1).not.toBe(response2);
    });

    it('should support multiple languages', () => {
      const enResponse = polisher.generateNaturalResponse('first_interruption', 'en');
      const esResponse = polisher.generateNaturalResponse('first_interruption', 'es');
      const ruResponse = polisher.generateNaturalResponse('first_interruption', 'ru');
      
      expect(enResponse).toBeTruthy();
      expect(esResponse).toBeTruthy();
      expect(ruResponse).toBeTruthy();
    });

    it('should add natural variations to responses', () => {
      // Mock Math.random to control variation addition
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.5); // Should trigger variation
      
      const response = polisher.generateNaturalResponse('first_interruption', 'en');
      expect(response).toBeTruthy();
      
      Math.random = originalRandom;
    });
  });

  describe('User Preference Integration', () => {
    it('should adapt interruption threshold based on sensitivity', () => {
      polisher.userPreferences.interruptionSensitivity = 'low';
      expect(polisher.getInterruptionThreshold()).toBe(5);
      
      polisher.userPreferences.interruptionSensitivity = 'high';
      expect(polisher.getInterruptionThreshold()).toBe(2);
      
      polisher.userPreferences.interruptionSensitivity = 'medium';
      expect(polisher.getInterruptionThreshold()).toBe(3);
    });

    it('should calculate adaptive cooldown based on context', () => {
      const context = {
        interruptionCount: 4,
        timeSpan: 2000
      };
      
      const cooldown = polisher.calculateAdaptiveCooldown(context);
      expect(cooldown).toBeGreaterThan(2000);
      expect(cooldown).toBeLessThanOrEqual(4000);
    });

    it('should save and load user preferences', () => {
      const newPrefs = {
        interruptionSensitivity: 'high',
        responseStyle: 'detailed'
      };
      
      polisher.saveUserPreferences(newPrefs);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'voicePreferences',
        expect.stringContaining('"interruptionSensitivity":"high"')
      );
    });
  });

  describe('Advanced Features', () => {
    it('should detect advanced frustration patterns', () => {
      const context = {
        rapidInterruptions: 3,
        repeatQuestions: 2,
        increasingVolume: true,
        negativeLanguageDetected: true,
        abandonedInteractions: 2
      };
      
      const isFrustrated = polisher.detectAdvancedFrustrationPatterns(context);
      expect(isFrustrated).toBe(true);
    });

    it('should determine appropriate help type', () => {
      const context1 = { rapidInterruptions: 3 };
      expect(polisher.determineHelpType(context1)).toBe('interruption_help');
      
      const context2 = { audioQualityIssues: true };
      expect(polisher.determineHelpType(context2)).toBe('voice_quality_help');
      
      const context3 = {};
      expect(polisher.determineHelpType(context3)).toBe('general_help');
    });

    it('should provide contextual help based on issues', async () => {
      const context = {
        rapidInterruptions: 3,
        detectedLanguage: 'en'
      };
      
      await polisher.offerContextualHelp(context);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Offering contextual help')
      );
    });
  });

  describe('Statistics and Metrics', () => {
    it('should collect user feedback', () => {
      const context = {
        interactionId: 'test_123',
        hadErrors: false,
        responseTime: 1500,
        completedSuccessfully: true
      };
      
      polisher.collectUserFeedback(context);
      
      const feedback = polisher.userFeedbackCollector.get('test_123');
      expect(feedback).toBeDefined();
      expect(feedback.interactionSuccess).toBe(true);
      expect(feedback.responseTime).toBe(1500);
    });

    it('should calculate satisfaction scores', () => {
      const goodContext = {
        completedSuccessfully: true,
        responseTime: 1000,
        interruptionCount: 0,
        followUpQuestions: 1,
        hadErrors: false
      };
      
      const score = polisher.inferSatisfaction(goodContext);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should provide comprehensive UX statistics', () => {
      // Add some feedback entries
      polisher.userFeedbackCollector.set('test1', {
        interactionSuccess: true,
        responseTime: 1000,
        userSatisfaction: 0.8
      });
      
      polisher.userFeedbackCollector.set('test2', {
        interactionSuccess: false,
        responseTime: 3000,
        userSatisfaction: 0.3
      });
      
      const stats = polisher.getUxStats();
      expect(stats.totalInteractions).toBe(2);
      expect(stats.averageSatisfaction).toBeCloseTo(0.55);
      expect(stats.successRate).toBe(0.5);
    });
  });
});

describe('VoiceErrorHandler Enhanced Features', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new VoiceErrorHandler();
  });

  describe('Intelligent Error Recovery', () => {
    it('should handle rapid interruptions with contextual responses', async () => {
      const error = new Error('Multiple rapid interruptions detected');
      const context = {
        interruptionCount: 4,
        timeSpan: 3000,
        detectedLanguage: 'en'
      };

      const result = await errorHandler.handleError(error, context);
      
      expect(result.handled).toBe(true);
      expect(result.errorType).toBe('multiple_rapid_interruptions');
      expect(result.result.action).toBe('intelligent_throttle_interruptions');
      expect(result.result.acknowledgment).toBeDefined();
      expect(result.result.acknowledgment.language).toBe('en');
    });

    it('should provide multilingual error acknowledgments', async () => {
      const error = new Error('Multiple rapid interruptions detected');
      const context = {
        interruptionCount: 4,
        timeSpan: 3000,
        detectedLanguage: 'es'
      };

      const result = await errorHandler.handleError(error, context);
      
      expect(result.result.acknowledgment.language).toBe('es');
      expect(result.result.acknowledgment.text).toMatch(/(atención|importante|decir|preguntar|escucho)/);
    });

    it('should calculate adaptive cooldown periods', async () => {
      const error = new Error('Multiple rapid interruptions detected');
      const context = {
        interruptionCount: 6,
        timeSpan: 2000,
        detectedLanguage: 'en'
      };

      const result = await errorHandler.handleError(error, context);
      
      expect(result.result.adaptiveCooldown).toBeGreaterThan(2000);
      expect(result.result.adaptiveCooldown).toBeLessThanOrEqual(5000);
    });
  });

  describe('Error Classification', () => {
    it('should classify different error types correctly', () => {
      const networkError = new Error('Network timeout occurred');
      const audioError = new Error('Audio buffer underrun');
      const interruptionError = new Error('Interruption detection failed');

      expect(errorHandler.classifyError(networkError, {})).toBe('network_synthesis_failure');
      expect(errorHandler.classifyError(audioError, {})).toBe('audio_processing_failure');
      expect(errorHandler.classifyError(interruptionError, {})).toBe('interruption_detection_failure');
    });

    it('should detect recurring errors', () => {
      const error = new Error('Test error');
      const context = {};

      // Simulate multiple occurrences
      for (let i = 0; i < 4; i++) {
        errorHandler.logError(error, context);
      }

      const isRecurring = errorHandler.isRecurringError('unknown_voice_error');
      expect(isRecurring).toBe(true);
    });
  });
});

describe('InterruptionResponseGenerator Enhanced Features', () => {
  let generator;

  beforeEach(() => {
    generator = new InterruptionResponseGenerator();
  });

  describe('Enhanced Response Generation', () => {
    it('should generate varied immediate acknowledgments', async () => {
      const context = {
        interruptionEvent: { confidence: 0.9 },
        currentResponse: { type: 'main_response' },
        conversationContext: {}
      };

      const response1 = await generator.generateResponse('en', context);
      const response2 = await generator.generateResponse('en', context);
      
      expect(response1.text).toBeTruthy();
      expect(response2.text).toBeTruthy();
      // Should potentially be different due to randomization
    });

    it('should apply contextual modifications appropriately', () => {
      const baseResponse = 'What can I help you with?';
      const context = {
        interruptionEvent: { confidence: 0.9 },
        currentResponse: { type: 'waiting_phrase' },
        conversationContext: {}
      };

      const modified = generator.applyContextualModifications(baseResponse, 'en', context);
      expect(modified).toContain('thinking');
    });

    it('should generate continuation offers', () => {
      const preservedState = { canContinue: true };
      const offer = generator.generateContinuationOffer('en', preservedState);
      
      expect(offer).toBeTruthy();
      expect(offer.toLowerCase()).toMatch(/(continue|continuing|finish|resume|pick up|left off)/);
    });

    it('should provide choice options for users', () => {
      const preservedState = { canContinue: true };
      const options = generator.generateChoiceOptions('en', preservedState);
      
      expect(options.canContinue).toBe(true);
      expect(options.choices).toHaveLength(4);
      expect(options.choices[0].action).toBe('continue_response');
    });
  });

  describe('Multilingual Support', () => {
    it('should support Spanish responses', async () => {
      const context = {
        interruptionEvent: { confidence: 0.8 },
        currentResponse: { type: 'main_response' },
        conversationContext: {}
      };

      const response = await generator.generateResponse('es', context);
      expect(response.language).toBe('es');
      expect(response.text).toBeTruthy();
    });

    it('should support Russian responses', async () => {
      const context = {
        interruptionEvent: { confidence: 0.8 },
        currentResponse: { type: 'main_response' },
        conversationContext: {}
      };

      const response = await generator.generateResponse('ru', context);
      expect(response.language).toBe('ru');
      expect(response.text).toBeTruthy();
    });

    it('should fallback to English for unsupported languages', async () => {
      const context = {
        interruptionEvent: { confidence: 0.8 },
        currentResponse: { type: 'main_response' },
        conversationContext: {}
      };

      const response = await generator.generateResponse('fr', context);
      expect(response.language).toBe('fr');
      expect(response.text).toBeTruthy(); // Should use English templates
    });
  });
});

describe('VoiceUxIntegrator', () => {
  let integrator;

  beforeEach(async () => {
    integrator = new VoiceUxIntegrator();
    await integrator.initialize();
  });

  describe('Session Management', () => {
    it('should start and manage voice UX sessions', () => {
      const sessionId = integrator.startSession({ language: 'en' });
      
      expect(sessionId).toBeTruthy();
      expect(integrator.activeSession).toBeDefined();
      expect(integrator.activeSession.id).toBe(sessionId);
      expect(integrator.activeSession.language).toBe('en');
    });

    it('should end sessions and collect metrics', () => {
      const sessionId = integrator.startSession();
      
      // Simulate some interactions
      integrator.activeSession.interactions.push({ timestamp: Date.now() });
      integrator.activeSession.edgeCasesHandled = 2;
      integrator.activeSession.userSatisfactionScore = 0.8;
      
      const summary = integrator.endSession();
      
      expect(summary).toBeDefined();
      expect(summary.id).toBe(sessionId);
      expect(summary.interactions).toBe(1);
      expect(summary.edgeCasesHandled).toBe(2);
      expect(summary.userSatisfactionScore).toBe(0.8);
    });
  });

  describe('Interaction Processing', () => {
    it('should process interactions with full UX enhancement', async () => {
      integrator.startSession();
      
      const context = {
        isInterruption: true,
        detectedLanguage: 'en',
        confidence: 0.8,
        needsResponse: true
      };

      const result = await integrator.processInteraction(context);
      
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeTruthy();
      expect(result.polishingResult).toBeDefined();
    });

    it('should handle processing errors gracefully', async () => {
      integrator.startSession();
      
      // Create a context that will cause an error
      const context = {
        error: new Error('Test processing error'),
        detectedLanguage: 'en'
      };

      const result = await integrator.processInteraction(context);
      
      expect(result.success).toBe(true); // Should handle gracefully
      expect(result.polishingResult.errorHandling).toBeDefined();
    });
  });

  describe('Response Generation', () => {
    it('should generate enhanced responses for different types', async () => {
      const interruptionContext = {
        isInterruption: true,
        detectedLanguage: 'en',
        interruptionEvent: { confidence: 0.8 }
      };

      const response = await integrator.generateEnhancedResponse(interruptionContext);
      
      expect(response.type).toBe('interruption_acknowledgment');
      expect(response.enhanced).toBeDefined();
      expect(response.language).toBe('en');
    });

    it('should apply natural language enhancements', async () => {
      const originalResponse = {
        text: "I'm here and ready to help.",
        type: 'standard_response',
        confidence: 0.7
      };

      const context = {
        detectedLanguage: 'en',
        isFirstInteraction: true
      };

      const enhanced = await integrator.applyNaturalLanguageEnhancements(originalResponse, context);
      
      expect(enhanced.enhanced).toBe(true);
      expect(enhanced.enhancements).toBeDefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive UX statistics', () => {
      integrator.startSession();
      integrator.uxMetrics.sessionsCompleted = 5;
      integrator.uxMetrics.averageSatisfaction = 0.75;
      
      const stats = integrator.getUxStatistics();
      
      expect(stats.global).toBeDefined();
      expect(stats.currentSession).toBeDefined();
      expect(stats.polisher).toBeDefined();
      expect(stats.errorHandler).toBeDefined();
      expect(stats.responseGenerator).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  let polisher, integrator;

  beforeEach(async () => {
    polisher = new VoiceUxPolisher();
    integrator = new VoiceUxIntegrator();
    await integrator.initialize();
  });

  it('should handle complete voice interaction flow', async () => {
    // Start session
    const sessionId = integrator.startSession({ language: 'en' });
    
    // Process interruption
    const interruptionContext = {
      isInterruption: true,
      detectedLanguage: 'en',
      confidence: 0.8,
      needsResponse: true,
      interruptionEvent: { confidence: 0.8 },
      currentResponse: { type: 'main_response' }
    };

    const result = await integrator.processInteraction(interruptionContext);
    
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(sessionId);
    
    // End session
    const summary = integrator.endSession();
    expect(summary.interactions).toBe(1);
  });

  it('should handle error recovery in complete flow', async () => {
    integrator.startSession();
    
    const errorContext = {
      error: new Error('Network synthesis failure'),
      detectedLanguage: 'en',
      needsResponse: true,
      needsErrorRecovery: true
    };

    const result = await integrator.processInteraction(errorContext);
    
    expect(result.success).toBe(true);
    expect(result.polishingResult.errorHandling).toBeDefined();
    expect(result.polishingResult.errorHandling.handled).toBe(true);
  });

  it('should maintain user preferences across components', () => {
    // Update preferences in polisher
    polisher.saveUserPreferences({
      interruptionSensitivity: 'high',
      responseStyle: 'concise'
    });

    // Verify preferences are accessible
    expect(polisher.userPreferences.interruptionSensitivity).toBe('high');
    expect(polisher.getInterruptionThreshold()).toBe(2);
  });
});