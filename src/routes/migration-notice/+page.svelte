<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // Auto-redirect after 5 seconds
    setTimeout(() => {
      goto('/login');
    }, 5000);
  });
</script>

<svelte:head>
  <title>System Update Notice</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <div
        class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4"
      >
        <svg
          class="h-6 w-6 text-blue-600 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">System Updated</h1>

      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
      >
        <p class="text-blue-800 dark:text-blue-200 font-medium mb-2">
          We've improved our user role system!
        </p>
        <p class="text-blue-700 dark:text-blue-300 text-sm">
          Please log in again to continue using the platform with the enhanced features.
        </p>
      </div>

      <div class="space-y-4">
        <a
          href="/login"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
        >
          Go to Login
        </a>

        <p class="text-gray-500 dark:text-gray-400 text-xs">
          Redirecting automatically in 5 seconds...
        </p>
      </div>

      <div class="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">What's New?</h2>
        <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1 text-left">
          <li>• Better user role management</li>
          <li>• Dynamic Student/Tutor roles</li>
          <li>• Improved admin interface</li>
          <li>• Enhanced security</li>
        </ul>
      </div>
    </div>
  </div>
</main>
