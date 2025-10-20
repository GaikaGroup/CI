<script>
  import { Plus, BookOpen, Users } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { sessionStore } from '$modules/session/stores/sessionStore.js';

  export let course;
  export let sessions = [];
  export let showCreateButton = true;

  let isCreatingSession = false;

  async function createSessionForCourse() {
    if (isCreatingSession) return;

    isCreatingSession = true;
    try {
      const title = `New ${course.name} Session ${new Date().toLocaleDateString()}`;
      
      // Validate that we have a valid course ID
      if (!course.id || course.id === 'ungrouped') {
        throw new Error('Cannot create session without a valid course');
      }
      
      const session = await sessionStore.createSession(title, 'learn', 'en', null, course.id);
      goto(`/sessions/${session.id}`);
    } catch (error) {
      console.error('Failed to create session for course:', error);
      alert('Failed to create new session: ' + error.message);
    } finally {
      isCreatingSession = false;
    }
  }

  function selectSession(session) {
    goto(`/sessions/${session.id}`);
  }
</script>

<div class="course-group">
  <div class="course-header">
    <div class="course-info">
      <div class="course-icon">
        <BookOpen class="h-5 w-5" />
      </div>
      <div class="course-details">
        <h3 class="course-name">{course.name}</h3>
        <div class="course-meta">
          <span class="session-count"
            >{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span
          >
          {#if course.level}
            <span class="course-level">{course.level}</span>
          {/if}
          {#if course.language}
            <span class="course-language">{course.language.toUpperCase()}</span>
          {/if}
        </div>
      </div>
    </div>

    {#if showCreateButton}
      <button
        class="create-session-btn"
        on:click={createSessionForCourse}
        disabled={isCreatingSession}
        title="Create new session for this course"
      >
        <Plus class="h-4 w-4" />
        {isCreatingSession ? 'Creating...' : 'New Session'}
      </button>
    {/if}
  </div>

  {#if sessions.length > 0}
    <div class="sessions-list">
      {#each sessions as session (session.id)}
        <button class="session-item" on:click={() => selectSession(session)}>
          <div class="session-content">
            <div class="session-title">{session.title}</div>
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
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <div class="empty-sessions">
      <p>No sessions yet for this course</p>
      {#if showCreateButton}
        <button
          class="create-first-session-btn"
          on:click={createSessionForCourse}
          disabled={isCreatingSession}
        >
          <Plus class="h-4 w-4" />
          {isCreatingSession ? 'Creating...' : 'Start First Session'}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .course-group {
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    margin-bottom: 24px;
    overflow: hidden;
  }

  .course-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    background: #f8f9fa;
    border-bottom: 1px solid #e5e5e5;
  }

  .course-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .course-icon {
    width: 40px;
    height: 40px;
    background: #ff9800;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .course-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .course-name {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }

  .course-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #666;
  }

  .session-count {
    font-weight: 500;
  }

  .course-level {
    padding: 2px 6px;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 4px;
    font-weight: 500;
  }

  .course-language {
    padding: 2px 6px;
    background: #f3e5f5;
    color: #7b1fa2;
    border-radius: 4px;
    font-weight: 500;
  }

  .create-session-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #ff9800;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .create-session-btn:hover:not(:disabled) {
    background: #f57c00;
    transform: translateY(-1px);
  }

  .create-session-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sessions-list {
    padding: 0;
  }

  .session-item {
    width: 100%;
    padding: 16px 24px;
    background: none;
    border: none;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .session-item:last-child {
    border-bottom: none;
  }

  .session-item:hover {
    background: #f8f9fa;
  }

  .session-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .session-title {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.4;
  }

  .session-preview {
    font-size: 13px;
    color: #666;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .session-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #999;
  }

  .session-date {
    font-weight: 500;
  }

  .session-messages {
    font-weight: 500;
  }

  .empty-sessions {
    padding: 32px 24px;
    text-align: center;
    color: #666;
  }

  .empty-sessions p {
    margin-bottom: 16px;
    font-size: 14px;
  }

  .create-first-session-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: #ff9800;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .create-first-session-btn:hover:not(:disabled) {
    background: #f57c00;
    transform: translateY(-1px);
  }

  .create-first-session-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .course-header {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .course-info {
      justify-content: center;
    }

    .session-item {
      padding: 12px 16px;
    }

    .empty-sessions {
      padding: 24px 16px;
    }
  }
</style>
