<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, slide } from 'svelte/transition';

  export let commands = [];
  export let visible = false;

  const dispatch = createEventDispatcher();
  let selectedIndex = 0;
  let menuElement;

  // Reset selected index when commands change
  $: if (commands) {
    selectedIndex = 0;
  }

  function selectCommand(command) {
    dispatch('select', command);
  }

  function handleKeyDown(event) {
    if (!visible) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % commands.length;
        scrollToSelected();
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = (selectedIndex - 1 + commands.length) % commands.length;
        scrollToSelected();
        break;
      case 'Enter':
        event.preventDefault();
        if (commands[selectedIndex]) {
          selectCommand(commands[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        dispatch('close');
        break;
    }
  }

  function scrollToSelected() {
    if (menuElement) {
      const selectedElement = menuElement.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function handleClickOutside(event) {
    if (visible && menuElement && !menuElement.contains(event.target)) {
      dispatch('close');
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

{#if visible && commands.length > 0}
  <div
    bind:this={menuElement}
    class="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 rounded-lg shadow-lg z-50"
    transition:slide={{ duration: 200 }}
  >
    <div class="p-2">
      <div class="text-xs font-semibold text-stone-500 dark:text-gray-400 px-3 py-2">
        Available Commands
      </div>
      {#each commands as command, index}
        <button
          data-index={index}
          on:click={() => selectCommand(command)}
          on:mouseenter={() => (selectedIndex = index)}
          class="w-full text-left px-3 py-2 rounded-md transition-colors {index === selectedIndex
            ? 'bg-amber-100 dark:bg-amber-900/30'
            : 'hover:bg-stone-100 dark:hover:bg-gray-700'}"
        >
          <div class="flex items-start gap-2">
            <span
              class="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400 flex-shrink-0"
            >
              {command.name}
            </span>
            <span class="text-sm text-stone-600 dark:text-gray-300 flex-1">
              {command.description}
            </span>
          </div>
        </button>
      {/each}
    </div>
    <div
      class="border-t border-stone-200 dark:border-gray-700 px-3 py-2 text-xs text-stone-500 dark:text-gray-400"
    >
      <div class="flex items-center justify-between">
        <span>↑↓ Navigate</span>
        <span>Enter Select</span>
        <span>Esc Close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for the menu */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .dark .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  .dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
