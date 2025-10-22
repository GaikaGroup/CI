<script context="module">
  import { fade, slide } from 'svelte/transition';
</script>

<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { getAllCommandTypes } from '../utils/commandTypes.js';

  export let isOpen = false;
  export let selectedCommands = [];
  export let language = 'en';

  const dispatch = createEventDispatcher();
  let panelElement;
  let firstFocusableElement;
  let lastFocusableElement;
  let previousActiveElement;

  $: commandTypes = getAllCommandTypes();
  $: allSelected = selectedCommands.length === commandTypes.length;
  $: someSelected = selectedCommands.length > 0 && !allSelected;

  function toggleCommand(commandId) {
    if (selectedCommands.includes(commandId)) {
      selectedCommands = selectedCommands.filter((id) => id !== commandId);
    } else {
      selectedCommands = [...selectedCommands, commandId];
    }
  }

  function toggleAll() {
    if (allSelected) {
      selectedCommands = [];
    } else {
      selectedCommands = commandTypes.map((cmd) => cmd.id);
    }
  }

  function handleApply() {
    dispatch('apply', selectedCommands);
    close();
  }

  function handleClear() {
    selectedCommands = [];
  }

  function close() {
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'Tab') {
      // Trap focus within panel
      if (event.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          event.preventDefault();
          lastFocusableElement?.focus();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          event.preventDefault();
          firstFocusableElement?.focus();
        }
      }
    }
  }

  function setupFocusTrap() {
    if (!panelElement) return;

    const focusableElements = panelElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    firstFocusableElement = focusableElements[0];
    lastFocusableElement = focusableElements[focusableElements.length - 1];

    // Store current focus to return to it later
    previousActiveElement = document.activeElement;

    // Focus first element
    firstFocusableElement?.focus();
  }

  function restoreFocus() {
    previousActiveElement?.focus();
  }

  $: if (isOpen) {
    setTimeout(setupFocusTrap, 0);
  } else if (previousActiveElement) {
    restoreFocus();
  }

  onMount(() => {
    if (isOpen) {
      setupFocusTrap();
    }
  });

  onDestroy(() => {
    if (previousActiveElement) {
      restoreFocus();
    }
  });
</script>

{#if isOpen}
  <div class="overlay" on:click={close} transition:fade={{ duration: 200 }}></div>

  <div
    bind:this={panelElement}
    class="command-filter-panel"
    role="dialog"
    aria-modal="true"
    aria-label="Filter by commands"
    on:keydown={handleKeydown}
    transition:slide={{ duration: 200 }}
  >
    <div class="panel-header">
      <h3>Filter by Commands</h3>
      <button class="close-button" on:click={close} aria-label="Close filter panel"> ✕ </button>
    </div>

    <div class="panel-content">
      <!-- Select All Option -->
      <label class="command-option all-option">
        <input
          type="checkbox"
          checked={allSelected}
          indeterminate={someSelected}
          on:change={toggleAll}
          aria-label="Select all commands"
        />
        <span class="command-label">
          <span class="command-emoji">✨</span>
          <span class="command-name">All Commands</span>
        </span>
      </label>

      <div class="divider"></div>

      <!-- Individual Command Options -->
      {#each commandTypes as command}
        <label class="command-option">
          <input
            type="checkbox"
            checked={selectedCommands.includes(command.id)}
            on:change={() => toggleCommand(command.id)}
            aria-label="{command.id} command"
          />
          <span class="command-label">
            <span class="command-emoji">{command.emoji}</span>
            <span class="command-name">{command.id}</span>
          </span>
          <span class="command-badge" style="background-color: {command.color}"></span>
        </label>
      {/each}
    </div>

    <div class="panel-footer">
      <button class="clear-button" on:click={handleClear} disabled={selectedCommands.length === 0}>
        Clear
      </button>
      <button class="apply-button" on:click={handleApply}>
        Apply ({selectedCommands.length})
      </button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  .command-filter-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid #e5e5e5;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #f5f5f5;
    border-radius: 50%;
    color: #666;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 16px;
  }

  .close-button:hover {
    background: #e5e5e5;
    color: #333;
  }

  .close-button:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    min-height: 300px;
  }

  /* Custom scrollbar for better UX */
  .panel-content::-webkit-scrollbar {
    width: 8px;
  }

  .panel-content::-webkit-scrollbar-track {
    background: #f5f5f5;
    border-radius: 4px;
  }

  .panel-content::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }

  .panel-content::-webkit-scrollbar-thumb:hover {
    background: #999;
  }

  .command-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease;
    user-select: none;
  }

  .command-option:hover {
    background: #f5f5f5;
  }

  .command-option.all-option {
    font-weight: 600;
  }

  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #ff9800;
  }

  .command-label {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .command-emoji {
    font-size: 20px;
  }

  .command-name {
    font-size: 14px;
    color: #333;
    text-transform: capitalize;
  }

  .command-badge {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .divider {
    height: 1px;
    background: #e5e5e5;
    margin: 8px 0;
  }

  .panel-footer {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e5e5e5;
  }

  .clear-button,
  .apply-button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-button {
    background: #f5f5f5;
    color: #666;
  }

  .clear-button:hover:not(:disabled) {
    background: #e5e5e5;
    color: #333;
  }

  .clear-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .apply-button {
    background: #ff9800;
    color: white;
  }

  .apply-button:hover {
    background: #f57c00;
  }

  .clear-button:focus-visible,
  .apply-button:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  /* Mobile Styles */
  @media (max-width: 768px) {
    .command-filter-panel {
      width: 100%;
      max-width: none;
      height: 100%;
      max-height: none;
      top: 0;
      left: 0;
      transform: none;
      border-radius: 0;
    }

    .panel-header {
      padding: 16px;
    }

    .panel-content {
      padding: 12px 16px;
    }

    .panel-footer {
      padding: 12px 16px;
    }
  }

  /* Desktop Dropdown Style */
  @media (min-width: 769px) {
    .command-filter-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: auto;
      right: 0;
      transform: none;
      max-height: 600px;
      min-width: 320px;
      max-width: 420px;
    }

    .panel-content {
      max-height: 450px;
    }

    .overlay {
      display: none;
    }
  }
</style>
