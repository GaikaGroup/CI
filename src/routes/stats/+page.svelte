<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { checkAuth } from '$modules/auth/stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  let loading = true;
  let selectedTimeRange = '30d';
  let overview = null;
  let trends = null;
  let feedbackStats = null;
  let error = null;
  let autoRefresh = false;
  let refreshInterval = null;
  let lastUpdated = null;

  // Load stats data from API
  async function loadStats() {
    loading = true;
    error = null;

    try {
      const [overviewRes, trendsRes, feedbackRes] = await Promise.all([
        fetch(`/api/stats/overview?range=${selectedTimeRange}`),
        fetch(`/api/stats/trends?range=${selectedTimeRange}`),
        fetch(`/api/stats/feedback`)
      ]);

      if (!overviewRes.ok || !trendsRes.ok) {
        throw new Error('Failed to fetch statistics');
      }

      overview = await overviewRes.json();
      trends = await trendsRes.json();

      // Feedback stats might fail if user is not admin, that's ok
      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        feedbackStats = feedbackData.stats;
      }

      lastUpdated = new Date();
    } catch (err) {
      console.error('Error loading stats:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // Handle time range changes (smooth, no page reload)
  async function handleTimeRangeChange() {
    await loadStats();
  }

  // Clear cache and reload
  async function clearCache() {
    try {
      const response = await fetch('/api/admin/stats/clear-cache', {
        method: 'POST'
      });
      if (response.ok) {
        await loadStats();
      }
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }

  // Toggle auto-refresh
  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;

    if (autoRefresh) {
      // Refresh every 30 seconds
      refreshInterval = setInterval(() => {
        if (!loading) {
          loadStats();
        }
      }, 30000);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    }
  }

  // Initialize
  onMount(async () => {
    await checkAuth();
    await loadStats();
  });

  // Cleanup
  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  // Format numbers with commas
  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num || 0);
  }

  // Format percentage
  function formatPercentage(num) {
    const value = num || 0;
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  // Format currency - always show up to 8 decimal places for precision
  function formatCurrency(num) {
    const value = num || 0;

    // Always show up to 8 decimal places for all amounts
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(value);
  }
</script>

<svelte:head>
  <title>{getTranslation($selectedLanguage, 'statisticsTitle')}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Header -->
  <div class="bg-white dark:bg-gray-800 shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-6">
        <div class="md:flex md:items-center md:justify-between">
          <div class="flex-1 min-w-0">
            <h1
              class="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate"
            >
              {getTranslation($selectedLanguage, 'statistics')}
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Аналитика и метрики для принятия управленческих решений
              {#if lastUpdated}
                <span class="ml-2">• Updated {lastUpdated.toLocaleTimeString()}</span>
              {/if}
            </p>
          </div>
          <div class="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <!-- Auto-refresh Toggle -->
            <button
              on:click={toggleAutoRefresh}
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 {autoRefresh
                ? 'ring-2 ring-green-500'
                : ''}"
              title={getTranslation($selectedLanguage, 'autoRefreshEvery30')}
            >
              {autoRefresh ? '⏸️' : '▶️'}
              {getTranslation($selectedLanguage, 'autoRefresh')}
            </button>
            <!-- Clear Cache Button -->
            <button
              on:click={clearCache}
              disabled={loading}
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              🔄 Clear Cache
            </button>
            <!-- Time Range Selector -->
            <select
              bind:value={selectedTimeRange}
              on:change={handleTimeRangeChange}
              disabled={loading}
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="1h">{getTranslation($selectedLanguage, 'lastHour')}</option>
              <option value="1d">{getTranslation($selectedLanguage, 'last24Hours')}</option>
              <option value="7d">{getTranslation($selectedLanguage, 'last7Days')}</option>
              <option value="30d">{getTranslation($selectedLanguage, 'last30Days')}</option>
              <option value="1y">{getTranslation($selectedLanguage, 'lastYear')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if error}
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8"
      >
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading statistics
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if loading && !overview}
      <div class="text-center py-12" transition:fade>
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
        ></div>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {getTranslation($selectedLanguage, 'loadingStatistics')}
        </p>
      </div>
    {:else if !overview && !loading}
      <div class="text-center py-12">
        <div class="text-red-500">
          <p>⚠️ No overview data</p>
          <p class="text-sm">
            loading: {loading}, overview: {overview ? 'exists' : 'null'}, error: {error || 'none'}
          </p>
        </div>
      </div>
    {:else}
      <div transition:fade>
        <!-- Loading overlay for refresh -->
        {#if loading}
          <div
            class="fixed top-20 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
            transition:fade
          >
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span class="text-sm">Updating...</span>
          </div>
        {/if}

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <!-- Total Users -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">👥</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Users
                    </dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {formatNumber(overview.users.total)}
                    </dd>
                    <dd class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="text-{overview.users.growth >= 0 ? 'green' : 'red'}-600">
                        {formatPercentage(overview.users.growth)}
                      </span>
                      vs previous period
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Sessions -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">💬</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Sessions
                    </dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {formatNumber(overview.sessions.total)}
                    </dd>
                    <dd class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="text-{overview.sessions.growth >= 0 ? 'green' : 'red'}-600">
                        {formatPercentage(overview.sessions.growth)}
                      </span>
                      vs previous period
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Messages -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">💭</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Messages
                    </dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {formatNumber(overview.messages.total)}
                    </dd>
                    <dd class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="text-{overview.messages.growth >= 0 ? 'green' : 'red'}-600">
                        {formatPercentage(overview.messages.growth)}
                      </span>
                      vs previous period
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Costs -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">💰</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      AI Costs
                    </dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {formatCurrency(overview.finance.totalCost)}
                    </dd>
                    <dd class="text-sm text-gray-600 dark:text-gray-300">
                      {formatCurrency(overview.finance.avgCostPerMessage)} per message
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts and Analytics Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <!-- User Activity Chart -->
          <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {getTranslation($selectedLanguage, 'userActivity')}
            </h3>
            {#if trends && trends.dailyActivity}
              {@const lastDays = trends.dailyActivity.slice(-7)}
              {@const maxUsers = Math.max(...lastDays.map((d) => d.activeUsers), 1)}

              <div class="space-y-3">
                {#each lastDays as day}
                  {@const percentage = (day.activeUsers / maxUsers) * 100}
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div class="flex items-center gap-3">
                        <span class="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {day.activeUsers} active
                        </span>
                        {#if day.newUsers > 0}
                          <span class="text-xs font-medium text-green-600 dark:text-green-400">
                            +{day.newUsers} new
                          </span>
                        {/if}
                      </div>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        class="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                        style="width: {percentage}%"
                      ></div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-gray-500 dark:text-gray-400">No activity data</p>
            {/if}
          </div>

          <!-- Course Popularity Placeholder -->
          <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {getTranslation($selectedLanguage, 'popularCourses')}
            </h3>
            <div class="space-y-3">
              {#each overview.courses.popular.slice(0, 5) as course}
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-900 dark:text-white">{course.name}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400"
                    >{course.sessionCount} sessions</span
                  >
                </div>
              {/each}
            </div>
          </div>

          <!-- Finance Chart - Detailed Table -->
          <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              AI Provider Costs
            </h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th
                      class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >Provider</th
                    >
                    <th
                      class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >Cost</th
                    >
                    <th
                      class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >Messages</th
                    >
                    <th
                      class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >Avg/Msg</th
                    >
                    <th
                      class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >%</th
                    >
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  {#each overview.finance.providerDistribution as provider}
                    {@const avgPerMsg =
                      provider.messageCount > 0 ? provider.cost / provider.messageCount : 0}
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td class="px-3 py-2 text-sm text-gray-900 dark:text-white capitalize"
                        >{provider.provider}</td
                      >
                      <td class="px-3 py-2 text-sm text-gray-900 dark:text-white text-right font-mono">
                        {formatCurrency(provider.cost)}
                      </td>
                      <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 text-right">
                        {formatNumber(provider.messageCount)}
                      </td>
                      <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 text-right font-mono">
                        {formatCurrency(avgPerMsg)}
                      </td>
                      <td class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-right">
                        {provider.percentage}%
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <!-- LLM Provider Distribution -->
          {#if overview.llmProviders && overview.llmProviders.providerDistribution.length > 0}
            <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                LLM Provider Usage
              </h3>

              <!-- Pie Chart -->
              <div class="flex justify-center mb-4">
                <svg viewBox="0 0 200 200" class="w-48 h-48">
                  {#each overview.llmProviders.providerDistribution as provider, i}
                    {@const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']}
                    {@const color = colors[i % colors.length]}
                    {@const total = overview.llmProviders.providerDistribution.reduce(
                      (sum, p) => sum + p.count,
                      0
                    )}
                    {@const percentage = (provider.count / total) * 100}
                    {@const startAngle = overview.llmProviders.providerDistribution
                      .slice(0, i)
                      .reduce((sum, p) => sum + (p.count / total) * 360, 0)}
                    {@const endAngle = startAngle + (percentage / 100) * 360}
                    {@const startRad = (startAngle - 90) * (Math.PI / 180)}
                    {@const endRad = (endAngle - 90) * (Math.PI / 180)}
                    {@const x1 = 100 + 80 * Math.cos(startRad)}
                    {@const y1 = 100 + 80 * Math.sin(startRad)}
                    {@const x2 = 100 + 80 * Math.cos(endRad)}
                    {@const y2 = 100 + 80 * Math.sin(endRad)}
                    {@const largeArc = percentage > 50 ? 1 : 0}

                    <path
                      d="M 100 100 L {x1} {y1} A 80 80 0 {largeArc} 1 {x2} {y2} Z"
                      fill={color}
                      stroke="white"
                      stroke-width="2"
                    />
                  {/each}
                </svg>
              </div>

              <!-- Legend -->
              <div class="space-y-2">
                {#each overview.llmProviders.providerDistribution as provider, i}
                  {@const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']}
                  {@const color = colors[i % colors.length]}
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-3 h-3 rounded-full" style="background-color: {color}"></div>
                      <span class="text-sm text-gray-900 dark:text-white capitalize"
                        >{provider.provider}</span
                      >
                    </div>
                    <div class="text-right">
                      <span class="text-sm text-gray-900 dark:text-white"
                        >{formatNumber(provider.count)} msgs</span
                      >
                      <span class="text-xs text-gray-500 dark:text-gray-400 ml-2"
                        >({provider.percentage}%)</span
                      >
                    </div>
                  </div>
                {/each}
              </div>

              {#if overview.llmProviders.totalMessagesWithoutProvider > 0}
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(overview.llmProviders.totalMessagesWithoutProvider)} messages without
                    provider info
                  </p>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Language Usage -->
          <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {getTranslation($selectedLanguage, 'languageUsage')}
            </h3>
            <div class="space-y-3">
              {#each overview.languages.topLanguages as language}
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-900 dark:text-white">{language.language}</span>
                  <div class="text-right">
                    <span class="text-sm text-gray-900 dark:text-white"
                      >{language.sessionCount} sessions</span
                    >
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-2"
                      >({language.percentage}%)</span
                    >
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Three Column Layout: Attention Economy, Platform Health, User Feedback -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <!-- Attention Economy -->
          <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Attention Economy
            </h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Total Time Spent
                </h4>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.attentionEconomy.totalTime)} min
                </p>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Fun vs Learn
                </h4>
                <div class="space-y-1">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-900 dark:text-white"
                      >{getTranslation($selectedLanguage, 'fun')}</span
                    >
                    <span class="text-sm text-gray-500 dark:text-gray-400"
                      >{overview.attentionEconomy.funVsLearn.fun.percentage}%</span
                    >
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-900 dark:text-white"
                      >{getTranslation($selectedLanguage, 'learn')}</span
                    >
                    <span class="text-sm text-gray-500 dark:text-gray-400"
                      >{overview.attentionEconomy.funVsLearn.learn.percentage}%</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Platform Health -->
          {#if trends}
            <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {getTranslation($selectedLanguage, 'platformHealth')}
              </h3>
              <div class="space-y-4">
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Growth Trend
                  </h4>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  {trends.userGrowthTrend === 'growing'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                      : trends.userGrowthTrend === 'declining'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'}"
                  >
                    {trends.userGrowthTrend}
                  </span>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Forecast Next Month
                  </h4>
                  <p class="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatNumber(trends.forecastNextMonth)} users
                  </p>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Platform Status
                  </h4>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  {trends.platformHealth === 'green'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                      : trends.platformHealth === 'red'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'}"
                  >
                    {trends.platformHealth}
                  </span>
                </div>
              </div>
            </div>
          {/if}

          <!-- User Feedback -->
          {#if feedbackStats}
            <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  {getTranslation($selectedLanguage, 'userFeedback')}
                </h3>
                <a
                  href="/admin/feedback"
                  class="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  View All →
                </a>
              </div>

              <div class="space-y-4">
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Total Dislikes
                  </h4>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(feedbackStats.totalFeedback)}
                  </p>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last Week
                  </h4>
                  <p class="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatNumber(feedbackStats.trends?.lastWeek || 0)}
                  </p>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last Month
                  </h4>
                  <p class="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatNumber(feedbackStats.trends?.lastMonth || 0)}
                  </p>
                </div>
              </div>

              <!-- Dislikes by Model -->
              {#if feedbackStats.byModel && Object.keys(feedbackStats.byModel).length > 0}
                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Top Models
                  </h4>
                  <div class="space-y-1">
                    {#each Object.entries(feedbackStats.byModel)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3) as [model, count]}
                      <div class="flex justify-between text-xs">
                        <span class="text-gray-600 dark:text-gray-400 truncate">{model}</span>
                        <span class="text-gray-900 dark:text-white font-medium">{count}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
