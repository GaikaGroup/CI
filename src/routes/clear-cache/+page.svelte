<script>
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect to the static clear-cache.html page
    window.location.href = '/clear-cache.html';
  });
</script>

<div class="flex items-center justify-center h-screen">
  <div class="text-center">
    <h1 class="text-2xl font-bold mb-4">Redirecting to Cache Clearing Instructions...</h1>
    <p>
      If you are not redirected automatically, <a
        href="/clear-cache.html"
        class="text-amber-600 hover:text-amber-800">click here</a
      >.
    </p>
  </div>
</div>
