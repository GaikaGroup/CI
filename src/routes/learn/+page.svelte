<script>
  import { onMount } from 'svelte';
  import ChatInterface from '$modules/chat/components/ChatInterface.svelte';
  import { checkAuth, isAuthenticated } from '$modules/auth/stores';
  import { setMode } from '$lib/stores/mode';
  import { goto } from '$app/navigation';

  onMount(() => {
    checkAuth();
    const unsubscribe = isAuthenticated.subscribe((authed) => {
      if (!authed) {
        goto('/login?redirect=/learn');
      } else {
        setMode('learn');
      }
    });
    return unsubscribe;
  });
</script>

<div class="min-h-screen">
  <h1 class="sr-only">Learn Mode</h1>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <ChatInterface />
  </div>
</div>
