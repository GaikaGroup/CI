<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { darkMode } from '$lib/modules/theme/stores';

  /** @type {import('./$types').PageData} */
  export let data;

  let { path, isUUID } = data;

  onMount(() => {
    // If it's not a UUID, redirect to home after a short delay
    if (!isUUID) {
      setTimeout(() => {
        goto('/');
      }, 3000);
    }
  });
</script>

<div class="max-w-4xl mx-auto mt-16 px-4">
  <div
    class="{$darkMode
      ? 'bg-gray-800 border-gray-700 text-white'
      : 'bg-white border-stone-200 text-stone-900'} rounded-xl shadow-md p-8 border"
  >
    <h1 class="text-2xl font-bold text-amber-600 mb-4">
      {isUUID ? 'Temporary Image URL' : 'Page Not Found'}
    </h1>

    {#if isUUID}
      <div class="mb-6">
        <p class="{$darkMode ? 'text-gray-300' : 'text-stone-700'} mb-4">
          The URL you're trying to access (<code
            class="{$darkMode ? 'bg-gray-700' : 'bg-stone-100'} px-2 py-1 rounded">{path}</code
          >) appears to be a temporary blob URL created for an image that was being processed in the
          browser.
        </p>

        <p class="{$darkMode ? 'text-gray-300' : 'text-stone-700'} mb-4">
          These URLs are temporary and only valid during the current browser session. They cannot be
          accessed directly or shared.
        </p>

        <div
          class="{$darkMode
            ? 'bg-gray-700 border-amber-500'
            : 'bg-amber-50 border-amber-500'} border-l-4 p-4 mb-6"
        >
          <h3 class="{$darkMode ? 'text-amber-400' : 'text-amber-800'} font-semibold">
            Why am I seeing this?
          </h3>
          <p class={$darkMode ? 'text-gray-300' : 'text-amber-700'}>
            You may have seen this URL in your browser's console or network tab while using the
            application. These URLs are created when you upload images for processing and are not
            meant to be accessed directly.
          </p>
        </div>
      </div>
    {:else}
      <p class="{$darkMode ? 'text-gray-300' : 'text-stone-700'} mb-6">
        The page you're looking for doesn't exist. You'll be redirected to the home page in a few
        seconds.
      </p>
    {/if}

    <a
      href="/"
      class="inline-block bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
    >
      Return to Home Page
    </a>
  </div>
</div>
