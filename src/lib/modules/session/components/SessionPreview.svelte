<script>
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    MessageSquare, 
    Calendar, 
    Globe, 
    Sparkles, 
    BookOpen, 
    Edit2, 
    Trash2,
    Clock,
    Play
  } from 'lucide-svelte';
  import Modal from '$lib/shared/components/Modal.svelte';
  import Button from '$lib/shared/components/Button.svelte';
  import { sessionStore } from '../stores/sessionStore.js';

  // Props
  export let session = null;

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Local state
  let showDeleteConfirm = false;
  let showEditModal = false;
  let editedTitle = '';
  let isDeleting = false;
  let isUpdating = false;

  // Reactive statements
  $: hasSession = session !== null && session !== undefined;
  $: messageCount = session?.messageCount || 0;
  $: lastActivity = session?.updatedAt ? new Date(session.updatedAt) : null;
  $: createdDate = session?.createdAt ? new Date(session.createdAt) : null;
  $: mode = session?.mode || 'fun';
  $: language = session?.language || 'en';

  // Format date helper
  function formatDate(date) {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  // Format full date
  function formatFullDate(date) {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get mode icon
  function getModeIcon(mode) {
    return mode === 'learn' ? BookOpen : Sparkles;
  }

  // Get language name
  function getLanguageName(code) {
    const languages = {
      en: 'English',
      es: 'Español',
      ru: 'Русский',
      fr: 'Français',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Português',
      ja: '日本語',
      ko: '한국어',
      zh: '中文'
    };
    return languages[code] || code.toUpperCase();
  }

  // Continue session handler
  function handleContinueSession() {
    if (!session) return;
    
    // Navigate to chat interface with session ID
    goto(`/sessions/${session.id}`);
    dispatch('continue', { sessionId: session.id });
  }

  // View history handler
  function handleViewHistory() {
    if (!session) return;
    
    // Navigate to history view
    goto(`/sessions/${session.id}/history`);
    dispatch('viewHistory', { sessionId: session.id });
  }

  // Edit title handlers
  function openEditModal() {
    if (!session) return;
    editedTitle = session.title;
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editedTitle = '';
  }

  async function handleSaveTitle() {
    if (!session || !editedTitle.trim() || editedTitle === session.title) {
      closeEditModal();
      return;
    }

    isUpdating = true;
    try {
      await sessionStore.updateSession(session.id, { title: editedTitle.trim() });
      closeEditModal();
      dispatch('updated', { sessionId: session.id });
    } catch (error) {
      console.error('Failed to update session title:', error);
      // Error is handled by the store
    } finally {
      isUpdating = false;
    }
  }

  function handleEditKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSaveTitle();
    } else if (event.key === 'Escape') {
      closeEditModal();
    }
  }

  // Delete session handlers
  function openDeleteConfirm() {
    showDeleteConfirm = true;
  }

  function closeDeleteConfirm() {
    showDeleteConfirm = false;
  }

  async function handleDeleteSession() {
    if (!session) return;

    isDeleting = true;
    try {
      await sessionStore.deleteSession(session.id);
      closeDeleteConfirm();
      dispatch('deleted', { sessionId: session.id });
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Error is handled by the store
    } finally {
      isDeleting = false;
    }
  }
</script>

{#if hasSession}
  <!-- Session Details -->
  <div class="h-full flex flex-col">
    <!-- Header with title and actions -->
    <div class="p-6 border-b border-stone-200 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-2 break-words">
            {session.title}
          </h2>
          
          <!-- Mode and Language badges -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium {mode === 'learn' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'}">
              <svelte:component this={getModeIcon(mode)} size={14} />
              {mode === 'learn' ? 'Learn Mode' : 'Fun Mode'}
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 dark:bg-gray-700 dark:text-gray-300 text-sm font-medium">
              <Globe size={14} />
              {getLanguageName(language)}
            </span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            on:click={openEditModal}
            class="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-600 dark:text-gray-400 transition-colors"
            aria-label="Edit session title"
            title="Edit title"
          >
            <Edit2 size={18} />
          </button>
          <button
            on:click={openDeleteConfirm}
            class="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            aria-label="Delete session"
            title="Delete session"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>

    <!-- Session Statistics -->
    <div class="p-6 border-b border-stone-200 dark:border-gray-700">
      <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Session Statistics
      </h3>
      <div class="grid grid-cols-2 gap-4">
        <!-- Message Count -->
        <div class="flex items-start gap-3 p-3 rounded-lg bg-stone-50 dark:bg-gray-800">
          <div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <MessageSquare size={20} class="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p class="text-2xl font-bold text-stone-900 dark:text-white">
              {messageCount}
            </p>
            <p class="text-xs text-stone-600 dark:text-gray-400">
              {messageCount === 1 ? 'Message' : 'Messages'}
            </p>
          </div>
        </div>

        <!-- Last Activity -->
        <div class="flex items-start gap-3 p-3 rounded-lg bg-stone-50 dark:bg-gray-800">
          <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Clock size={20} class="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-sm font-semibold text-stone-900 dark:text-white">
              {formatDate(lastActivity)}
            </p>
            <p class="text-xs text-stone-600 dark:text-gray-400">
              Last activity
            </p>
          </div>
        </div>

        <!-- Created Date -->
        <div class="col-span-2 flex items-start gap-3 p-3 rounded-lg bg-stone-50 dark:bg-gray-800">
          <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Calendar size={20} class="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-sm font-semibold text-stone-900 dark:text-white">
              {formatFullDate(createdDate)}
            </p>
            <p class="text-xs text-stone-600 dark:text-gray-400">
              Session created
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Content -->
    {#if session.preview}
      <div class="p-6 border-b border-stone-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Last Conversation
        </h3>
        <div class="p-4 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700">
          <p class="text-sm text-stone-700 dark:text-gray-300 leading-relaxed">
            {session.preview}
          </p>
        </div>
      </div>
    {/if}

    <!-- Action Buttons -->
    <div class="p-6 mt-auto">
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          on:click={handleContinueSession}
          class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <Play size={18} />
          Continue Session
        </button>
        
        <button
          on:click={handleViewHistory}
          class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-800 dark:text-gray-100 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <MessageSquare size={18} />
          View History
        </button>
      </div>
    </div>
  </div>
{:else}
  <!-- Empty State - No Session Selected -->
  <div class="h-full flex items-center justify-center p-8">
    <div class="text-center max-w-md">
      <div class="mb-6 text-stone-400 dark:text-gray-500">
        <MessageSquare size={64} class="mx-auto" />
      </div>
      <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">
        No Session Selected
      </h3>
      <p class="text-stone-600 dark:text-gray-400 mb-6">
        Choose a session from the sidebar to view its details, statistics, and continue your conversation with the AI tutor.
      </p>
      <div class="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p class="text-sm text-amber-800 dark:text-amber-300">
          💡 Tip: You can create a new session or search for existing ones using the sidebar.
        </p>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Title Modal -->
<Modal
  title="Edit Session Title"
  open={showEditModal}
  on:close={closeEditModal}
  width="max-w-lg"
>
  <div class="space-y-4">
    <div>
      <label for="edit-title" class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2">
        Session Title
      </label>
      <input
        id="edit-title"
        type="text"
        bind:value={editedTitle}
        on:keydown={handleEditKeydown}
        placeholder="Enter session title"
        class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        maxlength="500"
        autofocus
      />
      <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
        {editedTitle.length}/500 characters
      </p>
    </div>
  </div>

  <div slot="footer" class="flex justify-end gap-2">
    <Button variant="secondary" on:click={closeEditModal} disabled={isUpdating}>
      Cancel
    </Button>
    <Button 
      variant="primary" 
      on:click={handleSaveTitle} 
      disabled={!editedTitle.trim() || editedTitle === session?.title || isUpdating}
    >
      {isUpdating ? 'Saving...' : 'Save Changes'}
    </Button>
  </div>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
  title="Delete Session"
  open={showDeleteConfirm}
  on:close={closeDeleteConfirm}
  width="max-w-md"
>
  <div class="space-y-4">
    <div class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <p class="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
        ⚠️ Warning: This action cannot be undone
      </p>
      <p class="text-sm text-red-700 dark:text-red-400">
        Deleting this session will permanently remove all messages and conversation history.
      </p>
    </div>
    
    {#if session}
      <div>
        <p class="text-sm text-stone-700 dark:text-gray-300 mb-2">
          You are about to delete:
        </p>
        <div class="p-3 rounded-lg bg-stone-100 dark:bg-gray-800 border border-stone-200 dark:border-gray-700">
          <p class="font-semibold text-stone-900 dark:text-white mb-1">
            {session.title}
          </p>
          <p class="text-xs text-stone-600 dark:text-gray-400">
            {messageCount} {messageCount === 1 ? 'message' : 'messages'} • Created {formatDate(createdDate)}
          </p>
        </div>
      </div>
    {/if}
  </div>

  <div slot="footer" class="flex justify-end gap-2">
    <Button variant="secondary" on:click={closeDeleteConfirm} disabled={isDeleting}>
      Cancel
    </Button>
    <Button 
      variant="primary" 
      on:click={handleDeleteSession}
      disabled={isDeleting}
      class="bg-red-600 hover:bg-red-700 focus:ring-red-500"
    >
      {isDeleting ? 'Deleting...' : 'Delete Session'}
    </Button>
  </div>
</Modal>
