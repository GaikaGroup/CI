<script>
  import { onMount } from 'svelte';
  import ChatInterface from '$modules/chat/components/ChatInterface.svelte';
  import { checkAuth } from '$modules/auth/stores';

  // Check if user is already logged in
  onMount(() => {
    checkAuth();
  });
</script>

<div class="min-h-screen">
  <h1 class="sr-only">AI Tutor Platform</h1>

  <div class="max-w-4xl mx-auto px-4 py-8">
    <ChatInterface />
  </div>
</div>

<style>
  /* Page-specific styles can go here */
</style>
