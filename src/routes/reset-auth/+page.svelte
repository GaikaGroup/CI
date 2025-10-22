<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let status = 'clearing';

  onMount(() => {
    clearAuthData();
  });

  function clearAuthData() {
    try {
      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear all cookies
      document.cookie.split(';').forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });

      status = 'cleared';

      // Redirect to home after 2 seconds
      setTimeout(() => {
        goto('/');
      }, 2000);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      status = 'error';
    }
  }
</script>

<svelte:head>
  <title>Clearing Authentication Data</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div class="text-center p-8">
    {#if status === 'clearing'}
      <div
        class="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"
      ></div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Clearing old data...</h1>
    {:else if status === 'cleared'}
      <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-green-600 dark:text-green-400">Data cleared!</h1>
      <p class="text-gray-600 dark:text-gray-300 mt-2">Redirecting to home page...</p>
    {:else}
      <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-red-600 dark:text-red-400">Error occurred</h1>
      <p class="text-gray-600 dark:text-gray-300 mt-2">Please clear manually via DevTools</p>
    {/if}
  </div>
</main>
