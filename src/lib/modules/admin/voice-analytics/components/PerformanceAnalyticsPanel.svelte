<script>
  import { createEventDispatcher } from 'svelte';
  import MetricSparkline from './MetricSparkline.svelte';
  import StatusBadge from './StatusBadge.svelte';

  export let performance = {
    realTimeMetrics: null,
    trends: {},
    alerts: [],
    thresholds: {},
    analysis: {}
  };
  export let monitoringActive = false;
  export let lastUpdated = null;
  export let errorMessage = '';

  const dispatch = createEventDispatcher();

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not updated yet';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (error) {
      return 'Unknown';
    }
  };

  const formatMilliseconds = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(0)} ms` : '—';

  const formatMemory = (bytes) => {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—';
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  let thresholdsSignature = '';
  let editingThresholds = {
    latency: 100,
    memory: 50,
    response: 2000
  };

  $: {
    const signature = JSON.stringify(performance?.thresholds ?? {});
    if (signature !== thresholdsSignature) {
      thresholdsSignature = signature;
      editingThresholds = {
        latency: Math.round(performance?.thresholds?.audioProcessing?.latency ?? 100),
        memory: Math.round(
          (performance?.thresholds?.audioProcessing?.memoryUsage ?? 50 * 1024 * 1024) /
            (1024 * 1024)
        ),
        response: Math.round(performance?.thresholds?.speechSynthesis?.responseTime ?? 2000)
      };
    }
  }

  const applyThresholds = () => {
    dispatch('updateThresholds', {
      thresholds: {
        audioProcessing: {
          latency: editingThresholds.latency,
          memoryUsage: editingThresholds.memory * 1024 * 1024
        },
        speechSynthesis: {
          responseTime: editingThresholds.response
        }
      }
    });
  };

  const exportData = (format) => {
    dispatch('export', { format });
  };

  $: realTimeMetrics = performance?.realTimeMetrics ?? {};
  $: trends = performance?.trends ?? {};
  $: alerts = performance?.alerts ?? [];
  $: analysis = performance?.analysis ?? {};
</script>

<section
  class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm"
>
  <header
    class="px-6 py-5 border-b border-stone-200 dark:border-gray-700 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
  >
    <div>
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">Performance Analytics</h2>
      <p class="text-sm text-stone-500 dark:text-gray-400">
        Latency, memory usage, and alert tracking for every voice subsystem.
      </p>
    </div>
    <div class="flex items-center gap-3 flex-wrap">
      <StatusBadge
        status={monitoringActive ? 'healthy' : 'inactive'}
        label={monitoringActive ? 'Monitoring active' : 'Monitoring paused'}
      />
      <div class="text-xs text-stone-500 dark:text-gray-400">
        Last update: {formatTimestamp(lastUpdated)}
      </div>
      <div class="flex items-center gap-2">
        <button
          class="rounded-lg border border-stone-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
          on:click={() => exportData('json')}
        >
          Export JSON
        </button>
        <button
          class="rounded-lg border border-stone-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
          on:click={() => exportData('csv')}
        >
          Export CSV
        </button>
      </div>
    </div>
  </header>

  <div class="px-6 py-6 space-y-6">
    {#if errorMessage}
      <p
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/40 dark:text-red-200"
      >
        {errorMessage}
      </p>
    {/if}

    <div class="grid gap-4 md:grid-cols-3">
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <MetricSparkline
          label="Audio latency"
          points={trends.audioLatency}
          stroke="#f59e0b"
          valueFormatter={(value) => `${value.toFixed(0)} ms`}
        />
        <p class="mt-3 text-xs text-stone-500 dark:text-gray-400">
          Current: {formatMilliseconds(realTimeMetrics?.audioProcessing?.currentLatency)}
        </p>
      </div>
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <MetricSparkline
          label="Speech synthesis time"
          points={trends.synthesisTime}
          stroke="#6366f1"
          valueFormatter={(value) => `${value.toFixed(0)} ms`}
        />
        <p class="mt-3 text-xs text-stone-500 dark:text-gray-400">
          Current: {formatMilliseconds(realTimeMetrics?.speechSynthesis?.currentResponseTime)}
        </p>
      </div>
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <MetricSparkline
          label="Memory usage"
          points={trends.memoryUsage}
          stroke="#10b981"
          valueFormatter={(value) => `${(value / 1024 / 1024).toFixed(1)} MB`}
        />
        <p class="mt-3 text-xs text-stone-500 dark:text-gray-400">
          Current: {formatMemory(realTimeMetrics?.audioProcessing?.memoryUsage)}
        </p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4 space-y-4"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Thresholds
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1 text-sm text-stone-600 dark:text-gray-300">
            <span class="font-medium">Max latency (ms)</span>
            <input
              type="number"
              min="1"
              bind:value={editingThresholds.latency}
              class="w-full rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-stone-800 dark:text-white focus:border-amber-500 focus:ring-amber-500"
            />
          </label>
          <label class="space-y-1 text-sm text-stone-600 dark:text-gray-300">
            <span class="font-medium">Max memory (MB)</span>
            <input
              type="number"
              min="1"
              bind:value={editingThresholds.memory}
              class="w-full rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-stone-800 dark:text-white focus:border-amber-500 focus:ring-amber-500"
            />
          </label>
          <label class="space-y-1 text-sm text-stone-600 dark:text-gray-300 sm:col-span-2">
            <span class="font-medium">Max speech response (ms)</span>
            <input
              type="number"
              min="1"
              bind:value={editingThresholds.response}
              class="w-full rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-stone-800 dark:text-white focus:border-amber-500 focus:ring-amber-500"
            />
          </label>
        </div>
        <button
          class="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
          on:click={applyThresholds}
        >
          Apply thresholds
        </button>
      </div>

      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4 space-y-4"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Recent alerts
        </h3>
        {#if alerts.length === 0}
          <p class="text-sm text-stone-500 dark:text-gray-400">
            No alerts triggered in the latest sampling window.
          </p>
        {:else}
          <ul class="space-y-3 text-sm">
            {#each alerts as alert (alert.id)}
              <li
                class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 px-3 py-2"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-stone-700 dark:text-gray-200"
                    >{alert.message}</span
                  >
                  <StatusBadge
                    status={alert.severity ?? 'warning'}
                    label={alert.severity ?? 'Warning'}
                  />
                </div>
                <div class="mt-2 flex flex-wrap gap-3 text-xs text-stone-500 dark:text-gray-400">
                  <span
                    >{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : '—'}</span
                  >
                  {#if alert.threshold !== undefined && alert.value !== undefined}
                    <span
                      >Value: {typeof alert.value === 'number'
                        ? alert.value.toFixed(1)
                        : alert.value}</span
                    >
                    <span>Threshold: {alert.threshold}</span>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

    {#if analysis?.trends}
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4 space-y-4"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Trend summary
        </h3>
        <div class="text-sm text-stone-600 dark:text-gray-300">
          <p>
            Overall trend:
            <span class="font-semibold text-stone-800 dark:text-white"
              >{analysis.trends.overall ?? 'stable'}</span
            >
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-2 text-sm text-stone-600 dark:text-gray-300">
          <div>
            <h4 class="text-xs uppercase tracking-wide text-stone-500 dark:text-gray-400">
              Areas of concern
            </h4>
            {#if analysis.trends.concerns?.length}
              <ul class="mt-2 space-y-2">
                {#each analysis.trends.concerns as concern}
                  <li
                    class="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2"
                  >
                    <span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500"></span>
                    <span>{concern}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-2 text-xs text-stone-500 dark:text-gray-400">
                No degrading trends detected.
              </p>
            {/if}
          </div>
          <div>
            <h4 class="text-xs uppercase tracking-wide text-stone-500 dark:text-gray-400">
              Improvements
            </h4>
            {#if analysis.trends.improvements?.length}
              <ul class="mt-2 space-y-2">
                {#each analysis.trends.improvements as improvement}
                  <li
                    class="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2"
                  >
                    <span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500"></span>
                    <span>{improvement}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-2 text-xs text-stone-500 dark:text-gray-400">
                No major improvements recorded yet.
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>
