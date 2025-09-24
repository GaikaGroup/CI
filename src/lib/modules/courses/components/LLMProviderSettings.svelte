<script>
  import { createEventDispatcher } from 'svelte';
  import Button from '$shared/components/Button.svelte';

  export let llmSettings = {
    allowOpenAI: true,
    preferredProvider: 'ollama',
    fallbackEnabled: true
  };
  export let availableProviders = ['ollama', 'openai'];
  export let providerStatus = {};
  export let readonly = false;

  const dispatch = createEventDispatcher();

  let showAdvanced = false;

  $: filteredProviders = llmSettings.allowOpenAI
    ? availableProviders
    : availableProviders.filter((p) => p !== 'openai');

  const handleSettingsChange = () => {
    // Ensure preferred provider is valid when OpenAI is disabled
    if (!llmSettings.allowOpenAI && llmSettings.preferredProvider === 'openai') {
      llmSettings.preferredProvider = 'ollama';
    }

    dispatch('change', llmSettings);
  };

  const getProviderLabel = (provider) => {
    const labels = {
      ollama: 'Local LLM (Ollama)',
      openai: 'OpenAI',
      anthropic: 'Anthropic Claude',
      cohere: 'Cohere'
    };
    return labels[provider] || provider;
  };

  const getProviderStatus = (provider) => {
    return providerStatus[provider] || { available: false, checking: false };
  };

  const getProviderStatusIcon = (provider) => {
    const status = getProviderStatus(provider);
    if (status.checking) {
      return '⏳';
    }
    return status.available ? '✅' : '❌';
  };

  const getProviderStatusText = (provider) => {
    const status = getProviderStatus(provider);
    if (status.checking) {
      return 'Checking...';
    }
    return status.available ? 'Available' : 'Unavailable';
  };

  const checkProviderStatus = () => {
    dispatch('check-providers');
  };

  const resetToDefaults = () => {
    llmSettings = {
      allowOpenAI: true,
      preferredProvider: 'ollama',
      fallbackEnabled: true
    };
    handleSettingsChange();
  };
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white">AI Provider Settings</h3>
      <p class="text-sm text-stone-600 dark:text-gray-400 mt-1">
        Configure which AI providers can be used for this subject
      </p>
    </div>

    {#if !readonly}
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" on:click={checkProviderStatus}>Check Status</Button>
        <Button variant="secondary" size="sm" on:click={resetToDefaults}>Reset</Button>
      </div>
    {/if}
  </div>

  <!-- Main Settings -->
  <div class="space-y-4">
    <!-- OpenAI Permission -->
    <div class="flex items-start space-x-3">
      <div class="flex items-center h-5">
        <input
          type="checkbox"
          id="allowOpenAI"
          bind:checked={llmSettings.allowOpenAI}
          on:change={handleSettingsChange}
          disabled={readonly}
          class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
        />
      </div>
      <div class="flex-1">
        <label for="allowOpenAI" class="text-sm font-medium text-stone-700 dark:text-gray-300">
          Allow OpenAI API usage
        </label>
        <p class="text-xs text-stone-500 dark:text-gray-400 mt-1">
          When enabled, this subject can use OpenAI's API. When disabled, only local providers will
          be used.
        </p>
      </div>
    </div>

    <!-- Privacy Notice -->
    {#if !llmSettings.allowOpenAI}
      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Privacy Mode Active:</strong> This subject will only use local AI providers. No conversation
            data will be sent to external APIs.
          </div>
        </div>
      </div>
    {/if}

    <!-- Preferred Provider -->
    <div>
      <label
        for="preferred-provider"
        class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
      >
        Preferred Provider
      </label>
      <select
        id="preferred-provider"
        bind:value={llmSettings.preferredProvider}
        on:change={handleSettingsChange}
        disabled={readonly}
        class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400 disabled:opacity-50"
      >
        {#each filteredProviders as provider}
          <option value={provider}>
            {getProviderLabel(provider)}
          </option>
        {/each}
      </select>
      <p class="text-xs text-stone-500 dark:text-gray-400 mt-1">
        The system will try to use this provider first
      </p>
    </div>

    <!-- Fallback Setting -->
    <div class="flex items-start space-x-3">
      <div class="flex items-center h-5">
        <input
          type="checkbox"
          id="fallbackEnabled"
          bind:checked={llmSettings.fallbackEnabled}
          on:change={handleSettingsChange}
          disabled={readonly}
          class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
        />
      </div>
      <div class="flex-1">
        <label for="fallbackEnabled" class="text-sm font-medium text-stone-700 dark:text-gray-300">
          Enable fallback to other providers
        </label>
        <p class="text-xs text-stone-500 dark:text-gray-400 mt-1">
          If the preferred provider is unavailable, try other allowed providers
        </p>
      </div>
    </div>
  </div>

  <!-- Provider Status -->
  <div>
    <button
      on:click={() => (showAdvanced = !showAdvanced)}
      class="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition-colors"
    >
      <svg
        class="w-4 h-4 transition-transform {showAdvanced ? 'rotate-90' : ''}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      Provider Status & Advanced Settings
    </button>

    {#if showAdvanced}
      <div class="mt-4 space-y-4">
        <!-- Provider Status List -->
        <div class="bg-stone-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 class="text-sm font-medium text-stone-900 dark:text-white mb-3">
            Provider Availability
          </h4>
          <div class="space-y-2">
            {#each availableProviders as provider}
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{getProviderStatusIcon(provider)}</span>
                  <span class="text-stone-700 dark:text-gray-300">
                    {getProviderLabel(provider)}
                  </span>
                  {#if !llmSettings.allowOpenAI && provider === 'openai'}
                    <span
                      class="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full"
                    >
                      Disabled
                    </span>
                  {/if}
                </div>
                <span class="text-stone-500 dark:text-gray-400">
                  {getProviderStatusText(provider)}
                </span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Configuration Summary -->
        <div class="bg-stone-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 class="text-sm font-medium text-stone-900 dark:text-white mb-3">
            Current Configuration
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-stone-600 dark:text-gray-400">External APIs:</span>
              <span
                class="font-medium {llmSettings.allowOpenAI
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'}"
              >
                {llmSettings.allowOpenAI ? 'Allowed' : 'Local Only'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-600 dark:text-gray-400">Preferred Provider:</span>
              <span class="font-medium text-stone-900 dark:text-white">
                {getProviderLabel(llmSettings.preferredProvider)}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-600 dark:text-gray-400">Fallback:</span>
              <span class="font-medium text-stone-900 dark:text-white">
                {llmSettings.fallbackEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        <!-- Warnings -->
        {#if !llmSettings.allowOpenAI && !getProviderStatus('ollama').available}
          <div
            class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="text-sm text-amber-800 dark:text-amber-200">
                <strong>Warning:</strong> No local providers are available. This subject may not work
                properly until a local LLM provider is set up.
              </div>
            </div>
          </div>
        {/if}

        {#if llmSettings.preferredProvider && !getProviderStatus(llmSettings.preferredProvider).available}
          <div
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="text-sm text-red-800 dark:text-red-200">
                <strong>Error:</strong> Your preferred provider ({getProviderLabel(
                  llmSettings.preferredProvider
                )}) is not available.
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Help Text -->
  <div class="bg-stone-50 dark:bg-gray-900 rounded-lg p-4">
    <h4 class="text-sm font-medium text-stone-900 dark:text-white mb-2">About AI Providers</h4>
    <div class="text-xs text-stone-600 dark:text-gray-400 space-y-2">
      <p>
        <strong>Local LLM (Ollama):</strong> Runs on your local machine. Provides privacy and doesn't
        require internet connectivity for inference.
      </p>
      <p>
        <strong>OpenAI:</strong> Cloud-based service that provides high-quality responses but sends data
        to external servers.
      </p>
      <p>
        <strong>Privacy Mode:</strong> When OpenAI is disabled, all processing happens locally, ensuring
        your conversations remain private.
      </p>
    </div>
  </div>
</div>
