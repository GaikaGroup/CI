<script>
  /**
   * SessionsList Component Example
   * Demonstrates how to use the SessionsList component
   */
  import SessionsList from './SessionsList.svelte';
  import { sessionStore } from '../stores/sessionStore.js';
  import { user, isAuthenticated } from '$lib/modules/auth/stores.js';
  
  let selectedSessionId = null;
  
  // Watch for session selection changes
  $: if (selectedSessionId) {
    console.log('Selected session:', selectedSessionId);
  }
  
  // Example: Load sessions manually
  async function refreshSessions() {
    await sessionStore.loadSessions();
  }
</script>

<div class="h-screen flex">
  <!-- Sidebar with SessionsList -->
  <div class="w-80 border-r">
    <SessionsList bind:selectedSessionId />
  </div>
  
  <!-- Main content area -->
  <div class="flex-1 p-8">
    <h1 class="text-2xl font-bold mb-4">SessionsList Component Example</h1>
    
    {#if !$isAuthenticated}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p class="text-yellow-800">
          Please log in to see your sessions.
        </p>
      </div>
    {:else}
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 class="font-semibold mb-2">Current User</h2>
          <p class="text-sm text-gray-700">
            {$user?.name || 'Unknown'} ({$user?.email || 'No email'})
          </p>
        </div>
        
        {#if selectedSessionId}
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 class="font-semibold mb-2">Selected Session</h2>
            <p class="text-sm text-gray-700">
              Session ID: {selectedSessionId}
            </p>
            {#if $sessionStore.currentSession}
              <div class="mt-2 text-sm">
                <p><strong>Title:</strong> {$sessionStore.currentSession.title}</p>
                <p><strong>Mode:</strong> {$sessionStore.currentSession.mode}</p>
                <p><strong>Language:</strong> {$sessionStore.currentSession.language}</p>
                <p><strong>Messages:</strong> {$sessionStore.currentSession.messageCount || 0}</p>
              </div>
            {/if}
          </div>
        {:else}
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p class="text-sm text-gray-700">
              No session selected. Click on a session in the sidebar to select it.
            </p>
          </div>
        {/if}
        
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h2 class="font-semibold mb-2">Session Statistics</h2>
          <div class="text-sm text-gray-700 space-y-1">
            <p><strong>Total Sessions:</strong> {$sessionStore.sessions.length}</p>
            <p><strong>Current Page:</strong> {$sessionStore.pagination.currentPage} of {$sessionStore.pagination.totalPages}</p>
            <p><strong>Total Count:</strong> {$sessionStore.pagination.totalCount}</p>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button
            on:click={refreshSessions}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Sessions
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
