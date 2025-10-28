<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Loader, Search, X, Check } from 'lucide-svelte';
  import { darkMode } from '$modules/theme/stores';

  export let availableProviders = [];
  export let excludeProvider = '';

  const dispatch = createEventDispatcher();

  let loading = true;
  let error = null;
  let providers = [];
  let searchQuery = '';
  let selectedProvider = null;

  onMount(async () => {
    await fetchProviders();
  });

  async function fetchProviders() {
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams();
      if (excludeProvider) {
        params.append('excludeProvider', excludeProvider);
      }

      const response = await fetch(`/api/chat/available-providers?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch providers');
      }

      providers = result.data.providers || [];
    } catch (err) {
      console.error('Error fetching providers:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function handleSelect(provider, model = null) {
    selectedProvider = provider.name;
    dispatch('select', {
      provider: provider.name,
      model: model?.id || null
    });
  }

  function handleClose() {
    dispatch('close');
  }

  function handleKeyDown(event, action) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    } else if (event.key === 'Escape') {
      handleClose();
    }
  }

  $: filteredProviders = providers.filter((provider) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = provider.displayName?.toLowerCase().includes(query);
    const modelMatch = provider.models?.some((model) => model.name?.toLowerCase().includes(query));

    return nameMatch || modelMatch;
  });
</script>

<div class="model-selector" class:dark={$darkMode}>
  <!-- Header -->
  <div class="selector-header">
    <h3 class="selector-title">Select Model</h3>
    <button
      class="close-btn"
      on:click={handleClose}
      on:keydown={(e) => handleKeyDown(e, handleClose)}
      aria-label="Close model selector"
    >
      <X class="w-4 h-4" />
    </button>
  </div>

  <!-- Search -->
  <div class="search-container">
    <Search class="search-icon w-4 h-4" />
    <input
      type="text"
      class="search-input"
      placeholder="Search models..."
      bind:value={searchQuery}
      aria-label="Search models"
    />
  </div>

  <!-- Content -->
  <div class="selector-content">
    {#if loading}
      <div class="loading-state">
        <Loader class="w-6 h-6 animate-spin" />
        <p>Loading models...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p class="error-message">{error}</p>
        <button class="retry-btn" on:click={fetchProviders}>Retry</button>
      </div>
    {:else if filteredProviders.length === 0}
      <div class="empty-state">
        <p>
          {searchQuery ? 'No models found matching your search' : 'No alternative models available'}
        </p>
      </div>
    {:else}
      <div class="providers-list">
        {#each filteredProviders as provider}
          <div class="provider-group">
            <div class="provider-header">
              <h4 class="provider-name">{provider.displayName || provider.name}</h4>
              {#if !provider.available}
                <span class="unavailable-badge">Unavailable</span>
              {/if}
            </div>

            {#if provider.models && provider.models.length > 0}
              <div class="models-list">
                {#each provider.models as model}
                  <button
                    class="model-item"
                    class:selected={selectedProvider === provider.name}
                    class:disabled={!provider.available}
                    on:click={() => handleSelect(provider, model)}
                    on:keydown={(e) => handleKeyDown(e, () => handleSelect(provider, model))}
                    disabled={!provider.available}
                    aria-label="Select {model.name}"
                  >
                    <div class="model-info">
                      <div class="model-name">{model.name}</div>
                      {#if model.description}
                        <div class="model-description">{model.description}</div>
                      {/if}
                      {#if model.capabilities && model.capabilities.length > 0}
                        <div class="model-capabilities">
                          {#each model.capabilities as capability}
                            <span class="capability-badge">{capability}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    {#if selectedProvider === provider.name}
                      <Check class="w-4 h-4 text-purple-500" />
                    {/if}
                  </button>
                {/each}
              </div>
            {:else}
              <button
                class="model-item"
                class:selected={selectedProvider === provider.name}
                class:disabled={!provider.available}
                on:click={() => handleSelect(provider)}
                on:keydown={(e) => handleKeyDown(e, () => handleSelect(provider))}
                disabled={!provider.available}
                aria-label="Select {provider.displayName || provider.name}"
              >
                <div class="model-info">
                  <div class="model-name">Default Model</div>
                </div>
                {#if selectedProvider === provider.name}
                  <Check class="w-4 h-4 text-purple-500" />
                {/if}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .model-selector {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    max-height: 32rem;
    display: flex;
    flex-direction: column;
  }

  .model-selector.dark {
    background: #1f2937;
    border-color: #374151;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }

  .selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .dark .selector-header {
    border-bottom-color: #374151;
  }

  .selector-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: #111827;
  }

  .dark .selector-title {
    color: #f9fafb;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: #6b7280;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #111827;
  }

  .dark .close-btn:hover {
    color: #f9fafb;
  }

  .close-btn:focus {
    outline: 2px solid #a855f7;
    outline-offset: 2px;
    border-radius: 0.25rem;
  }

  .search-container {
    position: relative;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .dark .search-container {
    border-bottom-color: #374151;
  }

  .search-icon {
    position: absolute;
    left: 1.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: white;
    color: #111827;
    transition: border-color 0.2s;
  }

  .dark .search-input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .search-input:focus {
    outline: none;
    border-color: #a855f7;
  }

  .selector-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #6b7280;
  }

  .loading-state {
    gap: 0.75rem;
  }

  .error-message {
    color: #ef4444;
    margin-bottom: 0.75rem;
  }

  .retry-btn {
    padding: 0.5rem 1rem;
    background: #a855f7;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .retry-btn:hover {
    background: #9333ea;
  }

  .providers-list {
    padding: 0.5rem;
  }

  .provider-group {
    margin-bottom: 1rem;
  }

  .provider-group:last-child {
    margin-bottom: 0;
  }

  .provider-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.25rem;
  }

  .provider-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }

  .dark .provider-name {
    color: #d1d5db;
  }

  .unavailable-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: #fef3c7;
    color: #92400e;
    border-radius: 9999px;
    font-weight: 500;
  }

  .dark .unavailable-badge {
    background: #78350f;
    color: #fef3c7;
  }

  .models-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .model-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem;
    background: none;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    width: 100%;
  }

  .dark .model-item {
    border-color: #374151;
  }

  .model-item:hover:not(.disabled) {
    background: #f9fafb;
    border-color: #a855f7;
  }

  .dark .model-item:hover:not(.disabled) {
    background: #374151;
    border-color: #a855f7;
  }

  .model-item:focus {
    outline: 2px solid #a855f7;
    outline-offset: 2px;
  }

  .model-item.selected {
    background: rgba(168, 85, 247, 0.1);
    border-color: #a855f7;
  }

  .model-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .model-info {
    flex: 1;
    min-width: 0;
  }

  .model-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
    margin-bottom: 0.25rem;
  }

  .dark .model-name {
    color: #f9fafb;
  }

  .model-description {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }

  .dark .model-description {
    color: #9ca3af;
  }

  .model-capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .capability-badge {
    font-size: 0.6875rem;
    padding: 0.125rem 0.375rem;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 0.25rem;
    font-weight: 500;
  }

  .dark .capability-badge {
    background: #312e81;
    color: #c7d2fe;
  }

  /* Scrollbar styling */
  .selector-content::-webkit-scrollbar {
    width: 0.5rem;
  }

  .selector-content::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  .dark .selector-content::-webkit-scrollbar-track {
    background: #1f2937;
  }

  .selector-content::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 0.25rem;
  }

  .dark .selector-content::-webkit-scrollbar-thumb {
    background: #4b5563;
  }

  .selector-content::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  .dark .selector-content::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
</style>
