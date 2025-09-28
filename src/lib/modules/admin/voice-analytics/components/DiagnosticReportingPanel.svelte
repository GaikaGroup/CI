<script>
  import { createEventDispatcher } from 'svelte';

  export let systemHealth = { issues: [], recommendations: [] };
  export let performanceAnalysis = {};
  export let uxSnapshot = {};
  export let generatingReport = false;
  export let lastGeneratedAt = null;
  export let errorMessage = '';

  const dispatch = createEventDispatcher();

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not generated yet';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Unknown';
    }
  };

  const handleGenerate = () => {
    dispatch('generate');
  };

  const handleCopyIssues = () => {
    dispatch('copyIssues');
  };

  const handleExportDiagnostics = (format) => {
    dispatch('exportDiagnostics', { format });
  };

  const handleExportReports = (format) => {
    dispatch('export', { format });
  };
</script>

<section
  class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm"
>
  <header
    class="px-6 py-5 border-b border-stone-200 dark:border-gray-700 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
  >
    <div>
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">Diagnostic Reporting</h2>
      <p class="text-sm text-stone-500 dark:text-gray-400">
        Generate comprehensive reports and export raw diagnostic data for further analysis.
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <button
        class="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
        on:click={handleGenerate}
        disabled={generatingReport}
      >
        {generatingReport ? 'Generating report…' : 'Generate full diagnostic report'}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-lg border border-stone-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
        on:click={handleCopyIssues}
      >
        Copy current issues
      </button>
    </div>
  </header>

  <div class="px-6 py-6 space-y-6">
    <div class="flex flex-col gap-1 text-sm text-stone-500 dark:text-gray-400">
      <span
        >Last generated: <span class="font-medium text-stone-700 dark:text-gray-200"
          >{formatTimestamp(lastGeneratedAt)}</span
        ></span
      >
    </div>

    {#if errorMessage}
      <p
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/40 dark:text-red-200"
      >
        {errorMessage}
      </p>
    {/if}

    <div class="grid gap-6 lg:grid-cols-2">
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Open issues
        </h3>
        {#if systemHealth?.issues?.length}
          <ul class="mt-3 space-y-2 text-sm text-stone-600 dark:text-gray-300">
            {#each systemHealth.issues as issue}
              <li
                class="rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2"
              >
                {issue}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-3 text-sm text-stone-500 dark:text-gray-400">
            No outstanding issues recorded.
          </p>
        {/if}
      </div>

      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4 space-y-4"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Quick exports
        </h3>
        <div class="flex flex-wrap gap-3">
          <button
            class="rounded-lg border border-stone-200 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
            on:click={() => handleExportDiagnostics('json')}
          >
            Download diagnostics JSON
          </button>
          <button
            class="rounded-lg border border-stone-200 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
            on:click={() => handleExportDiagnostics('csv')}
          >
            Download diagnostics CSV
          </button>
          <button
            class="rounded-lg border border-stone-200 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
            on:click={() => handleExportReports('json')}
          >
            Export combined report JSON
          </button>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4 space-y-3"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Performance summary
        </h3>
        {#if performanceAnalysis && Object.keys(performanceAnalysis).length > 0}
          <ul class="space-y-2 text-sm text-stone-600 dark:text-gray-300">
            {#each Object.entries(performanceAnalysis) as [metricName, details]}
              {#if typeof details === 'object' && details !== null && metricName !== 'trends'}
                <li
                  class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 px-3 py-2"
                >
                  <div class="font-semibold text-stone-700 dark:text-gray-200">
                    {metricName.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div class="text-xs text-stone-500 dark:text-gray-400">
                    Avg: {details.average?.toFixed?.(1) ?? '—'} • Min: {details.min?.toFixed?.(1) ??
                      '—'} • Max: {details.max?.toFixed?.(1) ?? '—'}
                  </div>
                </li>
              {/if}
            {/each}
          </ul>
        {:else}
          <p class="text-sm text-stone-500 dark:text-gray-400">
            Performance metrics will appear after monitoring collects data.
          </p>
        {/if}
      </div>

      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4 space-y-3"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          UX highlights
        </h3>
        {#if uxSnapshot && Object.keys(uxSnapshot).length > 0}
          <ul class="space-y-2 text-sm text-stone-600 dark:text-gray-300">
            {#if uxSnapshot?.metrics?.satisfaction}
              <li
                class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 px-3 py-2"
              >
                Satisfaction score: {(
                  (uxSnapshot.metrics.satisfaction.overallScore ?? 0) * 100
                ).toFixed(0)}%
              </li>
            {/if}
            {#if uxSnapshot?.metrics?.interaction}
              <li
                class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 px-3 py-2"
              >
                Successful interactions: {uxSnapshot.metrics.interaction.successfulInteractions ??
                  0} / {uxSnapshot.metrics.interaction.totalInteractions ?? 0}
              </li>
            {/if}
            {#if uxSnapshot?.sessionHistory?.length}
              <li
                class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 px-3 py-2"
              >
                Sessions tracked: {uxSnapshot.sessionHistory.length}
              </li>
            {/if}
            {#if uxSnapshot?.realTimeIndicators}
              <li
                class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 px-3 py-2"
              >
                Live satisfaction: {(
                  (uxSnapshot.realTimeIndicators.currentSatisfaction ?? 0) * 100
                ).toFixed(0)}%
              </li>
            {/if}
          </ul>
        {:else}
          <p class="text-sm text-stone-500 dark:text-gray-400">
            UX metrics will populate once tracking is active.
          </p>
        {/if}
      </div>
    </div>
  </div>
</section>
