<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    Send,
    Loader2,
    AlertCircle,
    User,
    Bot,
    Mic,
    MicOff,
    MessageCircle,
    Image as ImageIcon
  } from 'lucide-svelte';
  import { chatStore, messageStats, isChatLoading, chatError } from '../stores/chatStore.js';
  import { sessionStore } from '../stores/sessionStore.js';
  import { darkMode } from '$lib/modules/theme/stores.js';
  import { formatDistanceToNow } from 'date-fns';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import CatAvatar from '$shared/components/CatAvatar.svelte';
  import MathRenderer from '$lib/components/MathRenderer.svelte';
  import {
    startRecording,
    stopRecording,
    sendTranscribedText,
    initAudioContext,
    isSpeaking,
    currentEmotion,
    isWaitingPhraseActive,
    getAudioQueueStatus,
    setVoiceModeActive,
    isVoiceModeActive
  } from '$lib/modules/chat/voiceServices';
  import { isRecording, selectedImages } from '$lib/modules/chat/stores';
  import {
    createVoiceMetadata,
    createImageMetadata,
    createAudioResponseMetadata,
    getAudioUrl,
    getImageUrls,
    hasAudio,
    hasImages,
    formatAudioDuration,
    extractImageMetadata
  } from '../utils/multimediaHelpers.js';

  // Props
  export let sessionId = null;

  // Local state
  let messageInput = '';
  let messagesContainer;
  let isInitialized = false;
  let autoScroll = true;
  let chatMode = 'text'; // 'text' | 'voice'
  let fileInput;
  let isProcessing = false;
  let waitingPhraseStatus = false;
  let audioQueueInfo = null;
  let statusUpdateInterval;

  // Cat avatar face positions
  const catFacePositions = {
    mouth: { x: 50, y: 65, width: 18, height: 8 },
    leftEye: { x: 38, y: 38, width: 12, height: 8 },
    rightEye: { x: 62, y: 38, width: 12, height: 8 }
  };

  // Update waiting phrase status periodically
  function updateWaitingPhraseStatus() {
    waitingPhraseStatus = isWaitingPhraseActive();
    audioQueueInfo = getAudioQueueStatus();
  }

  // Initialize chat when sessionId changes
  $: if (sessionId && !isInitialized) {
    initializeChat();
  }

  // Sync voice mode state with chat mode
  $: {
    setVoiceModeActive(chatMode === 'voice');
  }

  async function initializeChat() {
    try {
      isInitialized = true;
      await chatStore.initializeSession(sessionId);

      // Initialize audio context for voice mode
      initAudioContext();

      await tick();
      scrollToBottom();
    } catch (error) {
      console.error('[SessionChat] Failed to initialize:', error);
    }
  }

  // Toggle between text and voice mode
  function toggleChatMode(mode) {
    chatMode = mode;
    if (mode === 'voice') {
      // Start monitoring waiting phrase status
      updateWaitingPhraseStatus();
      statusUpdateInterval = setInterval(updateWaitingPhraseStatus, 200);
    } else {
      // Stop monitoring when switching to text mode
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
      }
    }
  }

  // Toggle between Fun and Learn modes
  async function toggleSessionMode(mode) {
    if ($sessionStore.currentSession && $sessionStore.currentSession.mode !== mode) {
      try {
        await sessionStore.updateSession(sessionId, { mode });
        await chatStore.setMode(mode);
      } catch (error) {
        console.error('[SessionChat] Failed to update session mode:', error);
      }
    }
  }

  // Handle voice recording
  async function toggleRecording() {
    if (!$isRecording) {
      // Start recording
      $isRecording = true;
      await startRecording();
    } else {
      // Stop recording and process audio
      $isRecording = false;
      isProcessing = true;

      try {
        const transcription = await stopRecording();
        if (transcription) {
          // Update status immediately to show processing
          updateWaitingPhraseStatus();

          // Create voice metadata for the user message
          const voiceMetadata = createVoiceMetadata({
            language: $sessionStore.currentSession?.language || $selectedLanguage,
            transcription: transcription,
            timestamp: new Date().toISOString()
          });

          // Add images to metadata if any are selected
          if ($selectedImages.length > 0) {
            const imageUrls = $selectedImages.map((img) => img.url);
            voiceMetadata.images = imageUrls;
          }

          // Add user message to chat store with voice metadata
          await chatStore.sendMessage(transcription, voiceMetadata);

          // Clear selected images after sending
          if ($selectedImages.length > 0) {
            $selectedImages = [];
          }

          // Send transcribed text (this will trigger waiting phrases and AI response)
          const response = await sendTranscribedText(transcription, sessionId);

          // Add AI response to chat store with audio metadata
          if (response) {
            // Note: Audio URL would be generated by the TTS service
            // For now, we'll add the response without audio URL
            // The audio playback is handled by voiceServices
            const audioMetadata = createAudioResponseMetadata({
              language: $sessionStore.currentSession?.language || $selectedLanguage,
              timestamp: new Date().toISOString()
            });

            await chatStore.addAssistantMessage(response, audioMetadata);
          }

          // Update status after processing
          updateWaitingPhraseStatus();
        }
      } catch (error) {
        console.error('Error processing voice:', error);
      } finally {
        isProcessing = false;
        updateWaitingPhraseStatus();
      }
    }
  }

  // Handle image upload
  async function handleImageUpload(event) {
    const files = Array.from(event.target.files);

    // Extract metadata for each image
    const fileObjects = await Promise.all(
      files.map(async (file) => {
        try {
          const metadata = await extractImageMetadata(file);
          return {
            url: URL.createObjectURL(file),
            type: file.type,
            name: file.name,
            size: metadata.size,
            dimensions: {
              width: metadata.width,
              height: metadata.height
            }
          };
        } catch (error) {
          console.error('Failed to extract image metadata:', error);
          // Fallback without metadata
          return {
            url: URL.createObjectURL(file),
            type: file.type,
            name: file.name
          };
        }
      })
    );

    $selectedImages = [...$selectedImages, ...fileObjects];
    fileInput.value = null;
  }

  // Auto-scroll to bottom when new messages arrive
  $: if ($chatStore.messages.length > 0 && autoScroll) {
    tick().then(() => scrollToBottom());
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function handleScroll() {
    if (!messagesContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    autoScroll = isAtBottom;
  }

  async function handleSendMessage(event) {
    event?.preventDefault();

    if (!messageInput.trim() || $isChatLoading) {
      return;
    }

    const content = messageInput.trim();
    const images = $selectedImages.length > 0 ? $selectedImages : null;
    messageInput = '';

    try {
      // Create metadata for message with images
      let metadata = null;
      if (images && images.length > 0) {
        metadata = createImageMetadata({
          imageUrl: images.map((img) => img.url),
          imageType: images[0]?.type,
          imageSize: images[0]?.size,
          imageDimensions: images[0]?.dimensions
        });
      }

      // Send user message with metadata
      await chatStore.sendMessage(content, metadata);

      // Clear selected images after sending
      if ($selectedImages.length > 0) {
        $selectedImages = [];
      }

      // Prepare conversation history for context (AFTER adding current message)
      // Wait a tick to ensure the message is in the store
      await tick();

      const conversationHistory = $messages
        .filter((msg) => msg.type === 'user' || msg.type === 'assistant')
        .slice(-10) // Last 10 messages for context
        .map((msg) => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Call AI service to get response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          images: images ? images.map((img) => img.url) : null,
          language: $sessionStore.currentSession?.language || $selectedLanguage,
          sessionId: sessionId,
          sessionContext: {
            sessionId: sessionId,
            history: conversationHistory
          }
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Add AI response to chat with metadata
        if (data.response) {
          const responseMetadata = createAudioResponseMetadata({
            language: $sessionStore.currentSession?.language || $selectedLanguage,
            timestamp: new Date().toISOString()
          });

          await chatStore.addAssistantMessage(data.response, responseMetadata);
        }
      }

      autoScroll = true;
      await tick();
      scrollToBottom();
    } catch (error) {
      console.error('[SessionChat] Failed to send message:', error);
    }
  }

  function handleKeyDown(event) {
    // Send on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  function formatMessageTime(timestamp) {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return '';
    }
  }

  function getMessageClasses(type) {
    const baseClasses = 'flex gap-3 p-4 rounded-lg';

    if (type === 'user') {
      return `${baseClasses} ${$darkMode ? 'bg-amber-900/20' : 'bg-amber-50'}`;
    } else {
      return `${baseClasses} ${$darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`;
    }
  }

  onMount(() => {
    if (sessionId) {
      initializeChat();
    }
  });

  onDestroy(() => {
    // Clear chat state when component is destroyed
    chatStore.clearSession();
    isInitialized = false;

    // Clean up voice mode
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
    }
    setVoiceModeActive(false);
  });
</script>

<div class="flex flex-col h-full {$darkMode ? 'bg-gray-800' : 'bg-white'}">
  <!-- Chat Header with Mode Switcher -->
  <div class="flex flex-col border-b {$darkMode ? 'border-gray-700' : 'border-stone-200'}">
    <div class="flex items-center justify-between p-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-stone-600'}">
            {$sessionStore.currentSession?.title || 'Chat Session'}
          </span>
          {#if $sessionStore.currentSession?.mode}
            <!-- Mode Switcher Dropdown -->
            <div class="relative inline-block">
              <select
                value={$sessionStore.currentSession.mode}
                on:change={(e) => toggleSessionMode(e.target.value)}
                class="px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors
                  {$sessionStore.currentSession.mode === 'fun'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'}
                  border-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="fun">Fun Mode</option>
                <option value="learn">Learn Mode</option>
              </select>
            </div>
          {/if}
        </div>
      </div>

      {#if $messageStats.total > 0}
        <div class="text-xs {$darkMode ? 'text-gray-400' : 'text-stone-500'}">
          {$messageStats.total}
          {$messageStats.total === 1 ? 'message' : 'messages'}
        </div>
      {/if}
    </div>

    <!-- Mode Toggle -->
    <div class="flex justify-center pb-3">
      <div class="{$darkMode ? 'bg-gray-700' : 'bg-stone-100'} rounded-lg p-1 inline-flex">
        <button
          on:click={() => toggleChatMode('text')}
          class="px-4 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2 {chatMode ===
          'text'
            ? 'bg-amber-600 text-white shadow-sm'
            : $darkMode
              ? 'text-gray-300 hover:text-amber-400'
              : 'text-stone-600 hover:text-amber-700'}"
        >
          <MessageCircle class="w-4 h-4" />
          <span>{getTranslation($selectedLanguage, 'textChat') || 'Text'}</span>
        </button>
        <button
          on:click={() => toggleChatMode('voice')}
          class="px-4 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2 {chatMode ===
          'voice'
            ? 'bg-amber-600 text-white shadow-sm'
            : $darkMode
              ? 'text-gray-300 hover:text-amber-400'
              : 'text-stone-600 hover:text-amber-700'}"
        >
          <Mic class="w-4 h-4" />
          <span>{getTranslation($selectedLanguage, 'voiceChat') || 'Voice'}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Voice Mode Header with CatAvatar -->
  {#if chatMode === 'voice'}
    <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center">
      <div class="flex justify-center mb-4">
        <CatAvatar
          size="lg"
          speaking={$isSpeaking}
          emotion={$currentEmotion}
          facePositions={catFacePositions}
        />
      </div>
      <h3 class="text-white text-lg font-semibold mb-1">
        {getTranslation($selectedLanguage, 'voiceChatMode') || 'Voice Chat Mode'}
      </h3>
      <p class="text-amber-100 text-sm">
        {getTranslation($selectedLanguage, 'talkToTutor') || 'Talk to your AI tutor'}
      </p>

      <!-- Waiting phrase status indicator -->
      {#if waitingPhraseStatus && audioQueueInfo}
        <div class="mt-3 flex justify-center">
          <div class="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>{getTranslation($selectedLanguage, 'thinking') || 'Thinking...'}</span>
              {#if audioQueueInfo.waitingPhrases > 0}
                <span class="text-xs opacity-75">({audioQueueInfo.waitingPhrases} phrases)</span>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Selected Files Preview -->
    {#if $selectedImages.length > 0}
      <div
        class="p-4 flex flex-wrap gap-2 border-b {$darkMode
          ? 'border-gray-700'
          : 'border-stone-200'}"
      >
        {#each $selectedImages as file, index}
          <div class="relative">
            {#if file.type.startsWith('image/')}
              <img src={file.url} alt="Selected" class="w-16 h-16 object-cover rounded-lg" />
            {:else if file.type === 'application/pdf'}
              <div
                class="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <div class="text-red-500 font-bold text-xs text-center">
                  <div class="text-2xl">PDF</div>
                  <div class="truncate w-14 overflow-hidden" title={file.name}>
                    {file.name.length > 10 ? file.name.substring(0, 7) + '...' : file.name}
                  </div>
                </div>
              </div>
            {:else}
              <div
                class="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <div class="text-gray-500 font-bold text-xs text-center">
                  <div class="text-2xl">File</div>
                  <div class="truncate w-14 overflow-hidden" title={file.name}>
                    {file.name.length > 10 ? file.name.substring(0, 7) + '...' : file.name}
                  </div>
                </div>
              </div>
            {/if}
            <button
              on:click={() => ($selectedImages = $selectedImages.filter((_, i) => i !== index))}
              class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              aria-label="Remove file"
            >
              ×
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- Messages Container -->
  <div
    bind:this={messagesContainer}
    on:scroll={handleScroll}
    class="flex-1 overflow-y-auto p-4 space-y-4"
  >
    {#if $isChatLoading && $chatStore.messages.length === 0}
      <!-- Loading State -->
      <div class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center gap-3">
          <Loader2 class="w-8 h-8 animate-spin {$darkMode ? 'text-gray-400' : 'text-stone-400'}" />
          <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-stone-500'}">
            Loading messages...
          </p>
        </div>
      </div>
    {:else if $chatError}
      <!-- Error State -->
      <div class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center gap-3 max-w-md text-center">
          <AlertCircle class="w-8 h-8 {$darkMode ? 'text-red-400' : 'text-red-500'}" />
          <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-stone-700'}">
            {$chatError}
          </p>
          <button
            on:click={() => initializeChat()}
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors
              {$darkMode
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}"
          >
            Try Again
          </button>
        </div>
      </div>
    {:else if $chatStore.messages.length === 0}
      <!-- Empty State -->
      <div class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center gap-3 max-w-md text-center">
          <Bot class="w-12 h-12 {$darkMode ? 'text-gray-600' : 'text-stone-300'}" />
          <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-stone-500'}">
            No messages yet. Start the conversation!
          </p>
        </div>
      </div>
    {:else}
      <!-- Messages List -->
      {#each $chatStore.messages as message (message.id)}
        <div class={getMessageClasses(message.type)}>
          <!-- Avatar -->
          <div class="flex-shrink-0">
            {#if message.type === 'user'}
              <div class="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
                <User class="w-5 h-5 text-white" />
              </div>
            {:else}
              <div
                class="w-8 h-8 rounded-full {$darkMode
                  ? 'bg-gray-600'
                  : 'bg-stone-300'} flex items-center justify-center"
              >
                <Bot class="w-5 h-5 {$darkMode ? 'text-gray-200' : 'text-stone-600'}" />
              </div>
            {/if}
          </div>

          <!-- Message Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 mb-1">
              <span class="text-sm font-medium {$darkMode ? 'text-gray-200' : 'text-stone-900'}">
                {message.type === 'user' ? 'You' : 'AI Tutor'}
              </span>
              {#if message.createdAt}
                <span class="text-xs {$darkMode ? 'text-gray-500' : 'text-stone-400'}">
                  {formatMessageTime(message.createdAt)}
                </span>
              {/if}
            </div>

            <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-stone-700'} break-words">
              <MathRenderer content={message.content} className="whitespace-pre-wrap" />
            </div>

            <!-- Multimedia Content -->
            {#if message.metadata}
              <div class="mt-2 space-y-2">
                <!-- Audio Playback -->
                {#if hasAudio(message)}
                  {@const audioUrl = getAudioUrl(message.metadata)}
                  <div
                    class="flex items-center gap-2 p-2 rounded-lg {$darkMode
                      ? 'bg-gray-800'
                      : 'bg-stone-100'}"
                  >
                    <audio controls class="w-full max-w-md">
                      <source src={audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    {#if message.metadata.duration}
                      <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-stone-500'}">
                        {formatAudioDuration(message.metadata.duration)}
                      </span>
                    {/if}
                  </div>
                {/if}

                <!-- Image Display -->
                {#if hasImages(message)}
                  {@const imageUrls = getImageUrls(message.metadata)}
                  <div class="flex flex-wrap gap-2">
                    {#each imageUrls as imageUrl, index}
                      <div class="relative group">
                        <img
                          src={imageUrl}
                          alt="Message attachment {index + 1}"
                          class="max-w-xs max-h-64 rounded-lg border {$darkMode
                            ? 'border-gray-600'
                            : 'border-stone-200'} object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          on:click={() => {
                            // Could open in modal/lightbox
                            window.open(imageUrl, '_blank');
                          }}
                        />
                        {#if message.metadata.images?.[index]?.dimensions}
                          <div
                            class="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {message.metadata.images[index].dimensions.width}×{message.metadata
                              .images[index].dimensions.height}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}

                <!-- Voice Input Indicator -->
                {#if message.metadata.type === 'voice' && message.type === 'user'}
                  <div
                    class="flex items-center gap-1 text-xs {$darkMode
                      ? 'text-gray-400'
                      : 'text-stone-500'}"
                  >
                    <Mic class="w-3 h-3" />
                    <span>Voice message</span>
                    {#if message.metadata.language}
                      <span>• {message.metadata.language.toUpperCase()}</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}

      <!-- Typing Indicator -->
      {#if $chatStore.isTyping}
        <div class={getMessageClasses('assistant')}>
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 rounded-full {$darkMode
                ? 'bg-gray-600'
                : 'bg-stone-300'} flex items-center justify-center"
            >
              <Bot class="w-5 h-5 {$darkMode ? 'text-gray-200' : 'text-stone-600'}" />
            </div>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-1">
              <div
                class="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                style="animation-delay: 0ms"
              ></div>
              <div
                class="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                style="animation-delay: 150ms"
              ></div>
              <div
                class="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                style="animation-delay: 300ms"
              ></div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Message Input / Voice Controls -->
  {#if chatMode === 'text'}
    <div class="border-t {$darkMode ? 'border-gray-700' : 'border-stone-200'} p-4">
      <form on:submit={handleSendMessage} class="flex gap-2">
        <textarea
          bind:value={messageInput}
          on:keydown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          rows="1"
          disabled={$isChatLoading}
          class="flex-1 px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all
            {$darkMode
            ? 'bg-gray-700 text-gray-200 placeholder-gray-400 border-gray-600'
            : 'bg-white text-stone-900 placeholder-stone-400 border-stone-300'} 
            border disabled:opacity-50 disabled:cursor-not-allowed"
          style="min-height: 48px; max-height: 200px;"
        />

        <button
          type="submit"
          disabled={!messageInput.trim() || $isChatLoading}
          class="px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center
            {messageInput.trim() && !$isChatLoading
            ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'}"
        >
          {#if $isChatLoading}
            <Loader2 class="w-5 h-5 animate-spin" />
          {:else}
            <Send class="w-5 h-5" />
          {/if}
        </button>
      </form>

      <p class="mt-2 text-xs {$darkMode ? 'text-gray-500' : 'text-stone-400'}">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  {:else}
    <!-- Voice Controls -->
    <div
      class="flex items-center justify-center space-x-4 p-6 border-t {$darkMode
        ? 'border-gray-700'
        : 'border-stone-200'}"
    >
      <input
        type="file"
        bind:this={fileInput}
        on:change={handleImageUpload}
        accept="image/*,application/pdf"
        multiple
        class="hidden"
      />
      <button
        on:click={() => fileInput.click()}
        class="p-3 transition-colors {$darkMode
          ? 'text-gray-400 hover:text-amber-400'
          : 'text-stone-500 hover:text-amber-600'}"
        aria-label="Upload image"
        disabled={$isRecording || isProcessing}
      >
        <ImageIcon class="w-6 h-6" />
      </button>
      <button
        on:click={toggleRecording}
        class="p-4 rounded-full transition-all {$isRecording
          ? 'bg-red-500 text-white shadow-lg scale-110'
          : isProcessing
            ? 'bg-amber-400 text-white'
            : 'bg-amber-600 text-white hover:bg-amber-700'}"
        aria-label={$isRecording
          ? 'Stop recording'
          : isProcessing
            ? 'Processing'
            : 'Start recording'}
        disabled={isProcessing}
      >
        {#if $isRecording}
          <MicOff class="w-6 h-6" />
        {:else}
          <Mic class="w-6 h-6" />
        {/if}
      </button>
      <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-stone-600'}">
        {#if $isRecording}
          {getTranslation($selectedLanguage, 'recording') || 'Recording...'}
        {:else if isProcessing}
          {#if waitingPhraseStatus}
            <span class="text-amber-600 dark:text-amber-400">
              {getTranslation($selectedLanguage, 'thinking') || 'Thinking...'}
            </span>
          {:else}
            {getTranslation($selectedLanguage, 'processing') || 'Processing...'}
          {/if}
        {:else}
          {getTranslation($selectedLanguage, 'holdToRecord') || 'Click to record'}
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  textarea {
    field-sizing: content;
  }

  /* Fallback for browsers that don't support field-sizing */
  @supports not (field-sizing: content) {
    textarea {
      overflow-y: auto;
    }
  }
</style>
