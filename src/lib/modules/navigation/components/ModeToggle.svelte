<script>
  import { appMode } from '$lib/stores/mode';
  import { createEventDispatcher } from 'svelte';

  export let size = 'normal';
  const dispatch = createEventDispatcher();

  function handleClick(mode) {
    dispatch('change', { mode });
  }
</script>

<div
  class={`relative flex items-center rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden
    ${size === 'compact' ? 'w-24 h-8' : 'w-32 h-10'}
    p-0`}
>
  <span
    class={`absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300
      ease-[cubic-bezier(0.4,0,0.2,1)]
      ${$appMode === 'fun' ? 'translate-x-0' : 'translate-x-full'}
      bg-amber-500
    `}
  />
  <button
    on:click={() => handleClick('fun')}
    class={`relative z-10 flex-1 flex items-center justify-center gap-1 text-sm font-medium
      transition-transform duration-300 hover:scale-105
      ${$appMode === 'fun' ? 'text-white' : 'text-stone-600 dark:text-gray-300'}`}
  >
    <span class={$appMode === 'fun' ? 'animate-bounce' : ''}>🎮</span>
    <span>Fun</span>
  </button>
  <button
    on:click={() => handleClick('learn')}
    class={`relative z-10 flex-1 flex items-center justify-center gap-1 text-sm font-medium
      transition-transform duration-300 hover:scale-105
      ${$appMode === 'learn' ? 'text-white' : 'text-stone-600 dark:text-gray-300'}`}
  >
    <span class={$appMode === 'learn' ? 'animate-bounce' : ''}>📚</span>
    <span>Learn</span>
  </button>
</div>
