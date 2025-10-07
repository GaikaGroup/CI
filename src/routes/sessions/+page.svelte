<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { user, checkAuth } from '$modules/auth/stores';
  import { sessionStore } from '$modules/session/stores/sessionStore.js';
  import {
    chatMode as chatModeStore,
    messages,
    initializeChat,
    addMessage
  } from '$modules/chat/stores';
  import { MESSAGE_TYPES } from '$shared/utils/constants';
  import { setVoiceModeActive } from '$modules/chat/voiceServices';
  import MessageList from '$modules/chat/components/MessageList.svelte';
  import MessageInput from '$modules/chat/components/MessageInput.svelte';
  import VoiceChat from '$modules/chat/components/VoiceChat.svelte';
  import { setMode } from '$lib/stores/mode';
  import { Plus } from 'lucide-svelte';

  let searchQuery = '';
  let currentSessionId = null;
  let messageUnsubscribe;
  let isCreatingSession = false;

  // Subscribe to sessionStore
  $: sessions = $sessionStore.sessions;
  $: selectedSession = $sessionStore.currentSession;

  function toggleChatMode(mode) {
    if (mode === 'voice') {
      chatModeStore.set('voice');
      setVoiceModeActive(true);
    } else {
      chatModeStore.set('text');
      setVoiceModeActive(false);
    }
  }

  async function handleSendMessage(event) {
    const { content, images } = event.detail;

    if (!content.trim() && images.length === 0) return;

    try {
      // If no current session, create one with the user's question as title
      if (!currentSessionId) {
        const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        const session = await sessionStore.createSession(
          title,
          'fun',
          'en',
          content.substring(0, 200)
        );
        currentSessionId = session.id;
      }

      // Add user message to store
      const messageId = Date.now();

      // Extract URLs from image objects if images exist
      const imageUrls = images && images.length > 0 ? images.map((img) => img.url || img) : [];

      addMessage(MESSAGE_TYPES.USER, content, images, messageId);

      // Import the sendMessage function dynamically
      const { sendMessage } = await import('$modules/chat/services');

      // Send message to LLM (this will add AI response to store)
      await sendMessage(content, imageUrls, currentSessionId);

      // Update session title with first user message if it's still the default
      const currentSession = $sessionStore.sessions.find((s) => s.id === currentSessionId);
      if (currentSession && currentSession.title.startsWith('New Session')) {
        await sessionStore.updateSession(currentSessionId, {
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          preview: content.substring(0, 200)
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  async function createNewSession() {
    if (isCreatingSession) return;

    isCreatingSession = true;
    try {
      // Use a temporary title - will be updated with first user message
      const title = `New Session ${new Date().toLocaleDateString()}`;

      const session = await sessionStore.createSession(title, 'fun', 'en');
      currentSessionId = session.id;

      // Clear current messages to start fresh
      messages.set([]);
      initializeChat('Hello! How can I help you today?');
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create new session');
    } finally {
      isCreatingSession = false;
    }
  }

  async function selectSession(session) {
    try {
      await sessionStore.selectSession(session.id);
      currentSessionId = session.id;

      // Load ALL messages for this session from database
      const response = await fetch(`/api/sessions/${session.id}/messages?limit=200`);
      if (response.ok) {
        const data = await response.json();
        const loadedMessages = data.messages || [];

        console.log('=== Session Load Debug ===');
        console.log(`Loading ${loadedMessages.length} messages for session ${session.id}`);
        console.log(
          'Raw messages from API:',
          loadedMessages.map((m) => ({ type: m.type, content: m.content.substring(0, 50) }))
        );

        // Convert database messages to chat format
        const chatMessages = loadedMessages.map((msg, index) => ({
          id: msg.id || index + 1,
          type: msg.type === 'assistant' ? 'tutor' : msg.type, // Keep 'user' as 'user', convert 'assistant' to 'tutor'
          content: msg.content,
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          metadata: msg.metadata || {},
          saved: true // Mark as already saved
        }));

        console.log(
          'Converted messages:',
          chatMessages.map((m) => ({ type: m.type, content: m.content.substring(0, 50) }))
        );

        if (chatMessages.length > 0) {
          messages.set(chatMessages);
          console.log('Messages set to store');
        } else {
          // No messages yet, start fresh
          messages.set([]);
          console.log('No messages, cleared store');
        }
      } else {
        console.error('Failed to load messages:', response.status);
        messages.set([]);
      }
    } catch (error) {
      console.error('Failed to select session:', error);
      messages.set([]);
    }
  }

  // Auto-save messages to current session
  async function saveMessageToSession(message) {
    if (!currentSessionId || !$user || !message.content) return;

    // Don't save system messages or messages that are already saved
    if (message.type === 'system' || message.saved) return;

    try {
      const response = await fetch(`/api/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: message.type === 'tutor' ? 'assistant' : message.type,
          content: message.content,
          metadata: message.metadata || {}
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save message:', error);
        return;
      }

      // Update session preview with latest user message
      if (message.type === 'user') {
        await sessionStore.updateSession(currentSessionId, {
          preview: message.content.substring(0, 200)
        });
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  onMount(async () => {
    await checkAuth();
    setMode('fun');

    if ($user) {
      // Load existing sessions
      await sessionStore.loadSessions();

      // Subscribe to messages to auto-save them
      let lastProcessedIndex = 0;
      messageUnsubscribe = messages.subscribe(($messages) => {
        // Save any new messages that haven't been saved yet
        for (let i = lastProcessedIndex; i < $messages.length; i++) {
          const message = $messages[i];
          if (message && !message.saved && message.type !== 'system') {
            saveMessageToSession(message);
            message.saved = true;
          }
        }
        lastProcessedIndex = $messages.length;
      });
    }
  });

  onDestroy(() => {
    if (messageUnsubscribe) {
      messageUnsubscribe();
    }
  });
</script>

<svelte:head>
  <title>My Sessions - AI Tutor</title>
</svelte:head>

<div class="sessions-page">
  <!-- Main Content -->
  <main class="main-content">
    <div class="page-header">
      <div>
        <h1>My Sessions</h1>
        <p class="subtitle">Manage and continue your learning conversations</p>
      </div>
    </div>

    <!-- Search and Mode Toggle Bar -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Search sessions..." bind:value={searchQuery} />
      </div>
      <button class="filters-btn">Filters</button>

      <!-- Chat Mode Toggle -->
      <div class="mode-toggle">
        <button
          class="mode-btn"
          class:active={$chatModeStore === 'text'}
          on:click={() => toggleChatMode('text')}
        >
          💬 Text Chat
        </button>
        <button
          class="mode-btn"
          class:active={$chatModeStore === 'voice'}
          on:click={() => toggleChatMode('voice')}
        >
          🎤 Voice Chat
        </button>
      </div>
    </div>

    <!-- Sessions Panel -->
    <div class="sessions-panel">
      <!-- Left Sidebar -->
      <aside class="sessions-sidebar">
        <div class="sidebar-header">
          <h3>Sessions</h3>
          <button
            class="new-session-btn"
            on:click={createNewSession}
            disabled={isCreatingSession}
            title="Create new session"
          >
            <Plus class="h-4 w-4" />
            New
          </button>
        </div>

        <div class="sessions-list">
          {#if sessions.length === 0}
            <div class="empty-state-small">
              <p>No sessions yet.<br />Start chatting to create one!</p>
            </div>
          {:else}
            {#each sessions as session (session.id)}
              <button
                class="session-item"
                class:active={currentSessionId === session.id}
                on:click={() => selectSession(session)}
              >
                <div class="session-title">{session.title}</div>
                <div class="session-meta">
                  {new Date(session.updatedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                  {new Date(session.updatedAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} • {session.messageCount || 0} msg
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </aside>

      <!-- Chat Interface -->
      <div class="chat-interface">
        {#if $chatModeStore === 'voice'}
          <div class="voice-chat-container">
            <VoiceChat />
          </div>
        {:else}
          <!-- Messages Area -->
          <div class="messages-area">
            <MessageList />
          </div>

          <!-- Input Area -->
          <div class="input-area">
            <MessageInput on:send={handleSendMessage} />
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>

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

  /* Main Content */
  .main-content {
    padding: 40px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 30px;
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

  /* Sessions Panel */
  .sessions-panel {
    display: grid;
    grid-template-columns: 300px 1fr;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    height: calc(100vh - 250px);
    overflow: hidden;
  }

  /* Sidebar */
  .sessions-sidebar {
    background: #fafafa;
    border-right: 1px solid #e5e5e5;
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .sessions-sidebar h3 {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }

  .new-session-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #ff9800;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .new-session-btn:hover:not(:disabled) {
    background: #f57c00;
  }

  .new-session-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sessions-list {
    flex: 1;
    overflow-y: auto;
    margin: 0 -20px;
    padding: 0 20px;
  }

  .empty-state-small {
    padding: 40px 10px;
    text-align: center;
  }

  .empty-state-small p {
    font-size: 13px;
    color: #999;
    line-height: 1.5;
  }

  .session-item {
    width: 100%;
    text-align: left;
    padding: 12px;
    margin-bottom: 8px;
    background: white;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .session-item:hover {
    border-color: #ff9800;
    background: #fff8f0;
  }

  .session-item.active {
    border-color: #ff9800;
    background: #fff8f0;
    box-shadow: 0 2px 4px rgba(255, 152, 0, 0.1);
  }

  .session-title {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
  }

  .session-meta {
    font-size: 10px;
    color: #999;
  }

  /* Chat Interface */
  .chat-interface {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }

  .voice-chat-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .messages-area {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Input Area */
  .input-area {
    border-top: 1px solid #e5e5e5;
    background: #fff;
  }

  /* Override MessageList and MessageInput styles to match design */
  :global(.sessions-page .messages-area > div) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :global(.sessions-page .message-list) {
    padding: 20px;
    height: 100%;
  }

  :global(.sessions-page .message-input-container) {
    padding: 15px 20px;
  }

  /* Ensure messages display properly with proper spacing */
  :global(.sessions-page .message) {
    margin-bottom: 16px;
  }

  :global(.sessions-page .message.user) {
    display: flex;
    justify-content: flex-end;
  }

  :global(.sessions-page .message.tutor),
  :global(.sessions-page .message.assistant) {
    display: flex;
    justify-content: flex-start;
  }

  /* Ensure MessageList takes full height and scrolls properly */
  :global(.sessions-page .messages-area .flex-1) {
    height: 100%;
    max-height: none;
  }

  /* Improve message bubble appearance */
  :global(.sessions-page .overflow-y-auto) {
    scrollbar-width: thin;
    scrollbar-color: #d1d5db transparent;
  }

  :global(.sessions-page .overflow-y-auto::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.sessions-page .overflow-y-auto::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.sessions-page .overflow-y-auto::-webkit-scrollbar-thumb) {
    background-color: #d1d5db;
    border-radius: 3px;
  }
</style>
