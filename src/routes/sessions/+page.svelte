<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { user, checkAuth, isAuthenticated } from '$modules/auth/stores';
  import { appMode } from '$lib/stores/mode';
  import { setMode } from '$lib/stores/mode';
  import { Plus } from 'lucide-svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  // New imports for enhanced functionality
  import SessionToolbar from '$lib/modules/session/components/SessionToolbar.svelte';
  import ActiveFiltersDisplay from '$lib/modules/session/components/ActiveFiltersDisplay.svelte';
  import EnhancedSessionCard from '$lib/modules/session/components/EnhancedSessionCard.svelte';
  import { filterStore, hasActiveFilters } from '$lib/modules/session/stores/filterStore.js';
  import { sessionCacheStore } from '$lib/modules/session/stores/sessionCacheStore.js';

  let isCreatingSession = false;
  let intersectionObserver;
  let loadMoreTrigger;

  $: currentMode = $appMode === 'catalogue' ? 'learn' : $appMode;
  $: sessions = $sessionCacheStore.sessions;
  $: loading = $sessionCacheStore.loading;
  $: error = $sessionCacheStore.error;
  $: pagination = $sessionCacheStore.pagination;
  $: hasMore = pagination?.hasMore || false;
  $: highlightedCommands = $filterStore.commandTypes || [];

  async function fetchSessions(append = false) {
    if (loading) return;

    sessionCacheStore.setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String($filterStore.page),
        limit: String($filterStore.limit),
        search: $filterStore.search || '',
        dateRange: $filterStore.dateRange || 'all',
        commands: ($filterStore.commandTypes || []).join(',')
      });

      const response = await fetch(`/api/sessions?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();

      if (append) {
        sessionCacheStore.appendSessions(data.sessions, data.pagination);
      } else {
        sessionCacheStore.setSessions(data.sessions, data.pagination);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      sessionCacheStore.setError(err.message);
    }
  }

  async function loadMoreSessions() {
    if (!hasMore || loading) return;

    filterStore.nextPage();
    await fetchSessions(true);
  }

  function handleFilterChange() {
    // Reset and fetch new results
    sessionCacheStore.clear();
    fetchSessions(false);
  }

  function handleRemoveFilter(event) {
    const { type, value } = event.detail;

    if (type === 'search') {
      filterStore.setSearch('');
    } else if (type === 'dateRange') {
      filterStore.setDateRange('all');
    } else if (type === 'command') {
      filterStore.removeCommandType(value);
    }

    handleFilterChange();
  }

  function handleClearAllFilters() {
    filterStore.clearFilters();
    handleFilterChange();
  }

  function handleSessionClick(event) {
    const session = event.detail;
    goto(`/sessions/${session.id}`);
  }

  async function handleModeChange(newMode) {
    setMode(newMode);
    filterStore.clearFilters();
    sessionCacheStore.clear();
    await fetchSessions(false);
  }

  async function createNewSession() {
    if (isCreatingSession) return;

    if (!$user) {
      goto('/login?redirect=/sessions');
      return;
    }

    isCreatingSession = true;
    try {
      const title = `New Session ${new Date().toLocaleDateString()}`;
      const sessionMode = currentMode;

      // For LEARN mode, we need a courseId - for now, always use FUN mode
      // TODO: Add course selection UI when creating LEARN sessions
      const actualMode = 'fun';

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          mode: actualMode,
          language: 'en'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create session');
      }

      const session = await response.json();
      goto(`/sessions/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert(error.message || 'Failed to create new session');
    } finally {
      isCreatingSession = false;
    }
  }

  // Setup intersection observer for infinite scroll
  function setupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loading) {
            loadMoreSessions();
          }
        });
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (loadMoreTrigger) {
      intersectionObserver.observe(loadMoreTrigger);
    }
  }

  onMount(async () => {
    try {
      await checkAuth();

      if (!$isAuthenticated) {
        goto('/login?redirect=/sessions');
        return;
      }

      await fetchSessions(false);
      setupIntersectionObserver();
    } catch (error) {
      console.error('Initialization error:', error);
      if (error.message.includes('Authentication required')) {
        goto('/login?redirect=/sessions');
      }
    }
  });

  onDestroy(() => {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }
  });

  // Re-setup observer when trigger element changes
  $: if (loadMoreTrigger) {
    setupIntersectionObserver();
  }
</script>

<svelte:head>
  <title>My Sessions - AI Tutor</title>
</svelte:head>

{#if $isAuthenticated && $user}
  <div class="sessions-page">
    <main class="main-content">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>{getTranslation($selectedLanguage, 'sessions')}</h1>
          <p class="subtitle">
            {currentMode === 'fun'
              ? getTranslation($selectedLanguage, 'funModeNote')
              : getTranslation($selectedLanguage, 'learnModeDefaultNote')}
          </p>
        </div>

        <!-- Mode Toggle -->
        <div class="mode-toggle">
          <button
            class="mode-btn"
            class:active={currentMode === 'fun'}
            on:click={() => handleModeChange('fun')}
          >
            Fun Chat
          </button>
          <button
            class="mode-btn"
            class:active={currentMode === 'learn'}
            on:click={() => handleModeChange('learn')}
          >
            Learn Mode
          </button>
        </div>
      </div>

      <!-- Toolbar with Search and Filters -->
      <SessionToolbar on:filterChange={handleFilterChange} />

      <!-- Active Filters Display -->
      {#if $hasActiveFilters}
        <ActiveFiltersDisplay
          filters={$filterStore}
          on:removeFilter={handleRemoveFilter}
          on:clearAll={handleClearAllFilters}
        />
      {/if}

      <!-- Sessions Container -->
      <div class="sessions-container">
        <div class="sessions-header">
          <h2>{getTranslation($selectedLanguage, 'sessions')}</h2>
          <button
            class="new-session-btn"
            on:click={createNewSession}
            disabled={isCreatingSession}
            title={getTranslation($selectedLanguage, 'createNewSession')}
          >
            <Plus class="h-4 w-4" />
            {isCreatingSession
              ? getTranslation($selectedLanguage, 'loading')
              : getTranslation($selectedLanguage, 'newSession')}
          </button>
        </div>

        <!-- Loading State (Initial) -->
        {#if loading && sessions.length === 0}
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>{getTranslation($selectedLanguage, 'loading')}</p>
          </div>
        {/if}

        <!-- Error State -->
        {#if error}
          <div class="error-state">
            <p class="error-message">{error}</p>
            <button class="retry-button" on:click={() => fetchSessions(false)}>
              {getTranslation($selectedLanguage, 'confirm')}
            </button>
          </div>
        {/if}

        <!-- Empty State -->
        {#if !loading && !error && sessions.length === 0}
          <div class="empty-state">
            <div class="empty-content">
              <h3>{getTranslation($selectedLanguage, 'noSessionsFound')}</h3>
              {#if $hasActiveFilters}
                <p>{getTranslation($selectedLanguage, 'tryAdjustingFilters')}</p>
                <button class="clear-filters-btn" on:click={handleClearAllFilters}>
                  {getTranslation($selectedLanguage, 'clearFilters')}
                </button>
              {:else}
                <p>{getTranslation($selectedLanguage, 'createNewSession')}</p>
                <button class="create-first-session-btn" on:click={createNewSession}>
                  <Plus class="h-4 w-4" />
                  {getTranslation($selectedLanguage, 'newSession')}
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Sessions Grid -->
        {#if sessions.length > 0}
          <div class="sessions-grid">
            {#each sessions as session (session.id)}
              <EnhancedSessionCard {session} {highlightedCommands} on:click={handleSessionClick} />
            {/each}
          </div>

          <!-- Infinite Scroll Trigger -->
          {#if hasMore}
            <div bind:this={loadMoreTrigger} class="load-more-trigger">
              {#if loading}
                <div class="loading-more">
                  <div class="loading-spinner small"></div>
                  <span>{getTranslation($selectedLanguage, 'loading')}</span>
                </div>
              {/if}
            </div>
          {:else if sessions.length > 0}
            <div class="end-of-list">
              <span>{getTranslation($selectedLanguage, 'noSessionsFound')}</span>
            </div>
          {/if}
        {/if}
      </div>
    </main>
  </div>
{:else}
  <div class="loading-page">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p>{getTranslation($selectedLanguage, 'loading')}</p>
    </div>
  </div>
{/if}

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .sessions-page {
    min-height: 100vh;
    background: #fafafa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .loading-page {
    min-height: 100vh;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-content {
    text-align: center;
    color: #666;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e5e5;
    border-top: 3px solid #ff9800;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  .loading-spinner.small {
    width: 24px;
    height: 24px;
    border-width: 2px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .main-content {
    padding: 40px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    gap: 20px;
  }

  h1 {
    font-size: 32px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 8px;
  }

  .subtitle {
    font-size: 15px;
    color: #666;
  }

  .mode-toggle {
    display: flex;
    background: #f5f5f5;
    border-radius: 22px;
    padding: 4px;
    gap: 4px;
  }

  .mode-btn {
    padding: 0 20px;
    height: 36px;
    background: transparent;
    border: none;
    border-radius: 18px;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .mode-btn.active {
    background: #fff;
    color: #1a1a1a;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .sessions-container {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 30px;
    min-height: calc(100vh - 300px);
  }

  .sessions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .sessions-header h2 {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }

  .new-session-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #ff9800;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .new-session-btn:hover:not(:disabled) {
    background: #f57c00;
    transform: translateY(-1px);
  }

  .new-session-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sessions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .empty-content {
    text-align: center;
    max-width: 400px;
  }

  .empty-content h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 12px;
  }

  .empty-content p {
    font-size: 16px;
    color: #666;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .clear-filters-btn,
  .create-first-session-btn,
  .retry-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: #ff9800;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-filters-btn:hover,
  .create-first-session-btn:hover,
  .retry-button:hover {
    background: #f57c00;
    transform: translateY(-1px);
  }

  .error-message {
    color: #d32f2f;
    margin-bottom: 16px;
  }

  .load-more-trigger {
    padding: 40px 0;
  }

  .loading-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #666;
    font-size: 14px;
  }

  .end-of-list {
    padding: 40px 0;
    text-align: center;
    color: #999;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 20px;
    }

    .sessions-container {
      padding: 20px;
    }

    .sessions-header {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .sessions-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
</style>
