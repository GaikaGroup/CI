<script>
  import { page } from '$app/stores';
  import { ChevronDown, LayoutDashboard } from 'lucide-svelte';

  let showDropdown = false;

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function closeDropdown() {
    showDropdown = false;
  }

  // Check if current page is a Console page
  $: isConsolePage = $page.url.pathname.startsWith('/admin/');
  $: currentPath = $page.url.pathname;
</script>

<div class="relative">
  <button
    on:click={toggleDropdown}
    class="flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors {isConsolePage
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-stone-600 hover:text-amber-700 dark:text-gray-300 dark:hover:text-amber-400'}"
  >
    <LayoutDashboard class="w-4 h-4" />
    Console
    <ChevronDown class="w-3 h-3" />
  </button>

  {#if showDropdown}
    <div
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border dark:border-gray-700 border-stone-200"
    >
      <a
        href="/admin/users"
        on:click={closeDropdown}
        class="block px-4 py-2 text-sm transition-colors {currentPath === '/admin/users'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium'
          : 'text-stone-700 hover:bg-stone-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
      >
        Users
      </a>
      <a
        href="/admin/finance"
        on:click={closeDropdown}
        class="block px-4 py-2 text-sm transition-colors {currentPath === '/admin/finance'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium'
          : 'text-stone-700 hover:bg-stone-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
      >
        Finance
      </a>
      <a
        href="/admin/analytics"
        on:click={closeDropdown}
        class="block px-4 py-2 text-sm transition-colors {currentPath === '/admin/analytics'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium'
          : 'text-stone-700 hover:bg-stone-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
      >
        Analytics
      </a>
    </div>
  {/if}
</div>

<style>
  /* Ensure dropdown appears above other elements */
  .relative {
    z-index: 50;
  }
</style>
