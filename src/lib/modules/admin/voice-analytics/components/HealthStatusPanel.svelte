<script>
  import { createEventDispatcher } from 'svelte';
  import StatusBadge from './StatusBadge.svelte';

  export let systemHealth = {
    overall: 'unknown',
    components: {},
    issues: [],
    recommendations: []
  };
  export let lastHealthCheck = null;
  export let monitoringActive = false;
  export let runningHealthCheck = false;
  export let errorMessage = '';

  const dispatch = createEventDispatcher();

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Unknown';
    }
  };

  $: components = Object.entries(systemHealth?.components ?? {});
</script>

<section
  class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm"
>
  <header
    class="px-6 py-5 border-b border-stone-200 dark:border-gray-700 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
  >
    <div>
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">
        System Health Monitoring
      </h2>
      <p class="text-sm text-stone-500 dark:text-gray-400">
        Real-time diagnostics across all voice components with actionable insights.
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <StatusBadge
        status={monitoringActive ? (systemHealth?.overall ?? 'unknown') : 'inactive'}
        label={monitoringActive
          ? 'Overall: ' + (systemHealth?.overall ?? 'Unknown')
          : 'Monitoring paused'}
      />
      <button
        class="inline-flex items-center justify-center rounded-lg border border-transparent bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
        on:click={() => dispatch('runHealthCheck')}
        disabled={runningHealthCheck}
      >
        {runningHealthCheck ? 'Running health check…' : 'Run health check'}
      </button>
    </div>
  </header>

  <div class="px-6 py-5 space-y-6">
    <div class="flex flex-col gap-2 text-sm text-stone-500 dark:text-gray-400">
      <div>
        Last health check: <span class="font-medium text-stone-700 dark:text-gray-200"
          >{formatTimestamp(lastHealthCheck)}</span
        >
      </div>
      <div>
        Monitoring status: <span class="font-medium text-stone-700 dark:text-gray-200"
          >{monitoringActive ? 'Active' : 'Paused'}</span
        >
      </div>
    </div>

    {#if errorMessage}
      <p
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/40 dark:text-red-200"
      >
        {errorMessage}
      </p>
    {/if}

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#if components.length === 0}
        <p class="text-sm text-stone-500 dark:text-gray-400 md:col-span-2 xl:col-span-3">
          No component diagnostics available yet.
        </p>
      {:else}
        {#each components as [component, details]}
          <div
            class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <h3
                class="text-sm font-semibold uppercase tracking-wide text-stone-600 dark:text-gray-300"
              >
                {component.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <StatusBadge status={details?.status ?? 'unknown'} />
            </div>
            {#if details?.issues?.length}
              <ul class="space-y-1 text-sm text-stone-600 dark:text-gray-300">
                {#each details.issues as issue}
                  <li class="flex items-start gap-2">
                    <span class="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    <span>{issue}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-sm text-stone-500 dark:text-gray-400">No current issues detected.</p>
            {/if}
            {#if details?.metrics}
              <dl class="grid grid-cols-2 gap-2 text-xs text-stone-500 dark:text-gray-400">
                {#each Object.entries(details.metrics) as [metricName, metricValue]}
                  <div class="rounded-md bg-white dark:bg-gray-800/60 px-2 py-1">
                    <dt class="font-medium text-stone-600 dark:text-gray-300">
                      {metricName.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd class="font-semibold text-stone-800 dark:text-white">
                      {typeof metricValue === 'number' ? metricValue.toFixed(2) : metricValue}
                    </dd>
                  </div>
                {/each}
              </dl>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Issues
        </h3>
        {#if systemHealth?.issues?.length}
          <ul class="mt-3 space-y-2 text-sm text-stone-600 dark:text-gray-300">
            {#each systemHealth.issues as issue}
              <li
                class="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2"
              >
                <span class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-red-500"></span>
                <span>{issue}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-3 text-sm text-stone-500 dark:text-gray-400">
            No outstanding issues detected.
          </p>
        {/if}
      </div>

      <div>
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Recommendations
        </h3>
        {#if systemHealth?.recommendations?.length}
          <ul class="mt-3 space-y-2 text-sm text-stone-600 dark:text-gray-300">
            {#each systemHealth.recommendations as recommendation}
              <li
                class="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2"
              >
                {recommendation}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-3 text-sm text-stone-500 dark:text-gray-400">
            Diagnostics look good—no immediate actions required.
          </p>
        {/if}
      </div>
    </div>
  </div>
</section>
