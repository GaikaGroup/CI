<script>
  import { User } from 'lucide-svelte';
  import { isAuthenticated, user, logout } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  export let buttonClass = '';

  let showDropdown = false;

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function handleLogout() {
    logout();
    showDropdown = false;
  }
</script>

{#if $isAuthenticated}
  <div class="relative">
    <button on:click={toggleDropdown} class="flex items-center space-x-1 {buttonClass}">
      <User size={18} />
      <span class="hidden md:inline">{$user.name}</span>
    </button>

    {#if showDropdown}
      <div
        class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border dark:border-gray-700 border-stone-200"
      >
        <div class="px-4 py-2 text-sm font-medium border-b dark:border-gray-700 border-stone-200">
          {$user.email}
        </div>
        <a
          href="/profile"
          class="block px-4 py-2 text-sm dark:text-gray-300 dark:hover:bg-gray-700 text-stone-700 hover:bg-stone-100"
        >
          Profile
        </a>
        <a
          href="/settings"
          class="block px-4 py-2 text-sm dark:text-gray-300 dark:hover:bg-gray-700 text-stone-700 hover:bg-stone-100"
        >
          Settings
        </a>
        <button
          on:click={handleLogout}
          class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 dark:hover:bg-gray-700 hover:bg-stone-100"
        >
          Logout
        </button>
      </div>
    {/if}
  </div>
{:else}
  <a
    href="/login"
    class="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors {buttonClass}"
  >
    {getTranslation($selectedLanguage, 'signIn')}
  </a>
{/if}
