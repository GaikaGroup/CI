<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { voiceAnalyticsStore } from '$modules/admin/voice-analytics/voiceAnalyticsStore.js';
  import HealthStatusPanel from '$modules/admin/voice-analytics/components/HealthStatusPanel.svelte';
  import PerformanceAnalyticsPanel from '$modules/admin/voice-analytics/components/PerformanceAnalyticsPanel.svelte';
  import UXMetricsPanel from '$modules/admin/voice-analytics/components/UXMetricsPanel.svelte';
  import DiagnosticReportingPanel from '$modules/admin/voice-analytics/components/DiagnosticReportingPanel.svelte';

  export let data;

  let notification = '';
  let notificationType = 'success';
  let notificationTimeout;
  let lastReportTimestamp = null;

  const showNotification = (message, type = 'success') => {
    notification = message;
    notificationType = type;

    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }

    notificationTimeout = setTimeout(() => {
      notification = '';
    }, 4000);
  };

  const downloadFile = (payload, filename, mimeType) => {
    if (!browser || !payload) return;

    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    const dataBlob = new Blob([serialized], { type: mimeType });

    const objectUrl = URL.createObjectURL(dataBlob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  };

  const handleHealthCheck = async () => {
    try {
      await voiceAnalyticsStore.runHealthCheck();
      showNotification('Health check completed successfully.');
    } catch (error) {
      showNotification('Health check failed. Check console for details.', 'error');
    }
  };

  const handleThresholdUpdate = (event) => {
    const success = voiceAnalyticsStore.updateThresholds(event.detail.thresholds);
    if (success) {
      showNotification('Performance thresholds updated.');
    } else {
      showNotification('Failed to update performance thresholds.', 'error');
    }
  };

  const handlePerformanceExport = (event) => {
    const format = event.detail.format;
    const exported = voiceAnalyticsStore.exportPerformanceData({ format });

    if (!exported) {
      showNotification('Failed to export performance data.', 'error');
      return;
    }

    if (format === 'csv') {
      downloadFile(exported, 'voice-performance.csv', 'text/csv');
    } else {
      downloadFile(JSON.stringify(exported, null, 2), 'voice-performance.json', 'application/json');
    }
    showNotification('Performance data exported.');
  };

  const handleUXExport = (event) => {
    const format = event.detail.format;
    const exported = voiceAnalyticsStore.exportUXData({ format });

    if (!exported) {
      showNotification('Failed to export UX data.', 'error');
      return;
    }

    if (format === 'csv') {
      downloadFile(exported, 'voice-ux-metrics.csv', 'text/csv');
    } else {
      downloadFile(JSON.stringify(exported, null, 2), 'voice-ux-metrics.json', 'application/json');
    }
    showNotification('UX data exported.');
  };

  const handleDiagnosticsExport = (event) => {
    const format = event.detail.format;
    const exported = voiceAnalyticsStore.exportDiagnostics({ format, includeRawMetrics: true });

    if (!exported) {
      showNotification('Failed to export diagnostic data.', 'error');
      return;
    }

    if (format === 'csv') {
      downloadFile(exported, 'voice-diagnostics.csv', 'text/csv');
    } else {
      downloadFile(JSON.stringify(exported, null, 2), 'voice-diagnostics.json', 'application/json');
    }
    showNotification('Diagnostic data exported.');
  };

  const handleCombinedExport = (event) => {
    const format = event.detail.format;
    const currentState = get(voiceAnalyticsStore);
    const combined = {
      generatedAt: Date.now(),
      systemHealth: currentState.systemHealth,
      performance: currentState.performance,
      ux: currentState.ux
    };

    if (format === 'csv') {
      const csv = voiceAnalyticsStore.exportDiagnostics({ format: 'csv', includeRawMetrics: true });
      if (!csv) {
        showNotification('Failed to export combined data.', 'error');
        return;
      }
      downloadFile(csv, 'voice-analytics-combined.csv', 'text/csv');
    } else {
      downloadFile(
        JSON.stringify(combined, null, 2),
        'voice-analytics-combined.json',
        'application/json'
      );
    }
    showNotification('Combined analytics exported.');
  };

  const handleGenerateReport = async () => {
    try {
      const combinedReport = await voiceAnalyticsStore.generateCombinedReport();
      if (!combinedReport) {
        showNotification('Report generation did not return data.', 'error');
        return;
      }
      lastReportTimestamp = combinedReport.timestamp ?? Date.now();
      downloadFile(
        JSON.stringify(combinedReport, null, 2),
        `voice-diagnostic-report-${new Date(lastReportTimestamp).toISOString()}.json`,
        'application/json'
      );
      showNotification('Diagnostic report generated and downloaded.');
    } catch (error) {
      showNotification('Failed to generate diagnostic report.', 'error');
    }
  };

  const handleCopyIssues = async () => {
    const { systemHealth } = get(voiceAnalyticsStore);
    const issues = systemHealth?.issues ?? [];
    if (!browser) return;

    try {
      await navigator.clipboard.writeText(
        issues.length ? issues.join('\n') : 'No outstanding issues.'
      );
      showNotification('Issues copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy issues to clipboard', error);
      showNotification('Unable to copy issues to clipboard.', 'error');
    }
  };

  const handleToggleTracking = async (event) => {
    const enabled = event.detail.enabled;
    const success = await voiceAnalyticsStore.toggleUXTracking(enabled);
    if (success) {
      showNotification(enabled ? 'Live UX tracking enabled.' : 'Live UX tracking disabled.');
    } else {
      showNotification('Unable to toggle UX tracking. Check logs for details.', 'error');
    }
  };

  onMount(() => {
    voiceAnalyticsStore.init();

    return () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
      voiceAnalyticsStore.teardown();
    };
  });

  onDestroy(() => {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
  });
</script>

<svelte:head>
  <title>Admin • Voice Analytics</title>
</svelte:head>

<main class="max-w-7xl mx-auto px-6 py-10 space-y-8">
  <header class="space-y-3">
    <p class="text-sm text-stone-500 dark:text-gray-400">Administrator dashboard</p>
    <h1 class="text-3xl font-bold text-stone-900 dark:text-white">Analytics</h1>
    <p class="text-stone-600 dark:text-gray-300 max-w-3xl">
      Monitor system health, performance, and user experience in real time. Generate diagnostic
      reports to keep the voice stack running smoothly.
    </p>
  </header>

  {#if notification}
    <div
      class={`rounded-lg border px-4 py-3 text-sm shadow-sm ${
        notificationType === 'error'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/40 dark:text-red-200'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200'
      }`}
    >
      {notification}
    </div>
  {/if}

  {#if data?.user}
    <p class="text-sm text-stone-500 dark:text-gray-400">
      Signed in as <span class="font-medium">{data.user.email}</span>
    </p>
  {/if}

  {#if $voiceAnalyticsStore}
    <div class="space-y-8">
      <HealthStatusPanel
        systemHealth={$voiceAnalyticsStore.systemHealth}
        lastHealthCheck={$voiceAnalyticsStore.systemHealth?.lastHealthCheck}
        monitoringActive={$voiceAnalyticsStore.monitoring.diagnostics}
        runningHealthCheck={$voiceAnalyticsStore.ui.healthCheckRunning}
        errorMessage={$voiceAnalyticsStore.errors?.diagnostics}
        on:runHealthCheck={handleHealthCheck}
      />

      <PerformanceAnalyticsPanel
        performance={$voiceAnalyticsStore.performance}
        monitoringActive={$voiceAnalyticsStore.monitoring.performance}
        lastUpdated={$voiceAnalyticsStore.lastUpdated}
        errorMessage={$voiceAnalyticsStore.errors?.performance}
        on:updateThresholds={handleThresholdUpdate}
        on:export={handlePerformanceExport}
      />

      <UXMetricsPanel
        ux={$voiceAnalyticsStore.ux}
        lastUpdated={$voiceAnalyticsStore.lastUpdated}
        errorMessage={$voiceAnalyticsStore.errors?.ux}
        on:toggleTracking={handleToggleTracking}
        on:export={handleUXExport}
      />

      <DiagnosticReportingPanel
        systemHealth={$voiceAnalyticsStore.systemHealth}
        performanceAnalysis={$voiceAnalyticsStore.performance.analysis}
        uxSnapshot={{
          metrics: $voiceAnalyticsStore.ux.metrics,
          sessionHistory: $voiceAnalyticsStore.ux.sessionHistory,
          realTimeIndicators: $voiceAnalyticsStore.ux.realTimeIndicators
        }}
        generatingReport={$voiceAnalyticsStore.ui.generatingReport}
        lastGeneratedAt={lastReportTimestamp}
        errorMessage={$voiceAnalyticsStore.errors?.diagnostics}
        on:generate={handleGenerateReport}
        on:copyIssues={handleCopyIssues}
        on:exportDiagnostics={handleDiagnosticsExport}
        on:export={handleCombinedExport}
      />
    </div>
  {:else}
    <p class="text-sm text-stone-500 dark:text-gray-400">Loading analytics…</p>
  {/if}
</main>
