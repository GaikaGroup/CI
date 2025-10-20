<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { checkAuth } from '$modules/auth/stores';
  
  let loading = true;
  let selectedTimeRange = '30d';
  let overview = null;
  let trends = null;
  let error = null;
  let autoRefresh = false;
  let refreshInterval = null;
  let lastUpdated = null;

  // Load stats data from API
  async function loadStats() {
    loading = true;
    error = null;
    
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        fetch(`/api/stats/overview?range=${selectedTimeRange}`),
        fetch(`/api/stats/trends?range=${selectedTimeRange}`)
      ]);

      if (!overviewRes.ok || !trendsRes.ok) {
        throw new Error('Failed to fetch statistics');
      }

      overview = await overviewRes.json();
      trends = await trendsRes.json();
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

  // Format currency without rounding - show all significant digits
  function formatCurrency(num) {
    const value = num || 0;
    
    // For very small amounts (< $0.01), show up to 8 decimal places
    if (value > 0 && value < 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      }).format(value);
    }
    
    // For small amounts (< $1), show up to 6 decimal places
    if (value > 0 && value < 1) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      }).format(value);
    }
    
    // For normal amounts, show up to 4 decimal places
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  }
</script>

<svelte:head>
  <title>Statistics • AI Tutor Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Header -->
  <div class="bg-white dark:bg-gray-800 shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-6">
        <div class="md:flex md:items-center md:justify-between">
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
              Platform Statistics
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
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 {autoRefresh ? 'ring-2 ring-green-500' : ''}"
              title="Auto-refresh every 30 seconds"
            >
              {autoRefresh ? '⏸️' : '▶️'} Auto-refresh
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
              <option value="1h">Last hour</option>
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if error}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
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
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading statistics...</p>
      </div>
    {:else if !overview && !loading}
      <div class="text-center py-12">
        <div class="text-red-500">
          <p>⚠️ No overview data</p>
          <p class="text-sm">loading: {loading}, overview: {overview ? 'exists' : 'null'}, error: {error || 'none'}</p>
        </div>
      </div>
    {:else}
      <div transition:fade>
        <!-- Loading overlay for refresh -->
        {#if loading}
          <div class="fixed top-20 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2" transition:fade>
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
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Users</dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">{formatNumber(overview.users.total)}</dd>
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
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Sessions</dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">{formatNumber(overview.sessions.total)}</dd>
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
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Messages</dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">{formatNumber(overview.messages.total)}</dd>
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
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">AI Costs</dt>
                  <dd 
                    class="text-lg font-medium text-gray-900 dark:text-white cursor-help" 
                    title="Exact: ${overview.finance.totalCost.toFixed(8)}"
                  >
                    {formatCurrency(overview.finance.totalCost)}
                  </dd>
                  <dd 
                    class="text-sm text-gray-600 dark:text-gray-300 cursor-help"
                    title="Exact: ${overview.finance.avgCostPerMessage.toFixed(8)}"
                  >
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
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">User Activity</h3>
          {#if trends && trends.dailyActivity}
            {@const lastDays = trends.dailyActivity.slice(-7)}
            {@const maxUsers = Math.max(...lastDays.map(d => d.activeUsers), 1)}
            
            <div class="space-y-3">
              {#each lastDays as day}
                {@const percentage = (day.activeUsers / maxUsers) * 100}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Popular Courses</h3>
          <div class="space-y-3">
            {#each overview.courses.popular.slice(0, 5) as course}
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-900 dark:text-white">{course.name}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">{course.sessionCount} sessions</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Finance Chart - Detailed Table -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">AI Provider Costs</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Messages</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg/Msg</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">%</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {#each overview.finance.providerDistribution as provider}
                  {@const avgPerMsg = provider.messageCount > 0 ? provider.cost / provider.messageCount : 0}
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-3 py-2 text-sm text-gray-900 dark:text-white capitalize">{provider.provider}</td>
                    <td 
                      class="px-3 py-2 text-sm text-gray-900 dark:text-white text-right font-mono cursor-help" 
                      title="Exact: ${provider.cost.toFixed(8)}"
                    >
                      {formatCurrency(provider.cost)}
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 text-right">
                      {formatNumber(provider.messageCount)}
                    </td>
                    <td 
                      class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 text-right font-mono cursor-help"
                      title="Exact: ${avgPerMsg.toFixed(8)}"
                    >
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

        <!-- Language Usage -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Language Usage</h3>
          <div class="space-y-3">
            {#each overview.languages.topLanguages as language}
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-900 dark:text-white">{language.language}</span>
                <div class="text-right">
                  <span class="text-sm text-gray-900 dark:text-white">{language.sessionCount} sessions</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">({language.percentage}%)</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Attention Economy -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Attention Economy</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Time Spent</h4>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(overview.attentionEconomy.totalTime)} min</p>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Fun vs Learn</h4>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-sm text-gray-900 dark:text-white">Fun</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">{overview.attentionEconomy.funVsLearn.fun.percentage}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-900 dark:text-white">Learn</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">{overview.attentionEconomy.funVsLearn.learn.percentage}%</span>
              </div>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Top Courses by Time</h4>
            <div class="space-y-1">
              {#each overview.attentionEconomy.topCoursesByTime.slice(0, 3) as course}
                <div class="flex justify-between">
                  <span class="text-sm text-gray-900 dark:text-white truncate">{course.name}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">{course.totalTime}min</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- Platform Health -->
      {#if trends}
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Platform Health</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Growth Trend</h4>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                {trends.userGrowthTrend === 'growing' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 
                 trends.userGrowthTrend === 'declining' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' : 
                 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'}">
                {trends.userGrowthTrend}
              </span>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Forecast Next Month</h4>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">{formatNumber(trends.forecastNextMonth)} users</p>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Platform Status</h4>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                {trends.platformHealth === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 
                 trends.platformHealth === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' : 
                 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'}">
                {trends.platformHealth}
              </span>
            </div>
          </div>
        </div>
      {/if}
      </div>
    {/if}
  </div>
</div>