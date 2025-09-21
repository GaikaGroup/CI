<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // Redirect to catalogue page
    goto('/catalogue', { replaceState: true });
  });
</script>

<svelte:head>
  <title>Redirecting to Catalogue...</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
    <p class="text-stone-600 dark:text-gray-300">Redirecting to catalogue...</p>
  </div>
</div>
