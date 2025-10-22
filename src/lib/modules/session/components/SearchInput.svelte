<script>
  import { createEventDispatcher, onMount } from 'svelte';

  export let value = '';
  export let placeholder = 'Search sessions...';
  export let debounceMs = 300;

  const dispatch = createEventDispatcher();
  let inputElement;
  let debounceTimer;

  function handleInput(event) {
    const newValue = event.target.value;
    value = newValue;

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    debounceTimer = setTimeout(() => {
      dispatch('search', newValue);
    }, debounceMs);
  }

  function handleClear() {
    value = '';
    dispatch('search', '');
    inputElement?.focus();
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleClear();
    }
  }

  onMount(() => {
    // Focus search on '/' key press
    const handleGlobalKeydown = (event) => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Only if not already focused on an input
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          event.preventDefault();
          inputElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  });
</script>

<div class="search-input" role="search">
  <span class="search-icon" aria-hidden="true">🔍</span>
  <input
    bind:this={inputElement}
    type="text"
    {placeholder}
    {value}
    on:input={handleInput}
    on:keydown={handleKeydown}
    role="searchbox"
    aria-label="Search sessions"
    aria-describedby="search-help"
  />
  {#if value}
    <button class="clear-button" on:click={handleClear} aria-label="Clear search" type="button">
      ✕
    </button>
  {/if}
  <span id="search-help" class="sr-only"> Press / to focus search. Press Escape to clear. </span>
</div>

<style>
  .search-input {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    height: 44px;
    transition: border-color 0.2s ease;
  }

  .search-input:focus-within {
    border-color: #ff9800;
    box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
  }

  .search-icon {
    font-size: 16px;
    color: #999;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    color: #333;
    background: transparent;
    min-width: 0;
  }

  input::placeholder {
    color: #999;
  }

  .clear-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: #f5f5f5;
    border-radius: 50%;
    color: #666;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    font-size: 14px;
    line-height: 1;
  }

  .clear-button:hover {
    background: #e5e5e5;
    color: #333;
  }

  .clear-button:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .search-input {
      padding: 0 15px;
      height: 40px;
    }

    input {
      font-size: 16px; /* Prevents zoom on iOS */
    }
  }
</style>
