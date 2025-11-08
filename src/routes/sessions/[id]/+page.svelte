<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  import { user, checkAuth, isAuthenticated } from '$lib/modules/auth/stores';
  import { sessionStore } from '$lib/modules/session/stores/sessionStore.js';
  import {
    chatMode as chatModeStore,
    messages,
    addMessage,
    updateMessage
  } from '$lib/modules/chat/stores';
  import { MESSAGE_TYPES } from '$lib/shared/utils/constants';
  import { setVoiceModeActive } from '$lib/modules/chat/voice';
  import MessageList from '$lib/modules/chat/components/MessageList.svelte';
  import MessageInput from '$lib/modules/chat/components/MessageInput.svelte';
  import VoiceChat from '$lib/modules/chat/components/VoiceChat.svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import { container } from '$lib/shared/di/container';

  export let data;

  let sessionId = data.sessionId;
  let currentSession = null;
  let loading = true;
  let error = null;
  let messageUnsubscribe;
  let isHandlingSendMessage = false; // Flag to prevent auto-save during manual save

  function goBackToSessions() {
    goto('/sessions');
  }

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

    // Set flag to prevent auto-save from triggering during this function
    isHandlingSendMessage = true;

    try {
      // Add user message to store with temporary ID
      const tempMessageId = Date.now();
      const imageUrls = images && images.length > 0 ? images.map((img) => img.url || img) : [];

      // Convert blob URLs to base64 for storage
      let base64Images = [];
      if (imageUrls.length > 0) {
        const imageDataPromises = imageUrls.map(async (imageUrl) => {
          try {
            const response = await fetch(imageUrl);
            if (!response.ok) return null;
            const blob = await response.blob();

            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            console.error('Error converting image to base64:', error);
            return null;
          }
        });

        const results = await Promise.all(imageDataPromises);
        base64Images = results.filter((img) => img !== null);
      }

      // Add message with base64 images
      addMessage(MESSAGE_TYPES.USER, content, base64Images, tempMessageId);

      // Save user message to database
      try {
        const saveResponse = await fetch(`/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'user',
            content: content.trim(),
            metadata: base64Images.length > 0 ? { images: base64Images } : null
          })
        });

        if (saveResponse.ok) {
          const savedMessage = await saveResponse.json();
          // Update the message in store with database ID and mark as saved
          updateMessage(tempMessageId, { id: savedMessage.id, saved: true });
          console.log('User message saved to database with ID:', savedMessage.id);
        }
      } catch (error) {
        console.error('Failed to save user message to database:', error);
      }

      // Import the sendMessage function dynamically
      const { sendMessage } = await import('$lib/modules/chat/services');

      // Send message to LLM (this will add AI response to store)
      const aiResponse = await sendMessage(content, imageUrls, sessionId);

      // Save assistant message to database
      try {
        // Get the last assistant message from store (the one just added)
        const currentMessages = get(messages);
        const lastAssistantMessage = [...currentMessages]
          .reverse()
          .find((m) => (m.type === MESSAGE_TYPES.TUTOR || m.type === 'assistant') && !m.waiting);

        if (lastAssistantMessage && aiResponse) {
          const saveResponse = await fetch(`/api/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'assistant',
              content: lastAssistantMessage.content,
              metadata: lastAssistantMessage.metadata || null,
              llmMetadata: aiResponse.llmMetadata || null
            })
          });

          if (saveResponse.ok) {
            const savedMessage = await saveResponse.json();
            // Update the message in store with database ID and mark as saved
            updateMessage(lastAssistantMessage.id, { id: savedMessage.id, saved: true });
            console.log('Assistant message saved to database with ID:', savedMessage.id);
          }
        }
      } catch (error) {
        console.error('Failed to save assistant message to database:', error);
      }

      // Update session title with first user message if it's still the default
      if (currentSession && currentSession.title.startsWith('New Session')) {
        await sessionStore.updateSession(sessionId, {
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          preview: content.substring(0, 200)
        });
        // Reload session data to get updated title
        await loadSession();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      // Reset flag to allow auto-save again
      isHandlingSendMessage = false;
    }
  }

  async function loadSession() {
    if (!sessionId || !$user) return;

    try {
      loading = true;
      error = null;

      // Load session data from API with access control
      const response = await fetch(`/api/sessions/${sessionId}?includeMessages=true`);

      if (!response.ok) {
        if (response.status === 401) {
          goto('/login?redirect=/sessions');
          return;
        } else if (response.status === 404) {
          error = 'Session not found';
          return;
        } else if (response.status === 403) {
          error = 'Access denied to this session';
          return;
        } else {
          const errorData = await response.json();
          error = errorData.error || 'Failed to load session';
          return;
        }
      }

      const sessionData = await response.json();
      currentSession = sessionData;

      // Set this as the current session in the store
      await sessionStore.selectSession(sessionId);

      // Convert database messages to chat format (all marked as saved to prevent duplicate saves)
      const chatMessages = (sessionData.messages || []).map((msg, index) => ({
        id: msg.id || index + 1,
        type: msg.type === 'assistant' ? 'tutor' : msg.type,
        content: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        metadata: msg.metadata || {},
        images: msg.metadata?.images || [],
        saved: true // Already in database, don't save again
      }));

      if (chatMessages.length > 0) {
        messages.set(chatMessages);
      } else {
        messages.set([]);
      }

      // Load conversation history into InMemorySessionManager
      if (container.has('sessionFactory')) {
        try {
          const sessionFactory = container.resolve('sessionFactory');
          const session = sessionFactory.getOrCreateSession(sessionId);

          // Add all messages to conversation history, excluding welcome messages
          const conversationMessages = (sessionData.messages || []).filter((msg) => {
            // Skip welcome messages (they have isWelcomeMessage metadata)
            return !msg.metadata?.isWelcomeMessage;
          });

          conversationMessages.forEach((msg) => {
            const isUser = msg.type === 'user';
            session.addToConversation(msg.content, isUser);
          });

          console.log(
            `[Session] Loaded ${conversationMessages.length} messages into session history (excluded ${(sessionData.messages?.length || 0) - conversationMessages.length} welcome messages)`
          );
        } catch (error) {
          console.warn('[Session] Failed to load history into session manager:', error);
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);

      if (err.message && err.message.includes('Authentication required')) {
        goto('/login?redirect=/sessions');
        return;
      }

      error = 'Failed to load session';
    } finally {
      loading = false;
    }
  }

  // Auto-save messages to current session
  async function saveMessageToSession(message) {
    if (!sessionId || !$user || !message.content) return;

    // Don't save system messages, waiting phrases, or messages that are already saved
    if (message.type === 'system' || message.saved || message.waiting) return;

    try {
      // Prepare metadata with images if present
      const metadata = { ...(message.metadata || {}) };
      if (message.images && message.images.length > 0) {
        metadata.images = message.images;
      }

      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: message.type === 'tutor' ? 'assistant' : message.type,
          content: message.content,
          metadata
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save message:', error);
        return;
      }

      // Update session preview with latest user message
      if (message.type === 'user') {
        await sessionStore.updateSession(sessionId, {
          preview: message.content.substring(0, 200)
        });
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  onMount(async () => {
    await checkAuth();

    if (!$user) {
      goto('/login?redirect=/sessions');
      return;
    }

    // Load the specific session
    await loadSession();

    // Subscribe to messages to auto-save them (only for messages not already saved by handleSendMessage)
    // This is a fallback for any messages that might be added through other means
    let lastProcessedIndex = 0;
    messageUnsubscribe = messages.subscribe(($messages) => {
      // Skip auto-save if handleSendMessage is currently processing
      if (isHandlingSendMessage) {
        lastProcessedIndex = $messages.length;
        return;
      }

      // Only process new messages that haven't been saved yet
      for (let i = lastProcessedIndex; i < $messages.length; i++) {
        const message = $messages[i];
        // Skip if:
        // - already saved
        // - is a system message
        // - doesn't have content
        // - is a waiting phrase (temporary message)
        // - has a database ID (already in DB)
        const hasDbId = message.id && typeof message.id === 'string' && message.id.startsWith('c');
        if (
          message &&
          !message.saved &&
          !message.waiting &&
          message.type !== 'system' &&
          message.content &&
          !hasDbId
        ) {
          // This should rarely trigger since handleSendMessage saves messages explicitly
          console.log('[Auto-save fallback] Saving message:', message.id);
          saveMessageToSession(message);
          // Mark as saved using updateMessage to ensure it's tracked in the store
          updateMessage(message.id, { saved: true });
        }
      }
      lastProcessedIndex = $messages.length;
    });
  });

  onDestroy(() => {
    if (messageUnsubscribe) {
      messageUnsubscribe();
    }
  });
</script>

<svelte:head>
  <title>Session {sessionId} - AI Tutor</title>
</svelte:head>

{#if $isAuthenticated && $user}
  <div class="session-page">
    {#if loading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading session...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <div class="error-content">
          <h2>Unable to Load Session</h2>
          <p>{error}</p>
          <button class="back-btn" on:click={goBackToSessions}>
            <ArrowLeft class="h-4 w-4" />
            Back to Sessions
          </button>
        </div>
      </div>
    {:else}
      <!-- Session Header -->
      <header class="session-header">
        <div class="header-left">
          <button class="back-btn" on:click={goBackToSessions} title="Back to sessions">
            <ArrowLeft class="h-4 w-4" />
          </button>
          <div class="session-info">
            <h1 class="session-title">{currentSession?.title || 'Untitled Session'}</h1>
            <div class="session-meta">
              {#if currentSession}
                {new Date(currentSession.updatedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
                {new Date(currentSession.updatedAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit'
                })} • {currentSession.messageCount || 0} messages • {currentSession.mode} mode
              {/if}
            </div>
          </div>
        </div>

        <div class="header-right">
          <!-- Chat Mode Toggle -->
          <div class="mode-toggle">
            <button
              class="mode-btn"
              class:active={$chatModeStore === 'text'}
              on:click={() => toggleChatMode('text')}
            >
              {getTranslation($selectedLanguage, 'textChat')}
            </button>
            <button
              class="mode-btn"
              class:active={$chatModeStore === 'voice'}
              on:click={() => toggleChatMode('voice')}
            >
              {getTranslation($selectedLanguage, 'voiceChat')}
            </button>
          </div>
        </div>
      </header>

      <!-- Chat Interface -->
      <main class="chat-container">
        {#if $chatModeStore === 'voice'}
          <div class="voice-chat-container">
            <VoiceChat {sessionId} />
          </div>
        {:else}
          <!-- Messages Area -->
          <div class="messages-area">
            <MessageList {sessionId} />
          </div>

          <!-- Input Area -->
          <div class="input-area">
            <MessageInput on:send={handleSendMessage} />
          </div>
        {/if}
      </main>
    {/if}
  </div>
{:else}
  <!-- Loading state while checking authentication -->
  <div class="auth-loading-page">
    <div class="auth-loading-content">
      <div class="loading-spinner"></div>
      <p>Checking authentication...</p>
    </div>
  </div>
{/if}

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .session-page {
    min-height: 100vh;
    background: #fafafa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
  }

  /* Loading State */
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    color: #666;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e5e5;
    border-top: 3px solid #ff9800;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Auth Loading State */
  .auth-loading-page {
    min-height: 100vh;
    background: #fafafa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .auth-loading-content {
    text-align: center;
    color: #666;
  }

  /* Error State */
  .error-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-content h2 {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 12px;
  }

  .error-content p {
    font-size: 16px;
    color: #666;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  /* Session Header */
  .session-header {
    background: #fff;
    border-bottom: 1px solid #e5e5e5;
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #f5f5f5;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .back-btn:hover {
    background: #ebebeb;
    border-color: #ccc;
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-title {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-meta {
    font-size: 13px;
    color: #999;
  }

  /* Chat Container */
  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #fff;
    margin: 20px 40px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    min-height: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
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
    padding: 0 16px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: 16px;
    font-size: 13px;
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

  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: #f5f5f5;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
  }

  .settings-btn:hover {
    background: #ebebeb;
    border-color: #ccc;
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
    min-height: 0;
  }

  .input-area {
    border-top: 1px solid #e5e5e5;
    background: #fff;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .session-header {
      padding: 16px 20px;
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .header-left {
      gap: 12px;
    }

    .session-title {
      font-size: 18px;
    }

    .header-right {
      justify-content: space-between;
    }

    .chat-container {
      margin: 16px 20px;
    }
  }

  /* Override MessageList and MessageInput styles to match design */
  :global(.session-page .messages-area > div) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :global(.session-page .message-list) {
    padding: 20px;
    height: 100%;
  }

  :global(.session-page .message-input-container) {
    padding: 15px 20px;
  }

  /* Ensure messages display properly with proper spacing */
  :global(.session-page .message) {
    margin-bottom: 16px;
  }

  :global(.session-page .message.user) {
    display: flex;
    justify-content: flex-end;
  }

  :global(.session-page .message.tutor),
  :global(.session-page .message.assistant) {
    display: flex;
    justify-content: flex-start;
  }

  /* Ensure MessageList takes full height and scrolls properly */
  :global(.session-page .messages-area .flex-1) {
    height: 100%;
    max-height: none;
  }

  /* Improve message bubble appearance */
  :global(.session-page .overflow-y-auto) {
    scrollbar-width: thin;
    scrollbar-color: #d1d5db transparent;
  }

  :global(.session-page .overflow-y-auto::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.session-page .overflow-y-auto::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.session-page .overflow-y-auto::-webkit-scrollbar-thumb) {
    background-color: #d1d5db;
    border-radius: 3px;
  }
</style>
