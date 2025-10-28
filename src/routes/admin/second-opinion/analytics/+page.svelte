<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    BarChart3,
    TrendingUp,
    Users,
    Clock,
    DollarSign,
    RefreshCw,
    Calendar
  } from 'lucide-svelte';

  let analytics = null;
  let loading = true;
  let error = null;
  let dateRange = '7days';
  let autoRefresh = false;
  let refreshInterval = null;

  const dateRangeOptions = [
    { value: '1hour', label: 'Last Hour' },
    { value: '24hours', label: 'Last 24 Hours' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '1year', label: 'Last Year' }
  ];

  onMount(async () => {
    await loadAnalytics();
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  async function loadAnalytics() {
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/admin/second-opinion/analytics?range=${dateRange}`);
      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      analytics = data.analytics;
    } catch (err) {
      console.error('Error loading analytics:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;

    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadAnalytics();
      }, 30000); // Refresh every 30 seconds
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  $: if (dateRange) {
    loadAnalytics();
  }
</script>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
        <BarChart3 class="w-8 h-8" />
        Second Opinion Analytics
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-2">
        Monitor usage, performance, and quality metrics
      </p>
    </div>

    <div class="flex items-center gap-4">
      <select
        bind:value={dateRange}
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        {#each dateRangeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      <button
        on:click={toggleAutoRefresh}
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors {autoRefresh
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
          : ''}"
      >
        <RefreshCw class="w-5 h-5 {autoRefresh ? 'animate-spin text-amber-600' : ''}" />
      </button>

      <button
        on:click={loadAnalytics}
        disabled={loading}
        class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  </div>

  {#if loading && !analytics}
    <div class="flex items-center justify-center py-12">
      <RefreshCw class="w-8 h-8 animate-spin text-amber-600" />
      <span class="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
    </div>
  {:else if error}
    <div
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-red-800 dark:text-red-200">{error}</p>
      <button
        on:click={loadAnalytics}
        class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  {:else if analytics}
    <!-- Usage Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Requests</h3>
          <Users class="w-5 h-5 text-blue-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900 dark:text-white">
          {analytics.usage.totalRequests.toLocaleString()}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {analytics.usage.uniqueUsers} unique users
        </p>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-gray-600 dark:text-gray-400 text-sm font-medium">Success Rate</h3>
          <TrendingUp class="w-5 h-5 text-green-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900 dark:text-white">
          {analytics.usage.successRate.toFixed(1)}%
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {analytics.usage.failedRequests} failed
        </p>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-gray-600 dark:text-gray-400 text-sm font-medium">Avg Response Time</h3>
          <Clock class="w-5 h-5 text-purple-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900 dark:text-white">
          {(analytics.performance.avgResponseTime / 1000).toFixed(1)}s
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {analytics.performance.p95ResponseTime / 1000}s p95
        </p>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Cost</h3>
          <DollarSign class="w-5 h-5 text-amber-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900 dark:text-white">
          ${analytics.cost.totalCost.toFixed(2)}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          ${analytics.cost.avgCostPerRequest.toFixed(3)} per request
        </p>
      </div>
    </div>

    <!-- Provider Usage -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Provider Usage</h2>
      <div class="space-y-4">
        {#each Object.entries(analytics.providers) as [provider, stats]}
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-700 dark:text-gray-300 font-medium capitalize">{provider}</span
              >
              <span class="text-gray-600 dark:text-gray-400">
                {stats.requests} requests ({stats.percentage.toFixed(1)}%)
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style="width: {stats.percentage}%"
              ></div>
            </div>
            <div
              class="flex items-center justify-between mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              <span>Avg: {(stats.avgResponseTime / 1000).toFixed(1)}s</span>
              <span>Success: {stats.successRate.toFixed(1)}%</span>
              <span>Cost: ${stats.totalCost.toFixed(2)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Quality Metrics -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quality Metrics</h2>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-gray-700 dark:text-gray-300">Helpful Feedback</span>
              <span class="text-gray-900 dark:text-white font-semibold">
                {analytics.quality.helpfulPercentage.toFixed(1)}%
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-green-600 h-2 rounded-full"
                style="width: {analytics.quality.helpfulPercentage}%"
              ></div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-gray-700 dark:text-gray-300">Divergence Detected</span>
              <span class="text-gray-900 dark:text-white font-semibold">
                {analytics.quality.divergenceRate.toFixed(1)}%
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-yellow-600 h-2 rounded-full"
                style="width: {analytics.quality.divergenceRate}%"
              ></div>
            </div>
          </div>

          <div
            class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600">
                {analytics.quality.divergenceLevels.low}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Low</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-yellow-600">
                {analytics.quality.divergenceLevels.medium}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Medium</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-600">
                {analytics.quality.divergenceLevels.high}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">High</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Request Types</h2>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-gray-700 dark:text-gray-300">Automatic</span>
              <span class="text-gray-900 dark:text-white font-semibold">
                {analytics.usage.automaticRequests}
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full"
                style="width: {(analytics.usage.automaticRequests / analytics.usage.totalRequests) *
                  100}%"
              ></div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-gray-700 dark:text-gray-300">Manual</span>
              <span class="text-gray-900 dark:text-white font-semibold">
                {analytics.usage.manualRequests}
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-purple-600 h-2 rounded-full"
                style="width: {(analytics.usage.manualRequests / analytics.usage.totalRequests) *
                  100}%"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
      {#if analytics.recentActivity && analytics.recentActivity.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Time</th>
                <th class="text-left py-3 px-4 text-gray-700 dark:text-gray-300">User</th>
                <th class="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Provider</th>
                <th class="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Status</th>
                <th class="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Response Time</th>
                <th class="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Divergence</th>
              </tr>
            </thead>
            <tbody>
              {#each analytics.recentActivity as activity}
                <tr class="border-b border-gray-100 dark:border-gray-800">
                  <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </td>
                  <td class="py-3 px-4 text-gray-900 dark:text-white">
                    {activity.userId.substring(0, 8)}...
                  </td>
                  <td class="py-3 px-4 text-gray-900 dark:text-white capitalize">
                    {activity.provider}
                  </td>
                  <td class="py-3 px-4">
                    <span
                      class="px-2 py-1 rounded-full text-xs {activity.success
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}"
                    >
                      {activity.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {(activity.responseTime / 1000).toFixed(1)}s
                  </td>
                  <td class="py-3 px-4">
                    {#if activity.divergenceLevel}
                      <span
                        class="px-2 py-1 rounded-full text-xs {activity.divergenceLevel === 'low'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : activity.divergenceLevel === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}"
                      >
                        {activity.divergenceLevel}
                      </span>
                    {:else}
                      <span class="text-gray-400">-</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
      {/if}
    </div>
  {/if}
</div>
