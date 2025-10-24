<script>
  import { selectedLanguage, languages } from '../stores';
  import { Globe } from 'lucide-svelte';

  let isOpen = false;

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function selectLanguage(langCode) {
    selectedLanguage.set(langCode);
    isOpen = false;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (isOpen && !event.target.closest('.language-toggle')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="language-toggle relative">
  <button
    on:click|stopPropagation={toggleDropdown}
    class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-gray-700"
    aria-label="Select language"
    title="Select language"
  >
    <Globe class="w-5 h-5 text-stone-600 dark:text-gray-300" />
    <span class="text-sm font-medium text-stone-600 dark:text-gray-300 uppercase">
      {$selectedLanguage}
    </span>
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-stone-200 dark:border-gray-700 py-1 z-50"
    >
      {#each languages as lang}
        <button
          on:click={() => selectLanguage(lang.code)}
          class="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-stone-100 dark:hover:bg-gray-700 flex items-center justify-between {$selectedLanguage ===
          lang.code
            ? 'text-amber-600 dark:text-amber-400 font-medium'
            : 'text-stone-700 dark:text-gray-300'}"
        >
          <span>{lang.name}</span>
          {#if $selectedLanguage === lang.code}
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .language-toggle {
    position: relative;
  }
</style>
