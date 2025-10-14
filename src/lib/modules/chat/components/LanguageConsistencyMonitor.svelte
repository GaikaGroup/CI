<script>
  import { onMount, onDestroy } from 'svelte';

  // Component state
  let metrics = null;
  let loading = true;
  let error = null;
  let refreshInterval = null;

  // Configuration
  let autoRefresh = true;
  let refreshRate = 30000; // 30 seconds
  let selectedTimeRange = 'last24h';
  let selectedLanguage = '';

  // Available options
  const timeRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'last24h', label: 'Last 24 Hours' },
    { value: 'last7d', label: 'Last 7 Days' },
    { value: 'last30d', label: 'Last 30 Days' }
  ];

  const languageOptions = [
    { value: '', label: 'All Languages' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'ru', label: 'Russian' }
  ];

  /**
   * Fetch language consistency metrics
   */
  async function fetchMetrics() {
    try {
      loading = true;
      error = null;

      const params = new URLSearchParams();
      if (selectedTimeRange) params.set('timeRange', selectedTimeRange);
      if (selectedLanguage) params.set('language', selectedLanguage);

      const response = await fetch(`/api/language-consistency/metrics?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch metrics');
      }

      metrics = data;
    } catch (err) {
      console.error('Error fetching language consistency metrics:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  /**
   * Export logs
   */
  async function exportLogs(format = 'json') {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (selectedTimeRange) params.set('timeRange', selectedTimeRange);
      if (selectedLanguage) params.set('language', selectedLanguage);

      const response = await fetch(`/api/language-consistency/export?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export logs');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `language-consistency-logs-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting logs:', err);
      alert(`Export failed: ${err.message}`);
    }
  }

  /**
   * Clear logs
   */
  async function clearLogs(type = null) {
    if (!confirm(`Are you sure you want to clear ${type || 'all'} logs?`)) {
      return;
    }

    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);

      const response = await fetch(`/api/language-consistency/metrics?${params}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear logs');
      }

      // Refresh metrics after clearing
      await fetchMetrics();
    } catch (err) {
      console.error('Error clearing logs:', err);
      alert(`Clear failed: ${err.message}`);
    }
  }

  /**
   * Start auto-refresh
   */
  function startAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    if (autoRefresh) {
      refreshInterval = setInterval(fetchMetrics, refreshRate);
    }
  }

  /**
   * Stop auto-refresh
   */
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  /**
   * Handle filter changes
   */
  function handleFilterChange() {
    fetchMetrics();
  }

  /**
   * Format percentage
   */
  function formatPercentage(value) {
    return `${(value * 100).toFixed(1)}%`;
  }

  /**
   * Format number with commas
   */
  function formatNumber(value) {
    return value.toLocaleString();
  }

  /**
   * Get confidence level color
   */
  function getConfidenceColor(level) {
    switch (level) {
      case 'veryHigh':
        return 'text-green-600';
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-orange-500';
      case 'veryLow':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Get severity color
   */
  function getSeverityColor(severity) {
    switch (severity) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-orange-600';
      case 'none':
        return 'text-green-600';
      default:
        return 'text-gray-500';
    }
  }

  // Lifecycle
  onMount(() => {
    fetchMetrics();
    startAutoRefresh();
  });

  onDestroy(() => {
    stopAutoRefresh();
  });

  // Reactive statements
  $: if (autoRefresh) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
</script>

<div class="language-consistency-monitor p-6 bg-white rounded-lg shadow-lg">
  <div class="header mb-6">
    <h2 class="text-2xl font-bold text-gray-800 mb-4">Language Consistency Monitor</h2>

    <!-- Controls -->
    <div class="controls flex flex-wrap gap-4 mb-4">
      <!-- Time Range Filter -->
      <div class="filter-group">
        <label for="timeRange" class="block text-sm font-medium text-gray-700 mb-1">
          Time Range
        </label>
        <select
          id="timeRange"
          bind:value={selectedTimeRange}
          on:change={handleFilterChange}
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {#each timeRangeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Language Filter -->
      <div class="filter-group">
        <label for="language" class="block text-sm font-medium text-gray-700 mb-1">
          Language
        </label>
        <select
          id="language"
          bind:value={selectedLanguage}
          on:change={handleFilterChange}
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {#each languageOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Auto Refresh -->
      <div class="filter-group">
        <label class="flex items-center">
          <input type="checkbox" bind:checked={autoRefresh} class="mr-2" />
          <span class="text-sm font-medium text-gray-700">Auto Refresh (30s)</span>
        </label>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="actions flex flex-wrap gap-2">
      <button
        on:click={fetchMetrics}
        disabled={loading}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>

      <button
        on:click={() => exportLogs('json')}
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Export JSON
      </button>

      <button
        on:click={() => exportLogs('csv')}
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Export CSV
      </button>

      <button
        on:click={() => clearLogs()}
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Clear All Logs
      </button>
    </div>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="error mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      <strong>Error:</strong>
      {error}
    </div>
  {/if}

  <!-- Loading State -->
  {#if loading && !metrics}
    <div class="loading text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading metrics...</p>
    </div>
  {:else if metrics}
    <!-- Summary Cards -->
    <div class="summary-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card bg-blue-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-blue-800">Total Sessions</h3>
        <p class="text-2xl font-bold text-blue-600">
          {formatNumber(metrics.metrics.summary.totalSessions)}
        </p>
      </div>

      <div class="card bg-green-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-green-800">Validation Success Rate</h3>
        <p class="text-2xl font-bold text-green-600">
          {formatPercentage(metrics.metrics.summary.overallValidationSuccessRate)}
        </p>
      </div>

      <div class="card bg-yellow-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-yellow-800">Avg Detection Confidence</h3>
        <p class="text-2xl font-bold text-yellow-600">
          {(metrics.metrics.summary.averageDetectionConfidence * 100).toFixed(1)}%
        </p>
      </div>

      <div class="card bg-red-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-red-800">Critical Issues</h3>
        <p class="text-2xl font-bold text-red-600">
          {formatNumber(metrics.metrics.summary.criticalIssuesCount)}
        </p>
      </div>
    </div>

    <!-- Detection Statistics -->
    {#if metrics.metrics.detection}
      <div class="detection-stats mb-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-3">Detection Statistics</h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Language Distribution -->
          <div class="stat-card bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Language Distribution</h4>
            {#if Object.keys(metrics.metrics.detection.languageDistribution).length > 0}
              <div class="space-y-2">
                {#each Object.entries(metrics.metrics.detection.languageDistribution) as [lang, count]}
                  <div class="flex justify-between">
                    <span class="text-gray-600">{lang.toUpperCase()}</span>
                    <span class="font-medium">{formatNumber(count)}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-gray-500">No data available</p>
            {/if}
          </div>

          <!-- Confidence Distribution -->
          <div class="stat-card bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Confidence Distribution</h4>
            {#if metrics.metrics.detection.confidenceStats?.distribution}
              <div class="space-y-2">
                {#each Object.entries(metrics.metrics.detection.confidenceStats.distribution) as [level, count]}
                  <div class="flex justify-between">
                    <span class="text-gray-600 {getConfidenceColor(level)}">{level}</span>
                    <span class="font-medium">{formatNumber(count)}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-gray-500">No data available</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Validation Statistics -->
    {#if metrics.metrics.validation}
      <div class="validation-stats mb-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-3">Validation Statistics</h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Severity Distribution -->
          <div class="stat-card bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Issue Severity Distribution</h4>
            {#if Object.keys(metrics.metrics.validation.severityDistribution).length > 0}
              <div class="space-y-2">
                {#each Object.entries(metrics.metrics.validation.severityDistribution) as [severity, count]}
                  <div class="flex justify-between">
                    <span class="text-gray-600 {getSeverityColor(severity)}">{severity}</span>
                    <span class="font-medium">{formatNumber(count)}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-gray-500">No data available</p>
            {/if}
          </div>

          <!-- Recommendation Distribution -->
          <div class="stat-card bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Recommendation Distribution</h4>
            {#if Object.keys(metrics.metrics.validation.recommendationDistribution).length > 0}
              <div class="space-y-2">
                {#each Object.entries(metrics.metrics.validation.recommendationDistribution) as [recommendation, count]}
                  <div class="flex justify-between">
                    <span class="text-gray-600">{recommendation}</span>
                    <span class="font-medium">{formatNumber(count)}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-gray-500">No data available</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Logger Statistics -->
    {#if metrics.loggerStats}
      <div class="logger-stats">
        <h3 class="text-xl font-semibold text-gray-800 mb-3">Logger Statistics</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="stat-card bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Detection Logs</h4>
            <p class="text-lg font-medium">
              {formatNumber(metrics.loggerStats.detectionLogsCount)}
            </p>
          </div>

          <div class="stat-card bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Validation Logs</h4>
            <p class="text-lg font-medium">
              {formatNumber(metrics.loggerStats.validationLogsCount)}
            </p>
          </div>

          <div class="stat-card bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Session Metrics</h4>
            <p class="text-lg font-medium">
              {formatNumber(metrics.loggerStats.sessionMetricsCount)}
            </p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Timestamp -->
    <div class="timestamp mt-6 text-sm text-gray-500 text-center">
      Last updated: {new Date(metrics.timestamp).toLocaleString()}
    </div>
  {/if}
</div>

<style>
  .language-consistency-monitor {
    max-width: 1200px;
    margin: 0 auto;
  }

  .filter-group {
    min-width: 150px;
  }

  .stat-card {
    transition: transform 0.2s ease-in-out;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }
</style>
