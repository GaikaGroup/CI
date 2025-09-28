<script>
  import { createEventDispatcher } from 'svelte';
  import StatusBadge from './StatusBadge.svelte';

  export let ux = {
    metrics: {},
    realTimeIndicators: {},
    sessionHistory: [],
    currentSession: null,
    trackingEnabled: false
  };
  export let lastUpdated = null;
  export let errorMessage = '';

  const dispatch = createEventDispatcher();

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return '—';
    }
  };

  const formatDuration = (duration) => {
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return '0m';
    const minutes = duration / 60000;
    if (minutes < 1) {
      return `${(duration / 1000).toFixed(0)}s`;
    }
    return `${minutes.toFixed(1)}m`;
  };

  const safeRate = (success, total) => {
    if (typeof success !== 'number' || typeof total !== 'number' || total <= 0) return 0;
    return Math.min(1, Math.max(0, success / total));
  };

  const percentage = (value, decimals = 0) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0%';
    return `${(value * 100).toFixed(decimals)}%`;
  };

  const toggleTracking = (event) => {
    dispatch('toggleTracking', { enabled: event.currentTarget.checked });
  };

  const exportData = (format) => {
    dispatch('export', { format });
  };

  $: metrics = ux?.metrics ?? {};
  $: indicators = ux?.realTimeIndicators ?? {};
  $: sessionHistory = ux?.sessionHistory ?? [];
  $: trackingEnabled = ux?.trackingEnabled ?? false;
  $: currentSession = ux?.currentSession ?? null;

  $: successRate = safeRate(
    metrics?.interaction?.successfulInteractions,
    metrics?.interaction?.totalInteractions
  );
  $: satisfactionScore =
    metrics?.satisfaction?.overallScore ?? indicators?.currentSatisfaction ?? 0;
  $: averageSessionDuration = metrics?.engagement?.sessionDuration ?? currentSession?.duration ?? 0;
  $: returnRate = metrics?.engagement?.returnUserRate ?? 0;
</script>

<section
  class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm"
>
  <header
    class="px-6 py-5 border-b border-stone-200 dark:border-gray-700 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
  >
    <div>
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">
        User Experience Tracking
      </h2>
      <p class="text-sm text-stone-500 dark:text-gray-400">
        Monitor interaction quality, satisfaction signals, and recent session history.
      </p>
    </div>
    <div class="flex items-center gap-4 flex-wrap">
      <label
        class="inline-flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-gray-300"
      >
        <input
          type="checkbox"
          checked={trackingEnabled}
          on:change={toggleTracking}
          class="h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500"
        />
        Live UX tracking
      </label>
      <StatusBadge
        status={trackingEnabled ? 'healthy' : 'inactive'}
        label={trackingEnabled ? 'Tracking active' : 'Tracking paused'}
      />
      <div class="flex items-center gap-2 text-xs text-stone-500 dark:text-gray-400">
        <span>Last update: {formatTimestamp(lastUpdated)}</span>
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

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-gray-400">
          Success rate
        </p>
        <p class="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
          {percentage(successRate, 0)}
        </p>
        <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
          {metrics?.interaction?.successfulInteractions ?? 0} successful interactions out of {metrics
            ?.interaction?.totalInteractions ?? 0}
        </p>
      </div>
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-gray-400">
          Avg session duration
        </p>
        <p class="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
          {formatDuration(averageSessionDuration)}
        </p>
        <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">Measured from recent sessions.</p>
      </div>
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-gray-400">
          Satisfaction
        </p>
        <p class="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
          {percentage(satisfactionScore, 0)}
        </p>
        <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
          Real-time satisfaction sentiment.
        </p>
      </div>
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-4"
      >
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-gray-400">Engagement</p>
        <p class="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
          {percentage(returnRate, 0)}
        </p>
        <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
          Return user rate & ongoing engagement.
        </p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4 space-y-4"
      >
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide">
          Current session snapshot
        </h3>
        {#if trackingEnabled && currentSession}
          <dl class="grid gap-3 text-sm text-stone-600 dark:text-gray-300">
            <div>
              <dt class="font-semibold text-stone-700 dark:text-gray-200">Session ID</dt>
              <dd class="mt-1 break-all">{currentSession.id}</dd>
            </div>
            <div>
              <dt class="font-semibold text-stone-700 dark:text-gray-200">Started</dt>
              <dd class="mt-1">{formatTimestamp(currentSession.startTime)}</dd>
            </div>
            <div>
              <dt class="font-semibold text-stone-700 dark:text-gray-200">Duration</dt>
              <dd class="mt-1">
                {formatDuration(
                  currentSession.startTime ? Math.max(0, Date.now() - currentSession.startTime) : 0
                )}
              </dd>
            </div>
          </dl>
        {:else}
          <p class="text-sm text-stone-500 dark:text-gray-400">
            {trackingEnabled
              ? 'Waiting for live interactions…'
              : 'Enable tracking to capture live sessions.'}
          </p>
        {/if}

        <div
          class="rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900/40 p-3 text-sm text-stone-600 dark:text-gray-300 space-y-1"
        >
          <div class="flex items-center justify-between">
            <span>Engagement level</span>
            <span class="font-semibold text-stone-800 dark:text-white"
              >{indicators?.engagementLevel ?? '—'}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span>Frustration</span>
            <span class="font-semibold text-stone-800 dark:text-white"
              >{indicators?.userFrustration ?? '—'}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span>Cognitive load</span>
            <span class="font-semibold text-stone-800 dark:text-white"
              >{indicators?.cognitiveLoad ?? '—'}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span>Real-time satisfaction</span>
            <span class="font-semibold text-stone-800 dark:text-white"
              >{percentage(indicators?.currentSatisfaction ?? 0, 0)}</span
            >
          </div>
        </div>
      </div>

      <div
        class="rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4"
      >
        <h3
          class="text-sm font-semibold text-stone-700 dark:text-gray-200 uppercase tracking-wide mb-3"
        >
          Recent sessions
        </h3>
        {#if sessionHistory.length === 0}
          <p class="text-sm text-stone-500 dark:text-gray-400">No session history captured yet.</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-stone-200 dark:divide-gray-700 text-sm">
              <thead
                class="bg-stone-50 dark:bg-gray-900/40 text-xs uppercase tracking-wide text-stone-500 dark:text-gray-400"
              >
                <tr>
                  <th class="px-3 py-2 text-left font-semibold">Session</th>
                  <th class="px-3 py-2 text-left font-semibold">Duration</th>
                  <th class="px-3 py-2 text-left font-semibold">Success</th>
                  <th class="px-3 py-2 text-left font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-200 dark:divide-gray-700">
                {#each sessionHistory as session (session.id)}
                  <tr class="bg-white dark:bg-gray-900/20">
                    <td class="px-3 py-2 align-top">
                      <div class="font-semibold text-stone-700 dark:text-gray-200">
                        {session.id}
                      </div>
                      <div class="text-xs text-stone-500 dark:text-gray-400">
                        {formatTimestamp(session.startTime)}
                      </div>
                    </td>
                    <td class="px-3 py-2 align-top text-stone-600 dark:text-gray-300"
                      >{formatDuration(session.duration)}</td
                    >
                    <td class="px-3 py-2 align-top text-stone-600 dark:text-gray-300">
                      {percentage(session?.metrics?.efficiency?.interactionSuccessRate ?? 0, 0)}
                    </td>
                    <td class="px-3 py-2 align-top text-stone-600 dark:text-gray-300"
                      >{session?.metrics?.errors?.totalErrors ?? 0}</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
