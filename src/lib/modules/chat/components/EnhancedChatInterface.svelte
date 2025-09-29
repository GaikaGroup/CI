<script>
  import { onMount } from 'svelte';
  import { MessageCircle, Mic, Globe, RotateCcw, Bot, Users } from 'lucide-svelte';
  import {
    chatMode,
    messages,
    addMessage,
    initializeChat,
    processingImagesMap,
    ocrNotes,
    setProcessingImages,
    setOcrNote,
    updateMessage
  } from '../stores';
  import { selectedLanguage, languages } from '$modules/i18n/stores';
  import { darkMode } from '$modules/theme/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import { CHAT_MODES, MESSAGE_TYPES } from '$shared/utils/constants';
  import { sendMessageWithOCRContext } from '../enhancedServices';
  import { setVoiceModeActive } from '../voiceServices';
  import { container } from '$lib/shared/di/container';
  import { LLM_FEATURES } from '$lib/config/llm';
  import { ensureProviderManager } from '$modules/llm/ensureProviderManager.js';

  import LanguageSelector from '$modules/i18n/components/LanguageSelector.svelte';
  import MessageList from './MessageList.svelte';
  import MessageInput from './MessageInput.svelte';
  import VoiceChat from './VoiceChat.svelte';
  import Button from '$shared/components/Button.svelte';
  import { browser } from '$app/environment';
  import { appMode } from '$lib/stores/mode';
  import { examProfile } from '$lib/stores/examProfile';
  import { agentCommunicationService } from '$modules/courses/services/AgentCommunicationService.js';
  import { user } from '$modules/auth/stores';

  // Session ID for maintaining conversation context
  let sessionId;

  let showLanguageSelector = false;
  let showDetailedPrompt = false;
  let lastQuestion = '';

  // Provider selection
  let selectedProvider = null;
  let availableProviders = [];

  // Agent communication state
  let currentSubject = null;
  let activeAgents = [];

  // Get available providers on mount
  onMount(async () => {
    if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && browser) {
      try {
        const providerManager = await ensureProviderManager();
        availableProviders = providerManager.listProviders();
        selectedProvider = providerManager.defaultProvider;
        console.log('Available LLM providers:', availableProviders);
      } catch (error) {
        console.error('Error getting available providers:', error);
      }
    }
  });

  // Update current subject when exam profile changes
  $: if ($examProfile) {
    // Get the full subject data from the subjects store
    import('$lib/stores/subjects').then(({ subjectsStore }) => {
      subjectsStore.subscribe((subjects) => {
        currentSubject = subjects.find((s) => s.id === $examProfile.subjectId);
        if (currentSubject) {
          activeAgents = currentSubject.agents || [];
          console.log(
            'Updated current subject and agents:',
            currentSubject.name,
            activeAgents.length
          );
        }
      });
    });
  }

  // Initialize chat when language is selected
  const formatModeNote = () => {
    if ($appMode === 'learn' || $appMode === 'catalogue') {
      if ($examProfile) {
        const key = $examProfile.mode === 'exam' ? 'learnModeExamNote' : 'learnModePracticeNote';
        let note = getTranslation($selectedLanguage, key).replace(
          '{subject}',
          $examProfile.subjectName
        );

        // Add agent information if available
        if (currentSubject && activeAgents.length > 0) {
          if (activeAgents.length === 1) {
            note += ` I'm assisted by ${activeAgents[0].name}, ${activeAgents[0].description}.`;
          } else {
            note += ` I'm assisted by ${activeAgents.length} specialized agents`;
            if (currentSubject.orchestrationAgent) {
              note += ` coordinated by ${currentSubject.orchestrationAgent.name}`;
            }
            note += '.';
          }
        }

        return note;
      }
      return getTranslation($selectedLanguage, 'learnModeDefaultNote');
    }
    return getTranslation($selectedLanguage, 'funModeNote');
  };

  $: if ($selectedLanguage && $messages.length === 0) {
    const welcomeMessage = getTranslation($selectedLanguage, 'welcomeMessage');
    const modeNote = formatModeNote();
    initializeChat(`${welcomeMessage} ${modeNote}`.trim());
  }

  $: if (
    browser &&
    sessionId &&
    ($appMode === 'learn' || $appMode === 'catalogue') &&
    container.has('sessionFactory')
  ) {
    try {
      const sessionFactory = container.resolve('sessionFactory');
      const session = sessionFactory.getOrCreateSession(sessionId);
      session.updateContext({
        examProfile: $examProfile,
        currentSubject,
        activeAgents
      });
    } catch (error) {
      console.warn('[EnhancedChatInterface] Failed to persist context in session', error);
    }
  }

  $: activeExamMode = $examProfile
    ? $examProfile.mode === 'exam'
      ? $examProfile.exam
      : $examProfile.practice
    : null;

  $: currentModeLabel = $examProfile
    ? getTranslation(
        $selectedLanguage,
        $examProfile.mode === 'exam' ? 'learnModeExamLabel' : 'learnModePracticeLabel'
      )
    : '';

  $: chatSkillsLabel = $examProfile?.skills?.length
    ? `${getTranslation($selectedLanguage, 'learnModeActiveSkills')}: ${$examProfile.skills.join(', ')}`
    : '';

  $: chatWordGoal = activeExamMode?.minWords
    ? getTranslation($selectedLanguage, 'learnModeActiveWordGoal').replace(
        '{words}',
        activeExamMode.minWords
      )
    : '';

  // Enhanced message processing with agent communication
  async function processMessageWithAgents(content, images, messageId) {
    try {
      // If we have a current subject with agents, use agent communication
      if (currentSubject && activeAgents.length > 0 && $user) {
        console.log('Processing message with agents:', activeAgents.length);

        const result = await agentCommunicationService.processStudentMessage(
          content,
          currentSubject.id,
          $user.id,
          currentSubject
        );

        if (result.success) {
          // Add agent response message
          const agentMessage = result.response.content;

          addMessage(MESSAGE_TYPES.TUTOR, agentMessage, [], Date.now(), {
            agentId: result.response.agentId,
            agentName: result.response.agentName,
            contributingAgents: result.response.contributingAgents,
            ragUsed: result.response.ragUsed,
            sources: result.response.sources,
            confidence: result.response.confidence
          });

          return result;
        } else {
          console.error('Agent communication failed:', result.error);
          // Fallback to regular chat processing
          return await processRegularMessage(content, images);
        }
      } else {
        // No agents configured, use regular chat processing
        return await processRegularMessage(content, images);
      }
    } catch (error) {
      console.error('Error processing message with agents:', error);
      // Fallback to regular chat processing
      return await processRegularMessage(content, images, messageId);
    }
  }

  // Regular message processing (fallback)
  async function processRegularMessage(content, images) {
    // Import services dynamically to avoid circular dependencies
    const { sendMessage } = await import('../services');

    // Use the session ID when sending messages
    if (sessionId) {
      console.log('Sending message with session ID:', sessionId);
      // Pass selected provider if provider switching is enabled
      if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
        console.log(`Using selected provider: ${selectedProvider}`);
        return await sendMessage(content, images, sessionId, selectedProvider);
      } else {
        return await sendMessage(content, images, sessionId);
      }
    } else {
      console.log('Sending message without session ID');
      // Pass selected provider if provider switching is enabled
      if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
        console.log(`Using selected provider: ${selectedProvider}`);
        return await sendMessage(content, images, null, selectedProvider);
      } else {
        return await sendMessageWithOCRContext(content, images);
      }
    }
  }

  // Process images for a message
  async function processImages(messageContent, images, messageId) {
    try {
      console.log('Processing images for message:', messageId);
      console.log('Images to process:', images);

      // Check if this message is already being processed or has been processed
      if ($processingImagesMap[messageId]) {
        console.log('Message is already being processed, skipping:', messageId);
        return false;
      }

      if ($ocrNotes[messageId]) {
        console.log('Message has already been processed, skipping:', messageId);
        return true;
      }

      // Set processing state
      console.log(`[STORE] setProcessingImages for ${messageId}:`, true);
      setProcessingImages(messageId, true);

      // Add ocrRequested flag to the message to prevent duplicate processing
      console.log(`[STORE] updateMessage for ${messageId}:`, { ocrRequested: true });
      updateMessage(messageId, { ocrRequested: true });

      // Process with agents if available, otherwise use regular processing
      const result = await processMessageWithAgents(messageContent, images, messageId);

      console.log('Image processing completed successfully:', result);

      // Mark the message as processed and store the OCR result
      console.log(`[STORE] setOcrNote for ${messageId}:`, 'OCR processing complete');
      setOcrNote(messageId, 'OCR processing complete');

      // Update the message to indicate OCR is complete
      console.log(`[STORE] updateMessage for ${messageId}:`, { ocrProcessed: true });
      updateMessage(messageId, { ocrProcessed: true });

      return result;
    } catch (error) {
      console.error('Image processing failed:', error);

      // Show error in console but don't add a system message
      console.error(`Image processing failed: ${error.message}`);

      // Store the error in the OCR note
      console.log(
        `[STORE] setOcrNote for ${messageId} (error):`,
        `OCR processing failed: ${error.message}`
      );
      setOcrNote(messageId, `OCR processing failed: ${error.message}`);

      // Update the message to indicate OCR failed
      console.log(`[STORE] updateMessage for ${messageId} (error):`, {
        ocrProcessed: false,
        ocrError: error.message
      });
      updateMessage(messageId, { ocrProcessed: false, ocrError: error.message });

      throw error;
    } finally {
      console.log('Image processing finished, resetting processing state');
      console.log(`[STORE] setProcessingImages for ${messageId} (finally):`, false);
      setProcessingImages(messageId, false);
    }
  }

  // Check for messages with unprocessed images when component mounts
  onMount(() => {
    console.log('EnhancedChatInterface mounted, checking for messages with unprocessed images');

    // Initialize voice mode active state based on current chat mode
    setVoiceModeActive($chatMode === CHAT_MODES.VOICE);
    console.log('Initialized voice mode active state:', $chatMode === CHAT_MODES.VOICE);

    // Initialize session ID for maintaining conversation context
    if (browser) {
      // Try to get existing session ID from localStorage
      const savedSessionId = localStorage.getItem('sessionId');
      if (savedSessionId) {
        console.log('Using existing session ID:', savedSessionId);
        sessionId = savedSessionId;
      } else {
        // Create a new session ID
        if (container.has('sessionFactory')) {
          const sessionFactory = container.resolve('sessionFactory');
          const session = sessionFactory.getOrCreateSession();
          sessionId = session.getSessionId();
          console.log('Created new session ID:', sessionId);
          // Save session ID to localStorage
          localStorage.setItem('sessionId', sessionId);
        } else {
          // Fallback if session factory is not available
          sessionId = Date.now().toString() + Math.random().toString(36).substring(2, 15);
          console.log('Created fallback session ID:', sessionId);
          localStorage.setItem('sessionId', sessionId);
        }
      }

      // Load chat history from session if available
      if (sessionId && $messages.length === 0) {
        import('../services').then(({ getChatHistory }) => {
          getChatHistory(sessionId).then((history) => {
            if (history && history.length > 0) {
              console.log('Loaded chat history from session:', history.length, 'messages');
              // Replace messages store with history
              messages.set(history);
            }
          });
        });
      }
    }

    if (browser) {
      console.log('Running in browser environment, messages:', $messages.length);

      // Find all user messages with images that haven't been processed yet
      const messagesWithUnprocessedImages = [...$messages].filter(
        (message) =>
          message.type === MESSAGE_TYPES.USER &&
          message.images &&
          message.images.length > 0 &&
          !message.ocrProcessed &&
          !$ocrNotes[message.id] &&
          !$processingImagesMap[message.id]
      );

      console.log('Found messages with unprocessed images:', messagesWithUnprocessedImages.length);

      // Process each message with unprocessed images
      if (messagesWithUnprocessedImages.length > 0) {
        // Process only the most recent message to avoid multiple processing
        const mostRecentMessage =
          messagesWithUnprocessedImages[messagesWithUnprocessedImages.length - 1];
        console.log('Processing images for most recent message:', mostRecentMessage);

        processImages(
          mostRecentMessage.content,
          mostRecentMessage.images,
          mostRecentMessage.id
        ).catch((error) => {
          console.error('Failed to process images on mount:', error);
        });
      }
    }
  });

  function handleSendMessage(event) {
    const { content, images } = event.detail;

    showDetailedPrompt = false;
    // Add user message
    const messageId = Date.now(); // Generate a unique ID for the message

    // If the message has images, add ocrRequested flag to prevent duplicate processing
    if (images && images.length > 0) {
      // Extract URLs from image objects
      const imageUrls = images.map((img) => img.url);

      // Store the original image objects for display
      addMessage(MESSAGE_TYPES.USER, content, images, messageId, {
        ocrRequested: false,
        ocrProcessed: false
      });

      console.log('Message has images, processing...');
      // Don't set processing state here, let processImages handle it

      // Pass the image URLs to processImages
      processImages(content, imageUrls, Date.now())
        .then(() => {
          lastQuestion = content;
          showDetailedPrompt = true;
        })
        .catch((error) => {
          console.error('Failed to process images:', error);
          // Make sure to reset processing state on error
          setProcessingImages(messageId, false);
        });
    } else {
      // If no images, just send the message normally but with enhanced context
      addMessage(MESSAGE_TYPES.USER, content, images, messageId);

      // Process with agents if available
      processMessageWithAgents(content, [], Date.now())
        .then(() => {
          lastQuestion = content;
          showDetailedPrompt = true;
        })
        .catch((error) => {
          console.error('Failed to process message:', error);
        });
    }
  }

  function requestDetailed() {
    showDetailedPrompt = false;

    // Build a more explicit prompt for detailed explanations
    const prompt =
      lastQuestion + '\n\nPlease provide an in-depth, multi-paragraph explanation with examples.';

    // Process detailed request with agents if available
    processMessageWithAgents(prompt, [], Date.now()).catch((error) => {
      console.error('Failed to process detailed request:', error);
    });
  }

  // These functions are now just for logging purposes
  // The actual implementation is in the VoiceChat component
  function handleStartRecording() {
    console.log('Recording started');
  }

  function handleStopRecording() {
    console.log('Recording stopped');
  }

  function getCurrentLanguage() {
    return languages.find((lang) => lang.code === $selectedLanguage);
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Mode Toggle -->
  <div class="flex justify-center mb-8">
    <div
      class="{$darkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-stone-200'} rounded-xl p-2 shadow-sm border"
    >
      <Button
        on:click={() => {
          $chatMode = CHAT_MODES.TEXT;
          setVoiceModeActive(false);
          console.log('Switched to text mode, voice mode active:', false);
        }}
        variant={$chatMode === CHAT_MODES.TEXT ? 'primary' : 'text'}
        class="px-6 py-3 rounded-lg font-medium transition-all {$chatMode === CHAT_MODES.TEXT
          ? 'bg-amber-600 text-white shadow-sm'
          : $darkMode
            ? 'text-gray-300 hover:text-amber-400 hover:bg-gray-700'
            : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'}"
      >
        <div class="flex items-center">
          <MessageCircle class="w-5 h-5 mr-2" />
          <span>{getTranslation($selectedLanguage, 'textChat')}</span>
        </div>
      </Button>
      <Button
        on:click={() => {
          $chatMode = CHAT_MODES.VOICE;
          setVoiceModeActive(true);
          console.log('Switched to voice mode, voice mode active:', true);
        }}
        variant={$chatMode === CHAT_MODES.VOICE ? 'primary' : 'text'}
        class="px-6 py-3 rounded-lg font-medium transition-all {$chatMode === CHAT_MODES.VOICE
          ? 'bg-amber-600 text-white shadow-sm'
          : $darkMode
            ? 'text-gray-300 hover:text-amber-400 hover:bg-gray-700'
            : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'}"
      >
        <div class="flex items-center">
          <Mic class="w-5 h-5 mr-2" />
          <span>{getTranslation($selectedLanguage, 'voiceChat')}</span>
        </div>
      </Button>
    </div>
  </div>

  {#if ($appMode === 'learn' || $appMode === 'catalogue') && $examProfile}
    <div
      class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-1">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
          >
            {currentModeLabel}
          </p>
          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
            {$examProfile.subjectName}
          </h3>
          {#if chatSkillsLabel}
            <p class="text-xs text-stone-600 dark:text-gray-300">{chatSkillsLabel}</p>
          {/if}
          {#if chatWordGoal}
            <p class="text-xs text-stone-500 dark:text-gray-400">{chatWordGoal}</p>
          {/if}

          <!-- Agent Information -->
          {#if activeAgents.length > 0}
            <div class="flex items-center gap-2 mt-2">
              {#if activeAgents.length === 1}
                <Bot class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span class="text-xs text-stone-600 dark:text-gray-300">
                  Assisted by {activeAgents[0].name}
                </span>
              {:else}
                <Users class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span class="text-xs text-stone-600 dark:text-gray-300">
                  {activeAgents.length} specialized agents
                  {#if currentSubject?.orchestrationAgent}
                    + orchestration
                  {/if}
                </span>
              {/if}
            </div>
          {/if}
        </div>
        {#if activeExamMode?.summary}
          <p class="text-sm text-stone-700 dark:text-gray-200 sm:w-2/3">{activeExamMode.summary}</p>
        {/if}
      </div>
      {#if activeExamMode?.instructions}
        <p class="mt-3 text-xs text-stone-600 dark:text-gray-300">
          <span class="font-semibold">
            {getTranslation($selectedLanguage, 'learnModeActiveInstructions')}:
          </span>
          <span class="ml-1">{activeExamMode.instructions}</span>
        </p>
      {/if}
    </div>
  {/if}

  <!-- Chat Interface -->
  <div
    class="{$darkMode
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-stone-200'} rounded-2xl shadow-sm border overflow-hidden"
  >
    <!-- Language Indicator and Change Button -->
    {#if $selectedLanguage && !showLanguageSelector}
      <div
        class="flex items-center justify-between px-4 py-3 border-b {$darkMode
          ? 'border-gray-700 bg-gray-750'
          : 'border-stone-200 bg-stone-50'}"
      >
        <div class="flex items-center space-x-2">
          <Globe class="w-4 h-4 {$darkMode ? 'text-gray-400' : 'text-stone-500'}" />
          <span class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-stone-600'}">
            {getCurrentLanguage()?.flag}
            {getCurrentLanguage()?.name}
          </span>
        </div>
        <button
          on:click={() => (showLanguageSelector = true)}
          class="flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors {$darkMode
            ? 'text-gray-400 hover:text-amber-400 hover:bg-gray-700'
            : 'text-stone-500 hover:text-amber-600 hover:bg-stone-100'}"
        >
          <RotateCcw class="w-3 h-3" />
          <span>{getTranslation($selectedLanguage, 'changeLanguage')}</span>
        </button>
      </div>
    {/if}

    {#if !$selectedLanguage || showLanguageSelector}
      <LanguageSelector bind:showSelector={showLanguageSelector} />
    {:else if $chatMode === CHAT_MODES.TEXT}
      <MessageList />
      {#if showDetailedPrompt}
        <div class="px-4 py-2 text-center">
          <button class="text-sm text-amber-600 underline" on:click={requestDetailed}>
            Need a more detailed explanation?
          </button>
        </div>
      {/if}
      <MessageInput on:send={handleSendMessage} />
    {:else if $chatMode === CHAT_MODES.VOICE}
      <VoiceChat on:startRecording={handleStartRecording} on:stopRecording={handleStopRecording} />
    {/if}
  </div>
</div>
