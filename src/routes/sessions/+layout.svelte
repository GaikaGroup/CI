<!--
  Sessions Layout
  Provides consistent layout for all session-related pages
  Ensures proper initialization of session stores
-->

<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { user, checkAuth, isAuthenticated } from '$modules/auth/stores';
  import { goto } from '$app/navigation';
  import { sessionStore } from '$modules/session/stores/sessionStore.js';

  // Ensure user is authenticated before accessing sessions
  onMount(async () => {
    await checkAuth();
    
    if (!$isAuthenticated) {
      // Redirect to login if not authenticated
      goto('/login?redirect=/sessions');
      return;
    }

    // Initialize session store if user is authenticated
    if ($user) {
      await sessionStore.initialize();
    }
  });

  // Watch for auth state changes
  $: if (browser && !$isAuthenticated && $user === null) {
    goto('/login?redirect=/sessions');
  }
</script>

<!-- Only render content if user is authenticated -->
{#if $isAuthenticated && $user}
  <slot />
{:else}
  <!-- Loading state while checking authentication -->
  <div class="bg-slate-50 min-h-screen dark:bg-slate-950">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p class="text-sm text-slate-600 dark:text-slate-300">
            Loading sessions...
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}