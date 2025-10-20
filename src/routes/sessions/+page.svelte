<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user, checkAuth, isAuthenticated } from '$modules/auth/stores';
  import { sessionStore } from '$modules/session/stores/sessionStore.js';
  import { appMode } from '$lib/stores/mode';
  import { coursesStore } from '$lib/stores/coursesDB.js';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import CourseGroup from '$lib/components/CourseGroup.svelte';

  import { setMode } from '$lib/stores/mode';
  import { Plus, Trash2, BookOpen } from 'lucide-svelte';

  let searchQuery = '';
  let isCreatingSession = false;
  let showDeleteDialog = false;
  let sessionToDelete = null;
  let isDeletingSession = false;

  // Subscribe to stores
  $: sessions = $sessionStore.sessions;
  $: currentMode = $appMode === 'catalogue' ? 'learn' : $appMode; // Map catalogue to learn for sessions page
  $: courses = $coursesStore.courses || [];

  // Group sessions by course for LEARN mode
  $: groupedSessions = groupSessionsByCourse(sessions, courses, currentMode);

  async function handleModeChange(newMode) {
    setMode(newMode);
    if ($user) {
      try {
        await sessionStore.loadSessions({ mode: newMode });
      } catch (error) {
        console.error('Failed to load sessions for mode:', newMode, error);
      }
    }
  }

  function groupSessionsByCourse(sessions, courses, mode) {
    if (mode === 'fun') {
      return { ungrouped: sessions };
    }

    // Group by course for LEARN mode
    const grouped = {};
    const ungroupedSessions = [];

    // Initialize groups for all courses
    courses.forEach((course) => {
      grouped[course.id] = {
        course,
        sessions: []
      };
    });

    // Distribute sessions into groups
    sessions.forEach((session) => {
      if (session.courseId && grouped[session.courseId]) {
        grouped[session.courseId].sessions.push(session);
      } else {
        // Sessions without courseId or with invalid courseId go to ungrouped
        ungroupedSessions.push(session);
      }
    });

    // Add ungrouped sessions if any exist
    if (ungroupedSessions.length > 0) {
      grouped['ungrouped'] = {
        course: {
          id: 'ungrouped',
          name: 'Other Sessions',
          description: 'Sessions not associated with any course'
        },
        sessions: ungroupedSessions
      };
    }

    return grouped;
  }

  async function createNewSession() {
    if (isCreatingSession) return;

    // Check if user is authenticated
    if (!$user) {
      goto('/login?redirect=/sessions');
      return;
    }

    isCreatingSession = true;
    try {
      // Use a temporary title - will be updated with first user message
      const title = `New Session ${new Date().toLocaleDateString()}`;

      // Determine the actual mode to use
      // If current mode is 'learn' or 'catalogue' but no courses available, use 'fun' mode
      let sessionMode = currentMode;
      let sessionCourseId = null;
      
      if (currentMode === 'learn' || currentMode === 'catalogue') {
        sessionCourseId = getDefaultCourseId();
        if (!sessionCourseId) {
          // No courses available, fall back to fun mode
          console.log('[Sessions] No courses available for learn mode, using fun mode instead');
          sessionMode = 'fun';
        } else {
          // Use learn mode with the course
          sessionMode = 'learn';
        }
      }

      // Create session based on determined mode
      const session = await sessionStore.createSession(
        title,
        sessionMode,
        'en',
        null,
        sessionCourseId
      );

      // Navigate to the new session page
      goto(`/sessions/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);

      // If authentication fails, redirect to login
      if (error.message.includes('Authentication required')) {
        goto('/login?redirect=/sessions');
      } else {
        alert('Failed to create new session');
      }
    } finally {
      isCreatingSession = false;
    }
  }

  function getDefaultCourseId() {
    // Return the first available course ID, or null if no courses exist
    return courses.length > 0 ? courses[0].id : null;
  }

  function selectSession(session) {
    // Navigate to the individual session page using UUID
    goto(`/sessions/${session.id}`);
  }

  function handleDeleteClick(session, event) {
    // Prevent the session card click event
    event.stopPropagation();

    // Only allow deletion for FUN mode sessions
    if (session.mode !== 'fun') {
      return;
    }

    sessionToDelete = session;
    showDeleteDialog = true;
  }

  async function confirmDelete() {
    if (!sessionToDelete) return;

    isDeletingSession = true;
    try {
      await sessionStore.deleteSession(sessionToDelete.id);
      showDeleteDialog = false;
      sessionToDelete = null;
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Error is already handled by the store
    } finally {
      isDeletingSession = false;
    }
  }

  function cancelDelete() {
    showDeleteDialog = false;
    sessionToDelete = null;
    isDeletingSession = false;
  }

  onMount(async () => {
    try {
      console.log('[Sessions] Starting initialization...');
      
      await checkAuth();
      console.log('[Sessions] Auth check completed, authenticated:', $isAuthenticated, 'user:', $user?.email);

      // Redirect to login if not authenticated
      if (!$isAuthenticated) {
        console.log('[Sessions] Not authenticated, redirecting to login');
        goto('/login?redirect=/sessions');
        return;
      }

      // Initialize courses store
      console.log('[Sessions] Initializing courses store...');
      await coursesStore.initialize();
      console.log('[Sessions] Courses store initialized, courses:', $coursesStore.courses?.length);

      // Initialize session store if user is authenticated
      if ($user) {
        console.log('[Sessions] Initializing session store...');
        await sessionStore.initialize();
        console.log('[Sessions] Session store initialized, sessions:', $sessionStore.sessions?.length);
      }
      
      console.log('[Sessions] Initialization completed successfully');
    } catch (error) {
      console.error('[Sessions] Initialization error:', error);
      // If authentication fails, redirect to login
      if (error.message.includes('Authentication required')) {
        goto('/login?redirect=/sessions');
      }
    }
  });
</script>

<svelte:head>
  <title>My Sessions - AI Tutor</title>
</svelte:head>

{#if $isAuthenticated && $user}
  <div class="sessions-page">
    <!-- Main Content -->
    <main class="main-content">
      <div class="page-header">
        <div>
          <h1>My Sessions</h1>
          <p class="subtitle">
            Manage and continue your {currentMode === 'fun' ? 'chat' : 'learning'} conversations
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

      <!-- Search and Filters Bar -->
      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search sessions..." bind:value={searchQuery} />
        </div>
        <button class="filters-btn">Filters</button>
      </div>

      <!-- Sessions List -->
      <div class="sessions-container">
        <div class="sessions-header">
          <h2>Your Sessions</h2>
          {#if currentMode === 'fun' || (currentMode === 'learn' && courses.length > 0)}
            <button
              class="new-session-btn"
              on:click={createNewSession}
              disabled={isCreatingSession}
              title={currentMode === 'fun' ? 'Create new chat session' : 'Create new learning session'}
            >
              <Plus class="h-4 w-4" />
              {isCreatingSession ? 'Creating...' : 'New Chat'}
            </button>
          {/if}
        </div>

        {#if currentMode === 'fun'}
          <!-- FUN Mode: Simple list view -->
          <div class="sessions-grid">
            {#if sessions.length === 0}
              <div class="empty-state">
                <div class="empty-content">
                  <h3>No sessions yet</h3>
                  <p>Create a new session to start chatting with your AI assistant!</p>
                  <button
                    class="create-first-session-btn"
                    on:click={createNewSession}
                    disabled={isCreatingSession}
                  >
                    <Plus class="h-4 w-4" />
                    {isCreatingSession ? 'Creating...' : 'Start New Chat'}
                  </button>
                </div>
              </div>
            {:else}
              {#each sessions as session (session.id)}
                <div class="session-card-container">
                  <button class="session-card" on:click={() => selectSession(session)}>
                    <div class="session-card-header">
                      <div class="session-title">{session.title}</div>
                      <div
                        class="session-mode-badge"
                        class:fun={session.mode === 'fun'}
                        class:learn={session.mode === 'learn'}
                      >
                        {session.mode}
                      </div>
                    </div>

                    {#if session.preview}
                      <div class="session-preview">{session.preview}</div>
                    {/if}

                    <div class="session-meta">
                      <span class="session-date">
                        {new Date(session.updatedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                        {new Date(session.updatedAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span class="session-messages">{session.messageCount || 0} messages</span>
                    </div>
                  </button>

                  <!-- Delete button for FUN mode sessions only -->
                  {#if session.mode === 'fun'}
                    <button
                      class="delete-session-btn"
                      on:click={(e) => handleDeleteClick(session, e)}
                      title="Delete session"
                      aria-label="Delete session"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        {:else}
          <!-- LEARN Mode: Course-grouped view -->
          <div class="courses-container">
            {#if sessions.length === 0}
              <div class="empty-state">
                <div class="empty-content">
                  <BookOpen class="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  {#if courses.length === 0}
                    <h3>No courses enrolled yet</h3>
                    <p>To start learning sessions, you need to enroll in courses first.</p>
                    <p class="text-sm text-gray-500 mt-2">
                      Browse the course catalogue and enroll in subjects that interest you.
                    </p>
                    <button
                      class="create-first-session-btn"
                      on:click={() => goto('/catalogue')}
                    >
                      <BookOpen class="h-4 w-4" />
                      Browse Courses
                    </button>
                  {:else}
                    <h3>No learning sessions yet</h3>
                    <p>Create a new session to start learning with your AI assistant!</p>
                    <button
                      class="create-first-session-btn"
                      on:click={createNewSession}
                      disabled={isCreatingSession}
                    >
                      <Plus class="h-4 w-4" />
                      {isCreatingSession ? 'Creating...' : 'Start Learning Session'}
                    </button>
                  {/if}
                </div>
              </div>
            {:else}
              {#each Object.values(groupedSessions) as group (group.course.id)}
                {#if group.sessions.length > 0}
                  <CourseGroup
                    course={group.course}
                    sessions={group.sessions}
                    showCreateButton={group.course.id !== 'ungrouped'}
                  />
                {/if}
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </main>
  </div>
{:else}
  <!-- Loading state while checking authentication -->
  <div class="loading-page">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p>Loading sessions...</p>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  bind:isOpen={showDeleteDialog}
  title="Delete Session"
  message="Are you sure you want to delete this session? This action cannot be undone and the session will be removed from your list."
  confirmText="Delete"
  cancelText="Cancel"
  type="danger"
  loading={isDeletingSession}
  on:confirm={confirmDelete}
  on:cancel={cancelDelete}
/>

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

  /* Loading State */
  .loading-page {
    min-height: 100vh;
    background: #fafafa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Main Content */
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

  /* Toolbar */
  .toolbar {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
  }

  .search-box {
    flex: 1;
    max-width: 800px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    height: 44px;
  }

  .search-icon {
    font-size: 16px;
  }

  .search-box input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    color: #333;
  }

  .search-box input::placeholder {
    color: #999;
  }

  .filters-btn {
    padding: 0 25px;
    height: 44px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filters-btn:hover {
    border-color: #ccc;
  }

  /* Mode Toggle */
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

  /* Sessions Container */
  .sessions-container {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 30px;
    min-height: calc(100vh - 250px);
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

  /* Sessions Grid */
  .sessions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  /* Courses Container */
  .courses-container {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Empty State */
  .empty-state {
    grid-column: 1 / -1;
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

  .create-first-session-btn {
    display: flex;
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
    margin: 0 auto;
  }

  .create-first-session-btn:hover:not(:disabled) {
    background: #f57c00;
    transform: translateY(-1px);
  }

  .create-first-session-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Session Cards */
  .session-card-container {
    position: relative;
  }

  .session-card {
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 160px;
    width: 100%;
  }

  .session-card:hover {
    border-color: #ff9800;
    box-shadow: 0 4px 12px rgba(255, 152, 0, 0.15);
    transform: translateY(-2px);
  }

  .session-card-container:hover .delete-session-btn {
    opacity: 1;
  }

  .delete-session-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s;
    color: #6b7280;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .delete-session-btn:hover {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #dc2626;
    transform: scale(1.05);
  }

  .delete-session-btn:active {
    transform: scale(0.95);
  }

  .session-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .session-title {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.4;
    flex: 1;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .session-mode-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .session-mode-badge.fun {
    background: #e3f2fd;
    color: #1976d2;
  }

  .session-mode-badge.learn {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  .session-preview {
    font-size: 14px;
    color: #666;
    line-height: 1.5;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    flex: 1;
  }

  .session-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #999;
    margin-top: auto;
  }

  .session-date {
    font-weight: 500;
  }

  .session-messages {
    font-weight: 500;
  }

  /* Responsive Design */
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

    .session-card {
      padding: 16px;
    }

    .toolbar {
      flex-direction: column;
      gap: 12px;
    }

    .search-box {
      max-width: none;
    }
  }
</style>
