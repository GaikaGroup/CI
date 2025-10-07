<script>
  import { Moon, Sun } from 'lucide-svelte';
  import { darkMode } from '../stores';

  export let size = 20;
  export let buttonClass = '';
</script>

<button
  on:click={() => ($darkMode = !$darkMode)}
  class="p-2 rounded-lg transition-colors {buttonClass} {$darkMode
    ? 'text-gray-300 hover:text-amber-400 hover:bg-gray-700'
    : 'text-stone-600 hover:text-amber-700 hover:bg-stone-100'}"
  aria-label={$darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if $darkMode}
    <Sun {size} />
  {:else}
    <Moon {size} />
  {/if}
</button>
