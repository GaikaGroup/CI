/**
 * Voice UX Metrics Tracker
 * Comprehensive user experience metrics tracking for voice interactions
 */

import { get } from 'svelte/store';
import { isVoiceModeActive, isSpeaking } from './voice/index.js';
import { selectedLanguage } from '$modules/i18n/stores';
import { voiceDiagnostics } from './VoiceDiagnostics.js';

export class VoiceUXMetricsTracker {
  constructor() {
    this.trackerId = `ux_tracker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.isTracking = false;

    // Session tracking
    this.currentSession = null;
    this.sessionHistory = [];
    this.maxSessionHistory = 50;

    // Interaction tracking
    this.interactionBuffer = [];
    this.maxInteractionBuffer = 1000;

    // UX metrics configuration
    this.metricsConfig = {
      trackingInterval: 5000, // 5 seconds
      sessionTimeout: 300000, // 5 minutes of inactivity
      satisfactionSurveyInterval: 600000, // 10 minutes
      usabilityMetrics: {
        taskCompletionRate: true,
        errorRecoveryTime: true,
        learnabilityScore: true,
        accessibilityCompliance: true
      }
    };

    // UX metrics storage
    this.uxMetrics = {
      // Effectiveness metrics
      taskCompletion: {
        totalTasks: 0,
        completedTasks: 0,
        abandonedTasks: 0,
        averageCompletionTime: 0
      },

      // Efficiency metrics
      interaction: {
        totalInteractions: 0,
        successfulInteractions: 0,
        averageInteractionTime: 0,
        errorRate: 0,
        recoveryTime: 0
      },

      // Satisfaction metrics
      satisfaction: {
        overallScore: 0,
        voiceQualityScore: 0,
        responsivenessScore: 0,
        naturalness: 0,
        userFeedback: []
      },

      // Usability metrics
      usability: {
        learnabilityScore: 0,
        memorabilityScore: 0,
        errorPreventionScore: 0,
        accessibilityScore: 0,
        cognitiveLoadScore: 0
      },

      // Engagement metrics
      engagement: {
        sessionDuration: 0,
        interactionFrequency: 0,
        featureUsage: {},
        returnUserRate: 0,
        dropOffPoints: []
      }
    };

    // Real-time UX indicators
    this.realTimeIndicators = {
      currentSatisfaction: 0,
      interactionSuccess: true,
      cognitiveLoad: 'low',
      userFrustration: 'none',
      engagementLevel: 'medium'
    };

    // Event listeners for UX tracking
    this.eventListeners = new Map();

    console.log('VoiceUXMetricsTracker initialized:', this.trackerId);
  }

  /**
   * Start UX metrics tracking
   * @param {Object} options - Tracking options
   */
  startTracking(options = {}) {
    if (this.isTracking) {
      console.warn('UX metrics tracking already active');
      return;
    }

    const { sessionId = null, userId = 'anonymous', trackingLevel = 'comprehensive' } = options;

    this.isTracking = true;

    // Start new session
    this.startSession({
      sessionId: sessionId,
      userId: userId,
      trackingLevel: trackingLevel
    });

    // Set up event listeners
    this.setupEventListeners();

    // Start periodic UX assessment
    this.startPeriodicAssessment();

    console.log('UX metrics tracking started for session:', this.currentSession?.id);
  }

  /**
   * Stop UX metrics tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      return;
    }

    this.isTracking = false;

    // End current session
    if (this.currentSession) {
      this.endSession();
    }

    // Remove event listeners
    this.removeEventListeners();

    // Stop periodic assessment
    this.stopPeriodicAssessment();

    console.log('UX metrics tracking stopped');
  }

  /**
   * Start new UX tracking session
   * @param {Object} sessionData - Session data
   */
  startSession(sessionData) {
    const sessionId =
      sessionData.sessionId ||
      `ux_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentSession = {
      id: sessionId,
      userId: sessionData.userId || 'anonymous',
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      trackingLevel: sessionData.trackingLevel || 'comprehensive',

      // Session-specific metrics
      interactions: [],
      tasks: [],
      errors: [],
      satisfactionEvents: [],

      // Session context
      context: {
        language: get(selectedLanguage),
        userAgent: navigator.userAgent,
        voiceMode: get(isVoiceModeActive),
        initialState: {
          isVoiceModeActive: get(isVoiceModeActive),
          isSpeaking: get(isSpeaking)
        }
      }
    };

    // Track session start
    this.trackEvent('session_started', {
      sessionId: sessionId,
      context: this.currentSession.context
    });

    console.log('UX session started:', sessionId);
  }

  /**
   * End current UX tracking session
   */
  endSession() {
    if (!this.currentSession) {
      return;
    }

    const endTime = Date.now();
    const duration = endTime - this.currentSession.startTime;

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;

    // Calculate session metrics
    const sessionMetrics = this.calculateSessionMetrics(this.currentSession);

    // Track session end
    this.trackEvent('session_ended', {
      sessionId: this.currentSession.id,
      duration: duration,
      metrics: sessionMetrics
    });

    // Add to session history
    this.sessionHistory.push({
      ...this.currentSession,
      metrics: sessionMetrics
    });

    // Maintain session history size
    if (this.sessionHistory.length > this.maxSessionHistory) {
      this.sessionHistory.shift();
    }

    // Update aggregated metrics
    this.updateAggregatedMetrics(sessionMetrics);

    console.log('UX session ended:', this.currentSession.id, 'Duration:', duration);

    this.currentSession = null;
  }

  /**
   * Track user interaction
   * @param {Object} interactionData - Interaction data
   */
  trackInteraction(interactionData) {
    if (!this.isTracking || !this.currentSession) {
      return;
    }

    const interaction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSession.id,
      timestamp: Date.now(),
      type: interactionData.type || 'unknown',

      // Interaction details
      action: interactionData.action || 'unknown',
      target: interactionData.target || null,
      input: interactionData.input || null,
      output: interactionData.output || null,

      // Performance metrics
      startTime: interactionData.startTime || Date.now(),
      endTime: interactionData.endTime || Date.now(),
      duration: interactionData.duration || 0,

      // Success metrics
      successful: interactionData.successful !== false,
      errorOccurred: interactionData.errorOccurred || false,
      errorType: interactionData.errorType || null,
      recoveryTime: interactionData.recoveryTime || 0,

      // User experience metrics
      userSatisfaction: interactionData.userSatisfaction || null,
      cognitiveLoad: interactionData.cognitiveLoad || 'medium',
      frustrationLevel: interactionData.frustrationLevel || 'none',

      // Context
      context: {
        voiceMode: get(isVoiceModeActive),
        speaking: get(isSpeaking),
        language: get(selectedLanguage),
        ...interactionData.context
      }
    };

    // Add to current session
    this.currentSession.interactions.push(interaction);

    // Add to interaction buffer
    this.interactionBuffer.push(interaction);

    // Maintain buffer size
    if (this.interactionBuffer.length > this.maxInteractionBuffer) {
      this.interactionBuffer.shift();
    }

    // Update real-time indicators
    this.updateRealTimeIndicators(interaction);

    // Track with diagnostics system
    voiceDiagnostics.trackUserExperience({
      sessionId: this.currentSession.id,
      interactionType: interaction.type,
      success: interaction.successful,
      duration: interaction.duration,
      userSatisfaction: interaction.userSatisfaction,
      errorEncountered: interaction.errorOccurred
    });

    console.log(
      'Interaction tracked:',
      interaction.type,
      interaction.successful ? 'success' : 'failure'
    );
  }

  /**
   * Track task completion
   * @param {Object} taskData - Task data
   */
  trackTask(taskData) {
    if (!this.isTracking || !this.currentSession) {
      return;
    }

    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSession.id,
      timestamp: Date.now(),

      // Task details
      name: taskData.name || 'unnamed_task',
      description: taskData.description || '',
      category: taskData.category || 'general',

      // Completion metrics
      status: taskData.status || 'completed', // 'completed', 'abandoned', 'failed'
      startTime: taskData.startTime || Date.now(),
      endTime: taskData.endTime || Date.now(),
      duration: taskData.duration || 0,

      // Success metrics
      successful: taskData.successful !== false,
      completionRate: taskData.completionRate || (taskData.successful ? 1 : 0),
      errorCount: taskData.errorCount || 0,
      helpRequested: taskData.helpRequested || false,

      // User experience
      difficultyRating: taskData.difficultyRating || null,
      satisfactionRating: taskData.satisfactionRating || null,

      // Context
      context: {
        interactions: this.currentSession.interactions.length,
        ...taskData.context
      }
    };

    // Add to current session
    this.currentSession.tasks.push(task);

    // Update task completion metrics
    this.updateTaskMetrics(task);

    console.log('Task tracked:', task.name, task.status);
  }

  /**
   * Track error occurrence
   * @param {Object} errorData - Error data
   */
  trackError(errorData) {
    if (!this.isTracking || !this.currentSession) {
      return;
    }

    const error = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSession.id,
      timestamp: Date.now(),

      // Error details
      type: errorData.type || 'unknown',
      category: errorData.category || 'system',
      severity: errorData.severity || 'medium',
      message: errorData.message || '',

      // Recovery metrics
      recoverable: errorData.recoverable !== false,
      recoveryTime: errorData.recoveryTime || 0,
      recoveryMethod: errorData.recoveryMethod || null,
      userAssistanceRequired: errorData.userAssistanceRequired || false,

      // Impact metrics
      taskImpact: errorData.taskImpact || 'none', // 'none', 'delayed', 'failed', 'abandoned'
      userFrustration: errorData.userFrustration || 'low',

      // Context
      context: {
        currentTask: this.getCurrentTask(),
        recentInteractions: this.getRecentInteractions(3),
        ...errorData.context
      }
    };

    // Add to current session
    this.currentSession.errors.push(error);

    // Update error metrics
    this.updateErrorMetrics(error);

    // Update real-time frustration indicator
    this.updateFrustrationLevel(error);

    console.log('Error tracked:', error.type, error.severity);
  }

  /**
   * Track satisfaction feedback
   * @param {Object} feedbackData - Feedback data
   */
  trackSatisfaction(feedbackData) {
    if (!this.isTracking || !this.currentSession) {
      return;
    }

    const feedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSession.id,
      timestamp: Date.now(),

      // Satisfaction ratings
      overallSatisfaction: feedbackData.overallSatisfaction || null,
      voiceQuality: feedbackData.voiceQuality || null,
      responsiveness: feedbackData.responsiveness || null,
      naturalness: feedbackData.naturalness || null,
      easeOfUse: feedbackData.easeOfUse || null,

      // Qualitative feedback
      comments: feedbackData.comments || '',
      suggestions: feedbackData.suggestions || '',

      // Context
      context: {
        triggerEvent: feedbackData.triggerEvent || 'manual',
        sessionDuration: Date.now() - this.currentSession.startTime,
        interactionCount: this.currentSession.interactions.length
      }
    };

    // Add to current session
    this.currentSession.satisfactionEvents.push(feedback);

    // Update satisfaction metrics
    this.updateSatisfactionMetrics(feedback);

    console.log('Satisfaction feedback tracked:', feedback.overallSatisfaction);
  }

  /**
   * Track feature usage
   * @param {Object} featureData - Feature usage data
   */
  trackFeatureUsage(featureData) {
    const feature = featureData.feature || 'unknown';
    const action = featureData.action || 'used';

    // Update feature usage metrics
    if (!this.uxMetrics.engagement.featureUsage[feature]) {
      this.uxMetrics.engagement.featureUsage[feature] = {
        usageCount: 0,
        lastUsed: null,
        averageSessionUsage: 0,
        userSatisfaction: 0
      };
    }

    const featureMetrics = this.uxMetrics.engagement.featureUsage[feature];
    featureMetrics.usageCount++;
    featureMetrics.lastUsed = Date.now();

    if (featureData.satisfaction) {
      if (featureMetrics.userSatisfaction === 0) {
        featureMetrics.userSatisfaction = featureData.satisfaction;
      } else {
        featureMetrics.userSatisfaction =
          (featureMetrics.userSatisfaction + featureData.satisfaction) / 2;
      }
    }

    console.log('Feature usage tracked:', feature, action);
  }

  /**
   * Calculate session metrics
   * @param {Object} session - Session data
   * @returns {Object} Session metrics
   */
  calculateSessionMetrics(session) {
    const interactions = session.interactions || [];
    const tasks = session.tasks || [];
    const errors = session.errors || [];

    // Effectiveness metrics
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const taskCompletionRate = tasks.length > 0 ? completedTasks / tasks.length : 0;

    // Efficiency metrics
    const successfulInteractions = interactions.filter((i) => i.successful).length;
    const interactionSuccessRate =
      interactions.length > 0 ? successfulInteractions / interactions.length : 0;
    const averageInteractionTime =
      interactions.length > 0
        ? interactions.reduce((sum, i) => sum + i.duration, 0) / interactions.length
        : 0;

    // Error metrics
    const errorRate = interactions.length > 0 ? errors.length / interactions.length : 0;
    const averageRecoveryTime =
      errors.length > 0 ? errors.reduce((sum, e) => sum + e.recoveryTime, 0) / errors.length : 0;

    // Satisfaction metrics
    const satisfactionEvents = session.satisfactionEvents || [];
    const averageSatisfaction =
      satisfactionEvents.length > 0
        ? satisfactionEvents.reduce((sum, s) => sum + (s.overallSatisfaction || 0), 0) /
          satisfactionEvents.length
        : 0;

    return {
      effectiveness: {
        taskCompletionRate: taskCompletionRate,
        completedTasks: completedTasks,
        totalTasks: tasks.length
      },
      efficiency: {
        interactionSuccessRate: interactionSuccessRate,
        averageInteractionTime: averageInteractionTime,
        totalInteractions: interactions.length
      },
      satisfaction: {
        averageSatisfaction: averageSatisfaction,
        feedbackCount: satisfactionEvents.length
      },
      errors: {
        errorRate: errorRate,
        totalErrors: errors.length,
        averageRecoveryTime: averageRecoveryTime
      },
      engagement: {
        sessionDuration: session.duration,
        interactionFrequency: interactions.length / (session.duration / 60000) // per minute
      }
    };
  }

  /**
   * Update aggregated UX metrics
   * @param {Object} sessionMetrics - Session metrics
   */
  updateAggregatedMetrics(sessionMetrics) {
    // Update task completion metrics
    this.uxMetrics.taskCompletion.totalTasks += sessionMetrics.effectiveness.totalTasks;
    this.uxMetrics.taskCompletion.completedTasks += sessionMetrics.effectiveness.completedTasks;

    // Update interaction metrics
    this.uxMetrics.interaction.totalInteractions += sessionMetrics.efficiency.totalInteractions;
    this.uxMetrics.interaction.successfulInteractions += Math.round(
      sessionMetrics.efficiency.totalInteractions * sessionMetrics.efficiency.interactionSuccessRate
    );

    // Update satisfaction metrics
    if (sessionMetrics.satisfaction.averageSatisfaction > 0) {
      this.uxMetrics.satisfaction.overallScore =
        (this.uxMetrics.satisfaction.overallScore +
          sessionMetrics.satisfaction.averageSatisfaction) /
        2;
    }

    // Update error metrics
    this.uxMetrics.interaction.errorRate =
      (this.uxMetrics.interaction.errorRate + sessionMetrics.errors.errorRate) / 2;

    // Recalculate derived metrics
    this.recalculateDerivedMetrics();
  }

  /**
   * Recalculate derived UX metrics
   */
  recalculateDerivedMetrics() {
    // Task completion rate
    if (this.uxMetrics.taskCompletion.totalTasks > 0) {
      this.uxMetrics.taskCompletion.completionRate =
        this.uxMetrics.taskCompletion.completedTasks / this.uxMetrics.taskCompletion.totalTasks;
    }

    // Interaction success rate
    if (this.uxMetrics.interaction.totalInteractions > 0) {
      this.uxMetrics.interaction.successRate =
        this.uxMetrics.interaction.successfulInteractions /
        this.uxMetrics.interaction.totalInteractions;
    }

    // Overall usability score (composite metric)
    const taskScore = this.uxMetrics.taskCompletion.completionRate || 0;
    const interactionScore = this.uxMetrics.interaction.successRate || 0;
    const satisfactionScore = this.uxMetrics.satisfaction.overallScore / 5; // Normalize to 0-1
    const errorPenalty = Math.min(this.uxMetrics.interaction.errorRate, 0.5); // Cap at 50%

    this.uxMetrics.usability.overallScore =
      (taskScore * 0.3 + interactionScore * 0.3 + satisfactionScore * 0.4) * (1 - errorPenalty);
  }

  /**
   * Update real-time UX indicators
   * @param {Object} interaction - Recent interaction
   */
  updateRealTimeIndicators(interaction) {
    if (!interaction) {
      this.realTimeIndicators.interactionSuccess = false;
      this.realTimeIndicators.cognitiveLoad = 'low';
      this.realTimeIndicators.currentSatisfaction = 1;
      this.realTimeIndicators.engagementLevel = 'low';
      return;
    }

    // Update interaction success indicator
    this.realTimeIndicators.interactionSuccess = Boolean(interaction.successful);

    // Update cognitive load based on interaction duration and errors
    if ((interaction.duration ?? 0) > 5000 || interaction.errorOccurred) {
      this.realTimeIndicators.cognitiveLoad = 'high';
    } else if ((interaction.duration ?? 0) > 2000) {
      this.realTimeIndicators.cognitiveLoad = 'medium';
    } else {
      this.realTimeIndicators.cognitiveLoad = 'low';
    }

    // Update satisfaction based on recent interactions
    const recentInteractions = this.getRecentInteractions(5);
    const recentSuccessRate =
      recentInteractions.length > 0
        ? recentInteractions.filter((i) => i.successful).length / recentInteractions.length
        : 1;

    this.realTimeIndicators.currentSatisfaction = recentSuccessRate;

    // Update engagement level
    const interactionFrequency = this.calculateRecentInteractionFrequency();
    if (interactionFrequency > 2) {
      this.realTimeIndicators.engagementLevel = 'high';
    } else if (interactionFrequency > 0.5) {
      this.realTimeIndicators.engagementLevel = 'medium';
    } else {
      this.realTimeIndicators.engagementLevel = 'low';
    }
  }

  /**
   * Update frustration level based on errors
   * @param {Object} error - Error data
   */
  updateFrustrationLevel(error) {
    const recentErrors = this.getRecentErrors(5);
    const errorFrequency = recentErrors.length;

    const severityOrder = ['none', 'low', 'medium', 'high'];
    const severityFromError = (() => {
      if (!error) return 'none';
      if (typeof error.userFrustration === 'string') {
        return error.userFrustration;
      }

      switch (error.severity) {
        case 'critical':
        case 'high':
          return 'high';
        case 'medium':
          return 'medium';
        case 'low':
          return 'low';
        default:
          return 'none';
      }
    })();

    const frequencyLevel = (() => {
      if (errorFrequency >= 3) return 'high';
      if (errorFrequency >= 2) return 'medium';
      if (errorFrequency >= 1) return 'low';
      return 'none';
    })();

    const severityIndex = severityOrder.indexOf(severityFromError);
    const frequencyIndex = severityOrder.indexOf(frequencyLevel);
    const resolvedLevel = severityIndex > frequencyIndex ? severityFromError : frequencyLevel;

    this.realTimeIndicators.userFrustration = resolvedLevel;
  }

  /**
   * Get recent interactions
   * @param {number} count - Number of recent interactions
   * @returns {Array} Recent interactions
   */
  getRecentInteractions(count = 5) {
    if (!Array.isArray(this.interactionBuffer) || this.interactionBuffer.length === 0) {
      return [];
    }

    return this.interactionBuffer.slice(-count);
  }

  /**
   * Get recent errors
   * @param {number} count - Number of recent errors
   * @returns {Array} Recent errors
   */
  getRecentErrors(count = 5) {
    if (
      !this.currentSession ||
      !Array.isArray(this.currentSession.errors) ||
      this.currentSession.errors.length === 0
    ) {
      return [];
    }

    return this.currentSession.errors.slice(-count);
  }

  /**
   * Calculate recent interaction frequency
   * @returns {number} Interactions per minute
   */
  calculateRecentInteractionFrequency() {
    const recentInteractions = this.getRecentInteractions(10);
    if (recentInteractions.length < 2) return 0;

    const timeSpan =
      recentInteractions[recentInteractions.length - 1].timestamp - recentInteractions[0].timestamp;

    if (timeSpan <= 0) return 0; // Avoid division by zero or negative values

    return (recentInteractions.length / timeSpan) * 60000; // per minute
  }

  /**
   * Get current task
   * @returns {Object|null} Current task
   */
  getCurrentTask() {
    if (!this.currentSession || this.currentSession.tasks.length === 0) {
      return null;
    }

    // Return the most recent task that's not completed
    const incompleteTasks = this.currentSession.tasks.filter((t) => t.status !== 'completed');
    return incompleteTasks[incompleteTasks.length - 1] || null;
  }

  /**
   * Update task metrics
   * @param {Object} task - Task data
   */
  updateTaskMetrics(task) {
    if (task.status === 'completed') {
      this.uxMetrics.taskCompletion.completedTasks++;
    } else if (task.status === 'abandoned') {
      this.uxMetrics.taskCompletion.abandonedTasks++;
    }

    this.uxMetrics.taskCompletion.totalTasks++;

    // Update average completion time
    if (task.successful && task.duration > 0) {
      const currentAvg = this.uxMetrics.taskCompletion.averageCompletionTime;
      const completedCount = this.uxMetrics.taskCompletion.completedTasks;

      this.uxMetrics.taskCompletion.averageCompletionTime =
        (currentAvg * (completedCount - 1) + task.duration) / completedCount;
    }
  }

  /**
   * Update error metrics
   * @param {Object} error - Error data
   */
  updateErrorMetrics(error) {
    // Update recovery time
    if (error.recoveryTime > 0) {
      const currentAvg = this.uxMetrics.interaction.recoveryTime;
      this.uxMetrics.interaction.recoveryTime = (currentAvg + error.recoveryTime) / 2;
    }
  }

  /**
   * Update satisfaction metrics
   * @param {Object} feedback - Satisfaction feedback
   */
  updateSatisfactionMetrics(feedback) {
    if (feedback.overallSatisfaction) {
      // Use simple assignment for first value, then average
      if (this.uxMetrics.satisfaction.overallScore === 0) {
        this.uxMetrics.satisfaction.overallScore = feedback.overallSatisfaction;
      } else {
        this.uxMetrics.satisfaction.overallScore =
          (this.uxMetrics.satisfaction.overallScore + feedback.overallSatisfaction) / 2;
      }
    }

    if (feedback.voiceQuality) {
      if (this.uxMetrics.satisfaction.voiceQualityScore === 0) {
        this.uxMetrics.satisfaction.voiceQualityScore = feedback.voiceQuality;
      } else {
        this.uxMetrics.satisfaction.voiceQualityScore =
          (this.uxMetrics.satisfaction.voiceQualityScore + feedback.voiceQuality) / 2;
      }
    }

    if (feedback.responsiveness) {
      if (this.uxMetrics.satisfaction.responsivenessScore === 0) {
        this.uxMetrics.satisfaction.responsivenessScore = feedback.responsiveness;
      } else {
        this.uxMetrics.satisfaction.responsivenessScore =
          (this.uxMetrics.satisfaction.responsivenessScore + feedback.responsiveness) / 2;
      }
    }

    if (feedback.naturalness) {
      if (this.uxMetrics.satisfaction.naturalness === 0) {
        this.uxMetrics.satisfaction.naturalness = feedback.naturalness;
      } else {
        this.uxMetrics.satisfaction.naturalness =
          (this.uxMetrics.satisfaction.naturalness + feedback.naturalness) / 2;
      }
    }

    // Store feedback
    this.uxMetrics.satisfaction.userFeedback.push({
      timestamp: Date.now(),
      feedback: feedback
    });

    // Maintain feedback history
    if (this.uxMetrics.satisfaction.userFeedback.length > 100) {
      this.uxMetrics.satisfaction.userFeedback.shift();
    }
  }

  /**
   * Setup event listeners for automatic UX tracking
   */
  setupEventListeners() {
    // This would set up DOM event listeners for automatic tracking
    console.log('UX event listeners set up');
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    // Clean up event listeners
    this.eventListeners.clear();
    console.log('UX event listeners removed');
  }

  /**
   * Start periodic UX assessment
   */
  startPeriodicAssessment() {
    this.assessmentInterval = setInterval(() => {
      this.performPeriodicAssessment();
    }, this.metricsConfig.trackingInterval);
  }

  /**
   * Stop periodic UX assessment
   */
  stopPeriodicAssessment() {
    if (this.assessmentInterval) {
      clearInterval(this.assessmentInterval);
      this.assessmentInterval = null;
    }
  }

  /**
   * Perform periodic UX assessment
   */
  performPeriodicAssessment() {
    if (!this.isTracking || !this.currentSession) {
      return;
    }

    // Update engagement metrics
    this.updateEngagementMetrics();

    // Check for drop-off points
    this.checkForDropOffPoints();

    // Update real-time indicators
    this.updateRealTimeIndicators();
  }

  /**
   * Update engagement metrics
   */
  updateEngagementMetrics() {
    if (!this.currentSession) return;

    const sessionDuration = Date.now() - this.currentSession.startTime;
    const interactionCount = this.currentSession.interactions.length;

    this.uxMetrics.engagement.sessionDuration = sessionDuration;
    this.uxMetrics.engagement.interactionFrequency = interactionCount / (sessionDuration / 60000); // per minute
  }

  /**
   * Check for user drop-off points
   */
  checkForDropOffPoints() {
    // Identify potential drop-off points based on user behavior
    const recentInteractions = this.getRecentInteractions(5);
    const timeSinceLastInteraction =
      Date.now() - (recentInteractions[recentInteractions.length - 1]?.timestamp || Date.now());

    if (timeSinceLastInteraction > 60000) {
      // 1 minute of inactivity
      this.uxMetrics.engagement.dropOffPoints.push({
        timestamp: Date.now(),
        inactivityDuration: timeSinceLastInteraction,
        context: {
          lastInteraction: recentInteractions[recentInteractions.length - 1],
          sessionDuration: Date.now() - this.currentSession.startTime
        }
      });
    }
  }

  /**
   * Track generic event
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   */
  trackEvent(eventType, eventData) {
    const timestamp = Date.now();
    const sessionId = this.currentSession?.id || null;

    if (this.isTracking && this.currentSession) {
      if (!Array.isArray(this.currentSession.events)) {
        this.currentSession.events = [];
      }

      this.currentSession.events.push({
        type: eventType,
        timestamp,
        sessionId,
        data: eventData
      });
    }

    console.log('UX event tracked:', eventType, eventData);
  }

  /**
   * Get current UX metrics
   * @returns {Object} Current UX metrics
   */
  getCurrentMetrics() {
    return {
      uxMetrics: this.uxMetrics,
      realTimeIndicators: this.realTimeIndicators,
      currentSession: this.currentSession,
      sessionHistory: this.sessionHistory.slice(-5), // Last 5 sessions
      isTracking: this.isTracking
    };
  }

  /**
   * Export UX metrics data
   * @param {Object} options - Export options
   * @returns {Object} Exported UX data
   */
  exportUXData(options = {}) {
    const {
      includeSessionHistory = true,
      includeInteractionDetails = false,
      format = 'json'
    } = options;

    const exportData = {
      exportTimestamp: Date.now(),
      trackerId: this.trackerId,
      uxMetrics: this.uxMetrics,
      realTimeIndicators: this.realTimeIndicators
    };

    if (includeSessionHistory) {
      exportData.sessionHistory = this.sessionHistory;
    }

    if (includeInteractionDetails) {
      exportData.interactionBuffer = this.interactionBuffer;
    }

    if (format === 'csv') {
      return this.convertUXToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Convert UX data to CSV
   * @param {Object} exportData - Export data
   * @returns {string} CSV string
   */
  convertUXToCSV(exportData) {
    const headers = ['timestamp', 'metric_category', 'metric_name', 'value', 'unit'];
    const rows = [];

    // Add UX metrics
    Object.entries(exportData.uxMetrics).forEach(([category, metrics]) => {
      Object.entries(metrics).forEach(([metric, value]) => {
        if (typeof value === 'number') {
          rows.push([exportData.exportTimestamp, category, metric, value, 'score']);
        }
      });
    });

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  /**
   * Reset UX metrics
   */
  resetMetrics() {
    this.uxMetrics = {
      taskCompletion: {
        totalTasks: 0,
        completedTasks: 0,
        abandonedTasks: 0,
        averageCompletionTime: 0
      },
      interaction: {
        totalInteractions: 0,
        successfulInteractions: 0,
        averageInteractionTime: 0,
        errorRate: 0,
        recoveryTime: 0
      },
      satisfaction: {
        overallScore: 0,
        voiceQualityScore: 0,
        responsivenessScore: 0,
        naturalness: 0,
        userFeedback: []
      },
      usability: {
        learnabilityScore: 0,
        memorabilityScore: 0,
        errorPreventionScore: 0,
        accessibilityScore: 0,
        cognitiveLoadScore: 0
      },
      engagement: {
        sessionDuration: 0,
        interactionFrequency: 0,
        featureUsage: {},
        returnUserRate: 0,
        dropOffPoints: []
      }
    };

    this.sessionHistory = [];
    this.interactionBuffer = [];

    console.log('UX metrics reset');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopTracking();
    this.resetMetrics();
    console.log('VoiceUXMetricsTracker cleaned up');
  }
}

// Export singleton instance
export const voiceUXMetricsTracker = new VoiceUXMetricsTracker();
