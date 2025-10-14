<script>
  import { onMount } from 'svelte';
  import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';
  import { user } from '$lib/modules/auth/stores.js';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  // Props
  export let userId = null; // If provided, show sessions for specific user

  // State
  let sessions = [];
  let loading = false;
  let error = null;
  let pagination = {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20
  };

  // Filters
  let filters = {
    mode: '',
    language: '',
    includeHidden: true,
    hiddenOnly: false,
    search: ''
  };

  // Confirmation dialog
  let showConfirmDialog = false;
  let confirmAction = null;
  let confirmMessage = '';
  let selectedSession = null;

  // Check admin access
  $: hasAdminAccess = $user && isAdmin($user);

  onMount(() => {
    if (hasAdminAccess) {
      loadSessions();
    }
  });

  async function loadSessions() {
    if (!hasAdminAccess) return;

    loading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        includeHidden: filters.includeHidden.toString(),
        hiddenOnly: filters.hiddenOnly.toString()
      });

      if (filters.mode) params.append('mode', filters.mode);
      if (filters.language) params.append('language', filters.language);
      if (filters.search) params.append('search', filters.search);
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/admin/sessions?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();
      sessions = data.sessions || [];
      pagination = data.pagination || pagination;
    } catch (err) {
      error = err.message;
      console.error('Error loading sessions:', err);
    } finally {
      loading = false;
    }
  }

  async function restoreSession(session) {
    selectedSession = session;
    confirmMessage = `Are you sure you want to restore the session "${session.title}"? This will make it visible to the user again.`;
    confirmAction = async () => {
      try {
        const response = await fetch(`/api/admin/sessions/${session.id}/restore`, {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error(`Failed to restore session: ${response.statusText}`);
        }

        // Reload sessions to reflect changes
        await loadSessions();
      } catch (err) {
        error = err.message;
        console.error('Error restoring session:', err);
      }
    };
    showConfirmDialog = true;
  }

  function handleConfirm() {
    if (confirmAction) {
      confirmAction();
    }
    showConfirmDialog = false;
    confirmAction = null;
    selectedSession = null;
  }

  function handleCancel() {
    showConfirmDialog = false;
    confirmAction = null;
    selectedSession = null;
  }

  function applyFilters() {
    pagination.currentPage = 1;
    loadSessions();
  }

  function changePage(newPage) {
    pagination.currentPage = newPage;
    loadSessions();
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  function getSessionStatusBadge(session) {
    if (session.isHidden) {
      return { class: 'bg-red-100 text-red-800', text: 'Hidden' };
    }
    return { class: 'bg-green-100 text-green-800', text: 'Active' };
  }

  function getModeBadge(mode) {
    if (mode === 'learn') {
      return { class: 'bg-blue-100 text-blue-800', text: 'LEARN' };
    }
    return { class: 'bg-purple-100 text-purple-800', text: 'FUN' };
  }
</script>

{#if !hasAdminAccess}
  <div class="bg-red-50 border border-red-200 rounded-md p-4">
    <div class="flex">
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">Access Denied</h3>
        <div class="mt-2 text-sm text-red-700">
          <p>You need admin privileges to access this page.</p>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="space-y-6">
    <!-- Header -->
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">
          {userId ? 'User Sessions' : 'All Sessions'} Management
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          View and manage user sessions, including hidden sessions that users have deleted.
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Filters</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            id="search"
            bind:value={filters.search}
            placeholder="Search title or preview..."
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label for="mode" class="block text-sm font-medium text-gray-700">Mode</label>
          <select
            id="mode"
            bind:value={filters.mode}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Modes</option>
            <option value="fun">FUN</option>
            <option value="learn">LEARN</option>
          </select>
        </div>

        <div>
          <label for="language" class="block text-sm font-medium text-gray-700">Language</label>
          <input
            type="text"
            id="language"
            bind:value={filters.language}
            placeholder="e.g., en, es, fr"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center">
            <input
              id="includeHidden"
              type="checkbox"
              bind:checked={filters.includeHidden}
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label for="includeHidden" class="ml-2 block text-sm text-gray-900">
              Include Hidden
            </label>
          </div>
          <div class="flex items-center">
            <input
              id="hiddenOnly"
              type="checkbox"
              bind:checked={filters.hiddenOnly}
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label for="hiddenOnly" class="ml-2 block text-sm text-gray-900">
              Hidden Only
            </label>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <button
          type="button"
          on:click={applyFilters}
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Apply Filters
        </button>
      </div>
    </div>

    <!-- Error Display -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Sessions Table -->
    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      {#if loading}
        <div class="p-6 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p class="mt-2 text-sm text-gray-500">Loading sessions...</p>
        </div>
      {:else if sessions.length === 0}
        <div class="p-6 text-center">
          <p class="text-sm text-gray-500">No sessions found.</p>
        </div>
      {:else}
        <ul class="divide-y divide-gray-200">
          {#each sessions as session}
            <li class="px-6 py-4">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getSessionStatusBadge(session).class}">
                        {getSessionStatusBadge(session).text}
                      </span>
                    </div>
                    <div class="flex-shrink-0">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getModeBadge(session.mode).class}">
                        {getModeBadge(session.mode).text}
                      </span>
                    </div>
                  </div>
                  
                  <div class="mt-2">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </p>
                    {#if session.preview}
                      <p class="text-sm text-gray-500 truncate">
                        {session.preview}
                      </p>
                    {/if}
                  </div>
                  
                  <div class="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                    <span>User: {session.userId}</span>
                    <span>Messages: {session.messageCount}</span>
                    <span>Language: {session.language}</span>
                    <span>Updated: {formatDate(session.updatedAt)}</span>
                  </div>
                </div>
                
                <div class="flex-shrink-0 flex space-x-2">
                  <a
                    href="/sessions/{session.id}"
                    class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    View
                  </a>
                  
                  {#if session.isHidden}
                    <button
                      type="button"
                      on:click={() => restoreSession(session)}
                      class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Restore
                    </button>
                  {/if}
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Pagination -->
    {#if pagination.totalPages > 1}
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            on:click={() => changePage(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            on:click={() => changePage(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{(pagination.currentPage - 1) * pagination.limit + 1}</span>
              to
              <span class="font-medium">{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}</span>
              of
              <span class="font-medium">{pagination.totalCount}</span>
              results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                on:click={() => changePage(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {#each Array(pagination.totalPages) as _, i}
                <button
                  on:click={() => changePage(i + 1)}
                  class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {pagination.currentPage === i + 1 ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
                >
                  {i + 1}
                </button>
              {/each}
              
              <button
                on:click={() => changePage(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Confirmation Dialog -->
  <ConfirmDialog
    bind:isOpen={showConfirmDialog}
    title="Confirm Action"
    message={confirmMessage}
    confirmText="Confirm"
    cancelText="Cancel"
    on:confirm={handleConfirm}
    on:cancel={handleCancel}
  />
{/if}