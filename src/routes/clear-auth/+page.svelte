<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { STORAGE_KEYS } from '$lib/shared/utils/constants.js';

  let cleared = false;

  onMount(() => {
    clearAuthData();
  });

  function clearAuthData() {
    try {
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');

      // Clear sessionStorage
      sessionStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('auth_token');

      // Clear cookies
      document.cookie = `${STORAGE_KEYS.USER}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = 'user=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';

      cleared = true;

      // Redirect to login after 2 seconds
      setTimeout(() => {
        goto('/login');
      }, 2000);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
</script>

<svelte:head>
  <title>Clearing Authentication Data</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Clearing Authentication Data
      </h1>

      {#if cleared}
        <div
          class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6"
        >
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              ></path>
            </svg>
            <p class="text-green-800 dark:text-green-200 font-medium">
              Authentication data cleared successfully!
            </p>
          </div>
          <p class="text-green-700 dark:text-green-300 text-sm mt-2">
            Redirecting to login page...
          </p>
        </div>
      {:else}
        <div
          class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
        >
          <div class="flex items-center">
            <svg class="animate-spin w-5 h-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p class="text-blue-800 dark:text-blue-200 font-medium">
              Clearing old authentication data...
            </p>
          </div>
        </div>
      {/if}

      <div
        class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
      >
        <h2 class="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          Why is this needed?
        </h2>
        <p class="text-yellow-700 dark:text-yellow-300 text-sm">
          We recently updated the user authentication system. Old authentication data needs to be
          cleared to ensure proper functionality.
        </p>
      </div>
    </div>
  </div>
</main>
