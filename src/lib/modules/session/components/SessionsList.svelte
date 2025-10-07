<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { Search, Plus, Calendar, MessageSquare, Trash2, Edit2, Globe, Sparkles, BookOpen, Filter, X } from 'lucide-svelte';
  import { sessionStore, isSessionLoading, sessionError, activeFiltersCount, hasActiveFilters } from '../stores/sessionStore.js';
  import { user } from '$lib/modules/auth/stores.js';
  import Modal from '$lib/shared/components/Modal.svelte';
  import Button from '$lib/shared/components/Button.svelte';
  import { highlightText } from '../utils/searchHighlight.js';

  // Props
  export let selectedSessionId = null;

  // Local state
  let searchQuery = '';
  let searchTimeout;
  let showNewSessionModal = false;
  let newSessionTitle = '';
  let newSessionMode = 'fun';
  let newSessionLanguage = 'en';
  let deleteConfirmSessionId = null;
  let editingSessionId = null;
  let editingTitle = '';
  let showFilters = false;
  let filterMode = null;
  let filterLanguage = null;
  let filterDateFrom = '';
  let filterDateTo = '';

  const DATABASE_NOT_READY_MESSAGE = 'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';

  // Reactive statements
  $: sessions = $sessionStore?.sessions || [];
  $: loading = $isSessionLoading || $sessionStore?.loading || false;
  $: error = $sessionError || $sessionStore?.error || null;
  $: hasNextPage = $sessionStore.pagination.hasNextPage;
  $: hasPreviousPage = $sessionStore.pagination.hasPreviousPage;
  $: currentPage = $sessionStore.pagination.currentPage;
  $: totalPages = $sessionStore.pagination.totalPages;
  $: filtersActive = $hasActiveFilters;
  $: filtersCount = $activeFiltersCount;
  $: currentFilters = $sessionStore.filters;
  $: persistence = $sessionStore.persistence;
  $: persistenceUnavailable = persistence?.available === false;
  $: persistenceMessage = persistence?.message || DATABASE_NOT_READY_MESSAGE;

  // Language options
  const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'es', name: 'Español' }
  ];

  // Mode options
  const modeOptions = [
    { value: 'fun', label: 'Fun Mode', icon: Sparkles },
    { value: 'learn', label: 'Learn Mode', icon: BookOpen }
  ];

  // Initialize on mount
  onMount(async () => {
    if ($user) {
      await sessionStore.initialize();
      // Initialize filter values from store
      filterMode = currentFilters.mode;
      filterLanguage = currentFilters.language;
      filterDateFrom = currentFilters.dateFrom || '';
      filterDateTo = currentFilters.dateTo || '';
    }
  });

  // Debounced search handler
  function handleSearchInput(event) {
    searchQuery = event.target.value;
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        await sessionStore.searchSessions(searchQuery);
      } else {
        await sessionStore.loadSessions();
      }
    }, 300); // 300ms debounce
  }

  // Session selection handler
  function handleSessionSelect(sessionId) {
    selectedSessionId = sessionId;
    sessionStore.selectSession(sessionId);
  }

  // New session modal handlers
  function openNewSessionModal() {
    showNewSessionModal = true;
    newSessionTitle = '';
    newSessionMode = 'fun';
    newSessionLanguage = 'en';
  }

  function closeNewSessionModal() {
    showNewSessionModal = false;
    newSessionTitle = '';
  }

  async function handleCreateSession() {
    if (!newSessionTitle.trim()) {
      return;
    }

    try {
      const session = await sessionStore.createSession(
        newSessionTitle.trim(),
        newSessionMode,
        newSessionLanguage
      );
      
      closeNewSessionModal();
      
      // Navigate to the chat interface for the new session
      goto(`/sessions/${session.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }

  // Delete session handlers
  function openDeleteConfirm(sessionId, event) {
    event.stopPropagation();
    deleteConfirmSessionId = sessionId;
  }

  function closeDeleteConfirm() {
    deleteConfirmSessionId = null;
  }

  async function handleDeleteSession() {
    if (!deleteConfirmSessionId) return;

    try {
      await sessionStore.deleteSession(deleteConfirmSessionId);
      closeDeleteConfirm();
      
      // Clear selection if deleted session was selected
      if (selectedSessionId === deleteConfirmSessionId) {
        selectedSessionId = null;
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }

  // Edit session handlers
  function startEditingTitle(sessionId, currentTitle, event) {
    event.stopPropagation();
    editingSessionId = sessionId;
    editingTitle = currentTitle;
  }

  function cancelEditing() {
    editingSessionId = null;
    editingTitle = '';
  }

  async function saveEditedTitle(sessionId) {
    if (!editingTitle.trim() || editingTitle === sessions.find(s => s.id === sessionId)?.title) {
      cancelEditing();
      return;
    }

    try {
      await sessionStore.updateSession(sessionId, { title: editingTitle.trim() });
      cancelEditing();
    } catch (err) {
      console.error('Failed to update session title:', err);
    }
  }

  function handleEditKeydown(event, sessionId) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEditedTitle(sessionId);
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  // Filter handlers
  function toggleFilters() {
    showFilters = !showFilters;
  }

  async function applyFilters() {
    const filters = {
      mode: filterMode || null,
      language: filterLanguage || null,
      dateFrom: filterDateFrom || null,
      dateTo: filterDateTo || null
    };
    
    await sessionStore.applyFilters(filters);
    showFilters = false;
  }

  async function clearAllFilters() {
    filterMode = null;
    filterLanguage = null;
    filterDateFrom = '';
    filterDateTo = '';
    await sessionStore.clearFilters();
    showFilters = false;
  }

  // Pagination handlers
  async function handleNextPage() {
    if (hasNextPage) {
      await sessionStore.loadNextPage();
    }
  }

  async function handlePreviousPage() {
    if (hasPreviousPage) {
      await sessionStore.loadPreviousPage();
    }
  }

  // Highlight helper
  function getHighlightedText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    return highlightText(text, searchTerm);
  }

  // Format date helper
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Get mode icon
  function getModeIcon(mode) {
    return mode === 'learn' ? BookOpen : Sparkles;
  }

  // Cleanup
  onDestroy(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  });
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-stone-200 dark:border-gray-700">
  <!-- Header with search and new session button -->
  <div class="p-4 border-b border-stone-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-stone-900 dark:text-white">Sessions</h2>
      <div class="flex items-center gap-2">
        <button
          on:click={toggleFilters}
          class="relative p-2 rounded-lg {filtersActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-stone-100 dark:bg-gray-700 text-stone-600 dark:text-gray-400'} hover:bg-amber-200 dark:hover:bg-amber-900/40 transition-colors"
          aria-label="Filter sessions"
          title="Filter sessions"
        >
          <Filter size={20} />
          {#if filtersCount > 0}
            <span class="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 text-white text-xs rounded-full flex items-center justify-center">
              {filtersCount}
            </span>
          {/if}
        </button>
        <button
          on:click={openNewSessionModal}
          class="p-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          aria-label="New Session"
          title="Create new session"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>

    <!-- Search input -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 dark:text-gray-500" size={18} />
      <input
        type="text"
        placeholder="Search sessions..."
        value={searchQuery}
        on:input={handleSearchInput}
        class="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600"
      />
    </div>

    <!-- Filter Panel -->
    {#if showFilters}
      <div class="mt-3 p-3 bg-stone-50 dark:bg-gray-750 rounded-lg border border-stone-200 dark:border-gray-600">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-stone-900 dark:text-white">Filters</h3>
          <button
            on:click={toggleFilters}
            class="p-1 rounded hover:bg-stone-200 dark:hover:bg-gray-600 text-stone-500 dark:text-gray-400"
            aria-label="Close filters"
          >
            <X size={16} />
          </button>
        </div>

        <div class="space-y-3">
          <!-- Mode Filter -->
          <div>
            <label class="block text-xs font-medium text-stone-700 dark:text-gray-300 mb-1">
              Mode
            </label>
            <select
              bind:value={filterMode}
              class="w-full px-2 py-1.5 text-sm rounded border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value={null}>All Modes</option>
              <option value="fun">Fun Mode</option>
              <option value="learn">Learn Mode</option>
            </select>
          </div>

          <!-- Language Filter -->
          <div>
            <label class="block text-xs font-medium text-stone-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              bind:value={filterLanguage}
              class="w-full px-2 py-1.5 text-sm rounded border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value={null}>All Languages</option>
              {#each languageOptions as lang}
                <option value={lang.code}>{lang.name}</option>
              {/each}
            </select>
          </div>

          <!-- Date Range Filter -->
          <div>
            <label class="block text-xs font-medium text-stone-700 dark:text-gray-300 mb-1">
              Date Range
            </label>
            <div class="grid grid-cols-2 gap-2">
              <input
                type="date"
                bind:value={filterDateFrom}
                placeholder="From"
                class="px-2 py-1.5 text-sm rounded border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="date"
                bind:value={filterDateTo}
                placeholder="To"
                class="px-2 py-1.5 text-sm rounded border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <!-- Filter Actions -->
          <div class="flex gap-2 pt-2">
            <button
              on:click={applyFilters}
              class="flex-1 px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
            >
              Apply
            </button>
            <button
              on:click={clearAllFilters}
              class="px-3 py-1.5 text-sm border border-stone-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-700 dark:text-gray-300 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if persistenceUnavailable}
    <div class="px-4">
      <div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200" role="alert">
        <p class="font-semibold">Session persistence unavailable</p>
        <p class="mt-1 leading-snug">{persistenceMessage}</p>
      </div>
    </div>
  {/if}

  <!-- Sessions list -->
  <div class="flex-1 overflow-y-auto">
    {#if loading && sessions.length === 0}
      <!-- Loading skeleton -->
      <div class="p-4 space-y-3">
        {#each Array(5) as _}
          <div class="animate-pulse">
            <div class="h-20 bg-stone-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        {/each}
      </div>
    {:else if error}
      <!-- Error state -->
      <div class="p-4 text-center">
        <p class="text-red-600 dark:text-red-400 mb-2">Failed to load sessions</p>
        <p class="text-sm text-stone-600 dark:text-gray-400">{error}</p>
        <button
          on:click={() => sessionStore.loadSessions()}
          class="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    {:else if sessions.length === 0}
      <!-- Empty state -->
      <div class="p-8 text-center">
        <MessageSquare class="mx-auto mb-4 text-stone-400 dark:text-gray-500" size={48} />
        <h3 class="text-lg font-medium text-stone-900 dark:text-white mb-2">No sessions yet</h3>
        <p class="text-sm text-stone-600 dark:text-gray-400 mb-4">
          {searchQuery ? 'No sessions match your search.' : 'Create your first session to get started!'}
        </p>
        {#if !searchQuery}
          <button
            on:click={openNewSessionModal}
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} />
            New Session
          </button>
        {/if}
      </div>
    {:else}
      <!-- Sessions list -->
      <div class="divide-y divide-stone-200 dark:divide-gray-700">
        {#each sessions as session (session.id)}
          <button
            on:click={() => handleSessionSelect(session.id)}
            class="w-full p-4 text-left hover:bg-stone-50 dark:hover:bg-gray-750 transition-colors {selectedSessionId === session.id ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-600' : ''}"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex-1 min-w-0">
                {#if editingSessionId === session.id}
                  <input
                    type="text"
                    bind:value={editingTitle}
                    on:keydown={(e) => handleEditKeydown(e, session.id)}
                    on:blur={() => saveEditedTitle(session.id)}
                    class="w-full px-2 py-1 text-sm font-medium border border-amber-500 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                    autofocus
                  />
                {:else}
                  <h3 class="font-medium text-stone-900 dark:text-white truncate">
                    {#if searchQuery && session._searchMeta?.matchedIn?.title}
                      {@html getHighlightedText(session.title, searchQuery)}
                    {:else}
                      {session.title}
                    {/if}
                  </h3>
                {/if}
              </div>
              
              <div class="flex items-center gap-1 flex-shrink-0">
                <button
                  on:click={(e) => startEditingTitle(session.id, session.title, e)}
                  class="p-1 rounded hover:bg-stone-200 dark:hover:bg-gray-600 text-stone-500 dark:text-gray-400"
                  aria-label="Edit title"
                  title="Edit title"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  on:click={(e) => openDeleteConfirm(session.id, e)}
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                  aria-label="Delete session"
                  title="Delete session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {#if session.preview}
              <p class="text-sm text-stone-600 dark:text-gray-400 mb-2 line-clamp-2">
                {#if searchQuery && session._searchMeta?.matchedIn?.preview}
                  {@html getHighlightedText(session.preview, searchQuery)}
                {:else}
                  {session.preview}
                {/if}
              </p>
            {/if}

            <div class="flex items-center gap-3 text-xs text-stone-500 dark:text-gray-500">
              <span class="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(session.updatedAt)}
              </span>
              <span class="flex items-center gap-1">
                <MessageSquare size={12} />
                {session.messageCount || 0}
              </span>
              <span class="flex items-center gap-1">
                <svelte:component this={getModeIcon(session.mode)} size={12} />
                {session.mode}
              </span>
              <span class="flex items-center gap-1">
                <Globe size={12} />
                {session.language.toUpperCase()}
              </span>
            </div>
          </button>
        {/each}
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="p-4 border-t border-stone-200 dark:border-gray-700 flex items-center justify-between">
          <button
            on:click={handlePreviousPage}
            disabled={!hasPreviousPage || loading}
            class="px-3 py-1 text-sm rounded-lg border border-stone-300 dark:border-gray-600 hover:bg-stone-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-stone-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span class="text-sm text-stone-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            on:click={handleNextPage}
            disabled={!hasNextPage || loading}
            class="px-3 py-1 text-sm rounded-lg border border-stone-300 dark:border-gray-600 hover:bg-stone-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-stone-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- New Session Modal -->
<Modal
  title="Create New Session"
  open={showNewSessionModal}
  on:close={closeNewSessionModal}
  width="max-w-lg"
>
  <div class="space-y-4">
    <div>
      <label for="session-title" class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1">
        Session Title
      </label>
      <input
        id="session-title"
        type="text"
        bind:value={newSessionTitle}
        placeholder="e.g., Math Practice Session"
        class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        maxlength="500"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2">
        Mode
      </label>
      <div class="grid grid-cols-2 gap-3">
        {#each modeOptions as option}
          <button
            type="button"
            on:click={() => newSessionMode = option.value}
            class="p-3 rounded-lg border-2 transition-all {newSessionMode === option.value ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'border-stone-300 dark:border-gray-600 hover:border-stone-400 dark:hover:border-gray-500'}"
          >
            <div class="flex items-center gap-2 mb-1">
              <svelte:component this={option.icon} size={18} class={newSessionMode === option.value ? 'text-amber-600' : 'text-stone-600 dark:text-gray-400'} />
              <span class="font-medium text-stone-900 dark:text-white">{option.label}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <div>
      <label for="session-language" class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1">
        Language
      </label>
      <select
        id="session-language"
        bind:value={newSessionLanguage}
        class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {#each languageOptions as lang}
          <option value={lang.code}>{lang.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <div slot="footer" class="flex justify-end gap-2">
    <Button variant="secondary" on:click={closeNewSessionModal}>
      Cancel
    </Button>
    <Button variant="primary" on:click={handleCreateSession} disabled={!newSessionTitle.trim()}>
      Create Session
    </Button>
  </div>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
  title="Delete Session"
  open={deleteConfirmSessionId !== null}
  on:close={closeDeleteConfirm}
  width="max-w-md"
>
  <p class="text-stone-700 dark:text-gray-300">
    Are you sure you want to delete this session? This action cannot be undone and will permanently delete all messages in this session.
  </p>

  <div slot="footer" class="flex justify-end gap-2">
    <Button variant="secondary" on:click={closeDeleteConfirm}>
      Cancel
    </Button>
    <Button variant="primary" on:click={handleDeleteSession} class="bg-red-600 hover:bg-red-700 focus:ring-red-500">
      Delete
    </Button>
  </div>
</Modal>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  :global(.highlight) {
    background-color: #fef3c7;
    color: #92400e;
    font-weight: 500;
    padding: 0 2px;
    border-radius: 2px;
  }

  :global(.dark .highlight) {
    background-color: #78350f;
    color: #fef3c7;
  }
</style>
