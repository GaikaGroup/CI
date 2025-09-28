import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { voiceDiagnostics } from '$modules/chat/VoiceDiagnostics.js';
import { voicePerformanceMonitor } from '$modules/chat/VoicePerformanceMonitor.js';
import { voiceUXMetricsTracker } from '$modules/chat/VoiceUXMetricsTracker.js';

const MAX_TREND_POINTS = 15;

const trimSeries = (series = []) => {
  if (!Array.isArray(series)) {
    return [];
  }
  return series.slice(-MAX_TREND_POINTS);
};

const createInitialState = () => ({
  systemHealth: {
    overall: 'unknown',
    components: {},
    issues: [],
    recommendations: [],
    lastHealthCheck: null
  },
  performance: {
    realTimeMetrics: null,
    trends: {
      audioLatency: [],
      synthesisTime: [],
      memoryUsage: [],
      userInteractions: [],
      errorRates: []
    },
    analysis: {},
    alerts: [],
    thresholds: voicePerformanceMonitor.thresholds
  },
  ux: {
    metrics: voiceUXMetricsTracker.uxMetrics,
    realTimeIndicators: voiceUXMetricsTracker.realTimeIndicators,
    sessionHistory: [],
    currentSession: null,
    trackingEnabled: voiceUXMetricsTracker.isTracking
  },
  lastUpdated: null,
  monitoring: {
    diagnostics: voiceDiagnostics.isMonitoring,
    performance: voicePerformanceMonitor.isActive,
    uxTracking: voiceUXMetricsTracker.isTracking
  },
  errors: {},
  ui: {
    healthCheckRunning: false,
    generatingReport: false
  }
});

const createVoiceAnalyticsStore = () => {
  const { subscribe, set, update } = writable(createInitialState());

  let initialized = false;
  let healthPoll = null;
  let performancePoll = null;
  let uxPoll = null;

  let diagnosticsStartedByStore = false;
  let performanceStartedByStore = false;
  let uxStartedByStore = false;

  const syncDiagnostics = () => {
    if (!browser) return;

    try {
      const status = voiceDiagnostics.getCurrentStatus();

      update((state) => ({
        ...state,
        systemHealth: {
          ...state.systemHealth,
          ...(status.systemHealth ?? {}),
          lastHealthCheck: status.lastHealthCheck ?? state.systemHealth.lastHealthCheck
        },
        performance: {
          ...state.performance,
          analysis: status.performanceMetrics ?? state.performance.analysis,
          thresholds: voicePerformanceMonitor.thresholds
        },
        monitoring: {
          ...state.monitoring,
          diagnostics: status.isMonitoring ?? voiceDiagnostics.isMonitoring,
          performance: voicePerformanceMonitor.isActive,
          uxTracking: voiceUXMetricsTracker.isTracking
        },
        errors: { ...state.errors, diagnostics: null },
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Failed to sync diagnostics status', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          diagnostics: 'Unable to retrieve system health data.'
        }
      }));
    }
  };

  const syncPerformance = () => {
    if (!browser) return;

    try {
      const metrics = voicePerformanceMonitor.getCurrentMetrics();
      const buffer = metrics.performanceBuffer ?? {};

      update((state) => ({
        ...state,
        performance: {
          ...state.performance,
          realTimeMetrics: metrics.realTimeMetrics ?? state.performance.realTimeMetrics,
          trends: {
            audioLatency: trimSeries(buffer.audioLatency),
            synthesisTime: trimSeries(buffer.synthesisTime),
            memoryUsage: trimSeries(buffer.memoryUsage),
            userInteractions: trimSeries(buffer.userInteractions),
            errorRates: trimSeries(buffer.errorRates)
          },
          alerts: metrics.alertHistory ?? state.performance.alerts,
          thresholds: metrics.thresholds ?? voicePerformanceMonitor.thresholds,
          analysis: state.performance.analysis
        },
        monitoring: {
          ...state.monitoring,
          performance: metrics.isActive ?? voicePerformanceMonitor.isActive
        },
        errors: { ...state.errors, performance: null },
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Failed to sync performance metrics', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          performance: 'Unable to update performance metrics.'
        }
      }));
    }
  };

  const syncUX = () => {
    if (!browser) return;

    try {
      const snapshot = voiceUXMetricsTracker.getCurrentMetrics();
      update((state) => ({
        ...state,
        ux: {
          metrics: snapshot.uxMetrics ?? state.ux.metrics,
          realTimeIndicators: snapshot.realTimeIndicators ?? state.ux.realTimeIndicators,
          sessionHistory: snapshot.sessionHistory ?? state.ux.sessionHistory,
          currentSession: snapshot.currentSession ?? state.ux.currentSession,
          trackingEnabled: snapshot.isTracking ?? voiceUXMetricsTracker.isTracking
        },
        monitoring: {
          ...state.monitoring,
          uxTracking: snapshot.isTracking ?? voiceUXMetricsTracker.isTracking
        },
        errors: { ...state.errors, ux: null },
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Failed to sync UX metrics', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          ux: 'Unable to update UX tracking metrics.'
        }
      }));
    }
  };

  const startUxPolling = () => {
    if (uxPoll || !browser) return;

    uxPoll = setInterval(() => {
      syncUX();
    }, 5000);
  };

  const stopUxPolling = () => {
    if (uxPoll) {
      clearInterval(uxPoll);
      uxPoll = null;
    }
  };

  const init = () => {
    if (!browser || initialized) {
      return;
    }

    initialized = true;

    set(createInitialState());

    try {
      if (!voiceDiagnostics.isMonitoring) {
        voiceDiagnostics.startMonitoring({ enableRealTimeAlerts: true });
        diagnosticsStartedByStore = true;
      }
    } catch (error) {
      console.error('Failed to start diagnostics monitoring', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          diagnostics: 'Diagnostics monitoring could not be started.'
        }
      }));
    }

    try {
      if (!voicePerformanceMonitor.isActive) {
        voicePerformanceMonitor.startMonitoring({ enableAlerts: true });
        performanceStartedByStore = true;
      }
    } catch (error) {
      console.error('Failed to start performance monitoring', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          performance: 'Performance monitoring could not be started.'
        }
      }));
    }

    syncDiagnostics();
    syncPerformance();
    syncUX();

    voiceDiagnostics
      .performHealthCheck()
      .then((result) => {
        update((state) => ({
          ...state,
          systemHealth: {
            ...state.systemHealth,
            ...(result ?? {}),
            lastHealthCheck: result?.timestamp ?? Date.now()
          },
          errors: { ...state.errors, diagnostics: null },
          lastUpdated: Date.now()
        }));
      })
      .catch((error) => {
        console.error('Initial health check failed', error);
        update((state) => ({
          ...state,
          errors: {
            ...state.errors,
            diagnostics: 'Initial health check failed. Try running it again.'
          }
        }));
      });

    healthPoll = setInterval(() => {
      syncDiagnostics();
    }, 30000);

    performancePoll = setInterval(() => {
      syncPerformance();
    }, 2000);

    if (voiceUXMetricsTracker.isTracking) {
      startUxPolling();
    }
  };

  const runHealthCheck = async () => {
    if (!browser) return null;

    update((state) => ({
      ...state,
      ui: { ...state.ui, healthCheckRunning: true }
    }));

    try {
      const result = await voiceDiagnostics.performHealthCheck();
      update((state) => ({
        ...state,
        systemHealth: {
          ...state.systemHealth,
          ...(result ?? {}),
          lastHealthCheck: result?.timestamp ?? Date.now()
        },
        errors: { ...state.errors, diagnostics: null },
        ui: { ...state.ui, healthCheckRunning: false },
        lastUpdated: Date.now()
      }));
      return result;
    } catch (error) {
      console.error('Manual health check failed', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          diagnostics: 'Health check failed. Please try again.'
        },
        ui: { ...state.ui, healthCheckRunning: false }
      }));
      throw error;
    }
  };

  const toggleUXTracking = async (enable) => {
    if (!browser) return false;

    try {
      if (enable) {
        voiceUXMetricsTracker.startTracking();
        uxStartedByStore = true;
        syncUX();
        startUxPolling();
        return true;
      } else {
        if (voiceUXMetricsTracker.isTracking) {
          voiceUXMetricsTracker.stopTracking();
        }
        voiceUXMetricsTracker.resetMetrics();
        syncUX();
        stopUxPolling();
        uxStartedByStore = false;
        return true;
      }
    } catch (error) {
      console.error('Failed to toggle UX tracking', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          ux: enable
            ? 'Unable to start UX tracking. Check browser permissions.'
            : 'Unable to stop UX tracking cleanly.'
        }
      }));
      return false;
    }
  };

  const updateThresholds = (thresholds) => {
    if (!browser || !thresholds) return false;

    try {
      voicePerformanceMonitor.updateThresholds(thresholds);
      syncPerformance();
      return true;
    } catch (error) {
      console.error('Failed to update performance thresholds', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          performance: 'Could not update performance thresholds.'
        }
      }));
      return false;
    }
  };

  const generateCombinedReport = async () => {
    if (!browser) return null;

    update((state) => ({
      ...state,
      ui: { ...state.ui, generatingReport: true }
    }));

    try {
      const report = await voiceDiagnostics.generateDiagnosticReport({
        includeHealthCheck: true,
        includePerformanceMetrics: true,
        includeUXMetrics: true,
        includeRecommendations: true
      });

      const performanceSnapshot = voicePerformanceMonitor.getCurrentMetrics();
      const uxSnapshot = voiceUXMetricsTracker.getCurrentMetrics();

      const combinedReport = {
        ...report,
        performanceSnapshot,
        uxSnapshot
      };

      update((state) => ({
        ...state,
        ui: { ...state.ui, generatingReport: false }
      }));

      return combinedReport;
    } catch (error) {
      console.error('Failed to generate diagnostic report', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          diagnostics: 'Unable to generate diagnostic report.'
        },
        ui: { ...state.ui, generatingReport: false }
      }));
      throw error;
    }
  };

  const exportPerformanceData = (options) => {
    if (!browser) return null;

    try {
      return voicePerformanceMonitor.exportPerformanceData(options);
    } catch (error) {
      console.error('Failed to export performance data', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          performance: 'Performance data export failed.'
        }
      }));
      return null;
    }
  };

  const exportUXData = (options) => {
    if (!browser) return null;

    try {
      return voiceUXMetricsTracker.exportUXData(options);
    } catch (error) {
      console.error('Failed to export UX data', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          ux: 'UX data export failed.'
        }
      }));
      return null;
    }
  };

  const exportDiagnostics = (options) => {
    if (!browser) return null;

    try {
      return voiceDiagnostics.exportDiagnosticData(options);
    } catch (error) {
      console.error('Failed to export diagnostic data', error);
      update((state) => ({
        ...state,
        errors: {
          ...state.errors,
          diagnostics: 'Diagnostic export failed.'
        }
      }));
      return null;
    }
  };

  const teardown = () => {
    if (!initialized) {
      return;
    }

    initialized = false;

    if (healthPoll) {
      clearInterval(healthPoll);
      healthPoll = null;
    }

    if (performancePoll) {
      clearInterval(performancePoll);
      performancePoll = null;
    }

    stopUxPolling();

    if (diagnosticsStartedByStore && voiceDiagnostics.isMonitoring) {
      voiceDiagnostics.stopMonitoring();
    }

    if (performanceStartedByStore && voicePerformanceMonitor.isActive) {
      voicePerformanceMonitor.stopMonitoring();
    }

    if (uxStartedByStore && voiceUXMetricsTracker.isTracking) {
      voiceUXMetricsTracker.stopTracking();
    }

    diagnosticsStartedByStore = false;
    performanceStartedByStore = false;
    uxStartedByStore = false;

    set(createInitialState());
  };

  const getState = () => get({ subscribe });

  return {
    subscribe,
    init,
    teardown,
    runHealthCheck,
    toggleUXTracking,
    updateThresholds,
    generateCombinedReport,
    exportPerformanceData,
    exportUXData,
    exportDiagnostics,
    getState
  };
};

export const voiceAnalyticsStore = createVoiceAnalyticsStore();
