<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Redirect to /stats with any query parameters
  onMount(() => {
    const searchParams = $page.url.searchParams.toString();
    const redirectUrl = searchParams ? `/stats?${searchParams}` : '/stats';
    goto(redirectUrl, { replaceState: true });
  });
</script>

<svelte:head>
  <title>Redirecting to Statistics...</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
    <p class="text-gray-600">Redirecting to Statistics...</p>
  </div>
</div>
