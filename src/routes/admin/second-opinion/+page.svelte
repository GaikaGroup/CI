<script>
  import { onMount } from 'svelte';
  import { Settings, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-svelte';
  import { getTranslation } from '$modules/i18n/translations';
  import { selectedLanguage } from '$modules/i18n/stores';

  let config = null;
  let loading = true;
  let saving = false;
  let error = null;
  let successMessage = null;

  // Form state
  let enabled = true;
  let allowManualSelection = true;
  let defaultStrategy = 'priority';
  let maxRequestsPerHour = 10;
  let maxRequestsPerDay = 50;
  let rateLimitEnabled = true;
  let divergenceEnabled = true;
  let divergenceThresholdLow = 0.7;
  let divergenceThresholdMedium = 0.5;
  let generationTimeout = 30000;

  // Provider priorities
  let providerPriorities = {
    ollama: 1,
    openai: 2
  };

  onMount(async () => {
    await loadConfig();
  });

  async function loadConfig() {
    loading = true;
    error = null;

    try {
      const response = await fetch('/api/admin/second-opinion/config');
      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const data = await response.json();
      config = data.config;

      // Populate form with current config
      enabled = config.ENABLED;
      allowManualSelection = config.ALLOW_MANUAL_SELECTION;
      defaultStrategy = config.PROVIDER_SELECTION.DEFAULT_STRATEGY;
      maxRequestsPerHour = config.RATE_LIMIT.MAX_REQUESTS_PER_HOUR;
      maxRequestsPerDay = config.RATE_LIMIT.MAX_REQUESTS_PER_DAY;
      rateLimitEnabled = config.RATE_LIMIT.ENABLED;
      divergenceEnabled = config.DIVERGENCE.ENABLED;
      divergenceThresholdLow = config.DIVERGENCE.THRESHOLD_LOW;
      divergenceThresholdMedium = config.DIVERGENCE.THRESHOLD_MEDIUM;
      generationTimeout = config.PERFORMANCE.GENERATION_TIMEOUT;

      if (config.PROVIDER_SELECTION.PRIORITIES) {
        providerPriorities = { ...config.PROVIDER_SELECTION.PRIORITIES };
      }
    } catch (err) {
      console.error('Error loading config:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function saveConfig() {
    saving = true;
    error = null;
    successMessage = null;

    try {
      const updatedConfig = {
        ENABLED: enabled,
        ALLOW_MANUAL_SELECTION: allowManualSelection,
        PROVIDER_SELECTION: {
          DEFAULT_STRATEGY: defaultStrategy,
          PRIORITIES: providerPriorities
        },
        RATE_LIMIT: {
          ENABLED: rateLimitEnabled,
          MAX_REQUESTS_PER_HOUR: maxRequestsPerHour,
          MAX_REQUESTS_PER_DAY: maxRequestsPerDay
        },
        DIVERGENCE: {
          ENABLED: divergenceEnabled,
          THRESHOLD_LOW: divergenceThresholdLow,
          THRESHOLD_MEDIUM: divergenceThresholdMedium
        },
        PERFORMANCE: {
          GENERATION_TIMEOUT: generationTimeout
        }
      };

      const response = await fetch('/api/admin/second-opinion/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      successMessage = 'Configuration saved successfully';
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function updateProviderPriority(provider, priority) {
    providerPriorities = {
      ...providerPriorities,
      [provider]: parseInt(priority)
    };
  }
</script>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
      <Settings class="w-8 h-8" />
      Second Opinion Configuration
    </h1>
    <p class="text-gray-600 dark:text-gray-400 mt-2">
      Manage settings for the second opinion feature
    </p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <RefreshCw class="w-8 h-8 animate-spin text-amber-600" />
      <span class="ml-3 text-gray-600 dark:text-gray-400">Loading configuration...</span>
    </div>
  {:else if error}
    <div
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="w-5 h-5 text-red-600 dark:text-red-400" />
        <p class="text-red-800 dark:text-red-200">{error}</p>
      </div>
      <button
        on:click={loadConfig}
        class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  {:else}
    {#if successMessage}
      <div
        class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6"
      >
        <div class="flex items-center gap-2">
          <CheckCircle class="w-5 h-5 text-green-600 dark:text-green-400" />
          <p class="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      </div>
    {/if}

    <div class="space-y-6">
      <!-- Feature Toggle -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Feature Toggle</h2>
        <div class="flex items-center justify-between">
          <div>
            <label class="text-gray-700 dark:text-gray-300 font-medium"
              >Enable Second Opinion Feature</label
            >
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Allow users to request second opinions from alternative AI models
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" bind:checked={enabled} class="sr-only peer" />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"
            ></div>
          </label>
        </div>
      </div>

      <!-- Provider Selection -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Provider Selection</h2>

        <div class="space-y-4">
          <div>
            <label class="flex items-center gap-2 mb-2">
              <input type="checkbox" bind:checked={allowManualSelection} class="rounded" />
              <span class="text-gray-700 dark:text-gray-300 font-medium"
                >Allow Manual Provider Selection</span
              >
            </label>
            <p class="text-sm text-gray-500 dark:text-gray-400 ml-6">
              Let users choose which AI model to use for second opinions
            </p>
          </div>

          <div>
            <label class="block text-gray-700 dark:text-gray-300 font-medium mb-2">
              Default Selection Strategy
            </label>
            <select
              bind:value={defaultStrategy}
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="priority">Priority-based</option>
              <option value="cost">Cost-optimized</option>
              <option value="performance">Performance-based</option>
              <option value="round-robin">Round-robin</option>
              <option value="random">Random</option>
            </select>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              How to automatically select alternative providers
            </p>
          </div>

          <div>
            <label class="block text-gray-700 dark:text-gray-300 font-medium mb-2">
              Provider Priorities
            </label>
            <div class="space-y-2">
              {#each Object.entries(providerPriorities) as [provider, priority]}
                <div class="flex items-center gap-4">
                  <span class="w-24 text-gray-700 dark:text-gray-300 capitalize">{provider}</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={priority}
                    on:input={(e) => updateProviderPriority(provider, e.target.value)}
                    class="w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    (1 = highest priority)
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- Rate Limiting -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Rate Limiting</h2>

        <div class="space-y-4">
          <div>
            <label class="flex items-center gap-2 mb-2">
              <input type="checkbox" bind:checked={rateLimitEnabled} class="rounded" />
              <span class="text-gray-700 dark:text-gray-300 font-medium">Enable Rate Limiting</span>
            </label>
            <p class="text-sm text-gray-500 dark:text-gray-400 ml-6">
              Limit the number of second opinion requests per user
            </p>
          </div>

          {#if rateLimitEnabled}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div>
                <label class="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                  Max Requests per Hour
                </label>
                <input
                  type="number"
                  min="1"
                  bind:value={maxRequestsPerHour}
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label class="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                  Max Requests per Day
                </label>
                <input
                  type="number"
                  min="1"
                  bind:value={maxRequestsPerDay}
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Divergence Detection -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Divergence Detection
        </h2>

        <div class="space-y-4">
          <div>
            <label class="flex items-center gap-2 mb-2">
              <input type="checkbox" bind:checked={divergenceEnabled} class="rounded" />
              <span class="text-gray-700 dark:text-gray-300 font-medium"
                >Enable Divergence Detection</span
              >
            </label>
            <p class="text-sm text-gray-500 dark:text-gray-400 ml-6">
              Analyze and highlight differences between opinions
            </p>
          </div>

          {#if divergenceEnabled}
            <div class="space-y-3 ml-6">
              <div>
                <label class="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                  Low Divergence Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  bind:value={divergenceThresholdLow}
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Similarity above this threshold = low divergence (0-1)
                </p>
              </div>

              <div>
                <label class="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                  Medium Divergence Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  bind:value={divergenceThresholdMedium}
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Similarity above this threshold = medium divergence (0-1)
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Performance Settings -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Performance Settings
        </h2>

        <div>
          <label class="block text-gray-700 dark:text-gray-300 font-medium mb-2">
            Generation Timeout (ms)
          </label>
          <input
            type="number"
            min="5000"
            max="120000"
            step="1000"
            bind:value={generationTimeout}
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Maximum time to wait for second opinion generation
          </p>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end gap-4">
        <button
          on:click={loadConfig}
          disabled={saving}
          class="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Reset
        </button>
        <button
          on:click={saveConfig}
          disabled={saving}
          class="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {#if saving}
            <RefreshCw class="w-5 h-5 animate-spin" />
            Saving...
          {:else}
            <Save class="w-5 h-5" />
            Save Configuration
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
