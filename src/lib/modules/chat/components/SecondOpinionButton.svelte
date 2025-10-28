<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Loader, RefreshCw, ChevronDown } from 'lucide-svelte';
  import { SECOND_OPINION_CONFIG } from '$lib/config/secondOpinion.js';
  import ModelSelector from './ModelSelector.svelte';

  export let messageId;
  export let primaryProvider;
  export let disabled = false;
  export let loading = false;
  export let opinionCount = 0;

  const dispatch = createEventDispatcher();

  let showModelSelector = false;
  let selectedProvider = null;
  let availableProviders = [];
  let fetchingProviders = true;

  // Fetch available providers on mount
  onMount(async () => {
    try {
      console.log('[SecondOpinionButton] Fetching providers, excluding:', primaryProvider);
      const response = await fetch(
        `/api/chat/available-providers?excludeProvider=${primaryProvider}`
      );
      if (response.ok) {
        const result = await response.json();
        console.log('[SecondOpinionButton] API response:', result);

        // Extract providers from nested structure
        if (result.success && result.data && result.data.providers) {
          // Filter to only available providers
          availableProviders = result.data.providers.filter((p) => p.available);
          console.log('[SecondOpinionButton] Available providers:', availableProviders);
        } else {
          availableProviders = [];
        }
      } else {
        console.error('[SecondOpinionButton] API error:', response.status, response.statusText);
        availableProviders = [];
      }
    } catch (error) {
      console.error('[SecondOpinionButton] Error fetching available providers:', error);
      availableProviders = [];
    } finally {
      fetchingProviders = false;
      console.log('[SecondOpinionButton] Final state:', {
        availableProviders: availableProviders.length,
        hasAlternatives: availableProviders.length > 0,
        buttonDisabled: disabled || loading || fetchingProviders || availableProviders.length === 0
      });
    }
  });

  function handleClick() {
    if (disabled || loading) return;

    if (SECOND_OPINION_CONFIG.ALLOW_MANUAL_SELECTION && availableProviders.length > 1) {
      showModelSelector = !showModelSelector;
    } else {
      requestOpinion();
    }
  }

  function requestOpinion(provider = null) {
    dispatch('request', { messageId, provider });
    showModelSelector = false;
  }

  function handleProviderSelect(event) {
    selectedProvider = event.detail.provider;
    requestOpinion(selectedProvider);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  $: hasAlternatives = availableProviders.length > 0;
  $: buttonDisabled = disabled || loading || fetchingProviders || !hasAlternatives;
  $: tooltipText = fetchingProviders
    ? 'Checking available models...'
    : loading
      ? 'Generating second opinion...'
      : !hasAlternatives
        ? 'No alternative models available'
        : opinionCount > 0
          ? `${opinionCount} opinion${opinionCount > 1 ? 's' : ''} available`
          : 'Get a second opinion from a different AI model';
</script>

<div class="second-opinion-button-container">
  <button
    class="second-opinion-btn"
    class:disabled={buttonDisabled}
    class:loading
    on:click={handleClick}
    on:keydown={handleKeyDown}
    disabled={buttonDisabled}
    title={tooltipText}
    aria-label={tooltipText}
    tabindex="0"
  >
    {#if loading}
      <Loader class="w-4 h-4 animate-spin" />
    {:else}
      <RefreshCw class="w-4 h-4" />
    {/if}

    <span class="button-text">
      {#if opinionCount > 0}
        {opinionCount} {opinionCount > 1 ? 'Opinions' : 'Opinion'}
      {:else}
        Get Second Opinion
      {/if}
    </span>

    {#if opinionCount > 0}
      <span class="opinion-badge">{opinionCount}</span>
    {/if}

    {#if SECOND_OPINION_CONFIG.ALLOW_MANUAL_SELECTION && availableProviders.length > 1 && !loading}
      <ChevronDown class="w-3 h-3 ml-1" />
    {/if}
  </button>

  {#if showModelSelector && SECOND_OPINION_CONFIG.ALLOW_MANUAL_SELECTION}
    <div class="model-selector-dropdown">
      <ModelSelector
        {availableProviders}
        excludeProvider={primaryProvider}
        on:select={handleProviderSelect}
        on:close={() => (showModelSelector = false)}
      />
    </div>
  {/if}
</div>

<style>
  .second-opinion-button-container {
    position: relative;
    display: inline-block;
  }

  .second-opinion-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: none;
    border: 1px solid currentColor;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: currentColor;
    opacity: 0.6;
    transition: all 0.2s ease;
    position: relative;
  }

  .second-opinion-btn:hover:not(.disabled) {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .second-opinion-btn:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    opacity: 1;
  }

  .second-opinion-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .second-opinion-btn.loading {
    opacity: 0.7;
    cursor: wait;
  }

  .button-text {
    font-weight: 500;
    white-space: nowrap;
  }

  .opinion-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    background: currentColor;
    color: white;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .model-selector-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    z-index: 50;
    min-width: 16rem;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .button-text {
      display: none;
    }

    .second-opinion-btn {
      padding: 0.5rem;
    }

    .model-selector-dropdown {
      right: 0;
      left: auto;
    }
  }
</style>
