<script>
  import { onMount } from 'svelte';
  import { MessageCircle, Mic, Globe, RotateCcw } from 'lucide-svelte';
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
  import { OPENAI_CONFIG } from '$lib/config/api';
  import LanguageSelector from '$modules/i18n/components/LanguageSelector.svelte';
  import MessageList from './MessageList.svelte';
  import MessageInput from './MessageInput.svelte';
  import VoiceChat from './VoiceChat.svelte';
  import Button from '$shared/components/Button.svelte';
  import { browser } from '$app/environment';
  import { appMode } from '$lib/stores/mode';
  import { examProfile } from '$lib/stores/examProfile';

  // Session ID for maintaining conversation context
  let sessionId;

  let showLanguageSelector = false;
  let showDetailedPrompt = false;
  let lastQuestion = '';

  // Provider selection
  let selectedProvider = null;
  let availableProviders = [];

  // Get available providers on mount
  onMount(async () => {
    if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && browser) {
      try {
        const providerManager = container.resolve('llmProviderManager');
        availableProviders = providerManager.listProviders();
        selectedProvider = providerManager.defaultProvider;
        console.log('Available LLM providers:', availableProviders);
      } catch (error) {
        console.error('Error getting available providers:', error);
      }
    }
  });

  // Initialize chat when language is selected
  const formatModeNote = () => {
    if ($appMode === 'learn') {
      if ($examProfile) {
        const key = $examProfile.mode === 'exam' ? 'learnModeExamNote' : 'learnModePracticeNote';
        return getTranslation($selectedLanguage, key).replace(
          '{subject}',
          $examProfile.subjectName
        );
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

  $: if (browser && sessionId && $appMode === 'learn' && container.has('sessionFactory')) {
    try {
      const sessionFactory = container.resolve('sessionFactory');
      const session = sessionFactory.getOrCreateSession(sessionId);
      session.updateContext({ examProfile: $examProfile });
    } catch (error) {
      console.warn('[ChatInterface] Failed to persist exam profile in session context', error);
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

      // Import services dynamically to avoid circular dependencies
      const { sendMessage } = await import('../services');

      // Process the images with enhanced OCR context and session ID if available
      let result;
      if (sessionId) {
        console.log('Processing images with session ID:', sessionId);
        // Pass selected provider if provider switching is enabled
        if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
          console.log(`Using selected provider: ${selectedProvider}`);
          result = await sendMessage(messageContent, images, sessionId, selectedProvider);
        } else {
          result = await sendMessage(messageContent, images, sessionId);
        }
      } else {
        console.log('Processing images without session ID');
        // Pass selected provider if provider switching is enabled
        if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
          console.log(`Using selected provider: ${selectedProvider}`);
          result = await sendMessage(messageContent, images, null, selectedProvider);
        } else {
          result = await sendMessageWithOCRContext(messageContent, images);
        }
      }

      console.log('Image processing completed successfully with OCR context:', result);

      // Mark the message as processed and store the OCR result
      // The actual OCR text is in the AI response, but we can set a flag to indicate it's done
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
    console.log('ChatInterface mounted, checking for messages with unprocessed images');

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

      // Log all messages for debugging
      console.log(
        'Messages needing OCR:',
        $messages.map((m) => ({
          id: m.id,
          type: m.type,
          hasImages: m.images?.length > 0,
          ocrProcessed: m.ocrProcessed,
          hasOcrNote: !!$ocrNotes[m.id],
          isProcessing: !!$processingImagesMap[m.id]
        }))
      );

      // Find all user messages with images that haven't been processed yet
      const messagesWithUnprocessedImages = [...$messages].filter(
        (message) =>
          message.type === MESSAGE_TYPES.USER &&
          message.images &&
          message.images.length > 0 &&
          !message.ocrProcessed &&
          !$ocrNotes[message.id] &&
          !$processingImagesMap[message.id] // Make sure it's not already being processed
      );

      console.log('Found messages with unprocessed images:', messagesWithUnprocessedImages.length);
      console.log(
        'Messages needing OCR:',
        messagesWithUnprocessedImages.map((m) => m.id)
      );

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

      // Also check for tutor messages that indicate OCR processing will be performed in the browser
      const messagesWithOCRPlaceholder = [...$messages].filter(
        (message) =>
          message.type === MESSAGE_TYPES.TUTOR &&
          (message.content.includes(
            "I can see you've uploaded an image. I'll analyze the content once the image processing is complete."
          ) ||
            message.content.includes("I'll analyze the image once the processing is complete"))
      );

      console.log('Found messages with OCR placeholder:', messagesWithOCRPlaceholder.length);

      // For each placeholder message, find the corresponding user message and process it if needed
      for (const placeholderMessage of messagesWithOCRPlaceholder) {
        const messageIndex = $messages.findIndex((m) => m.id === placeholderMessage.id);
        if (messageIndex > 0) {
          const userMessage = $messages[messageIndex - 1];
          if (
            userMessage &&
            userMessage.type === MESSAGE_TYPES.USER &&
            userMessage.images &&
            userMessage.images.length > 0 &&
            !userMessage.ocrProcessed &&
            !$ocrNotes[userMessage.id] &&
            !$processingImagesMap[userMessage.id]
          ) {
            // Make sure it's not already being processed

            console.log('Found user message with images that needs processing:', userMessage);

            // Process the images
            processImages(userMessage.content, userMessage.images, userMessage.id).catch(
              (error) => {
                console.error('Failed to process images for message with OCR placeholder:', error);
              }
            );

            // Only process one message at a time to avoid overloading
            break;
          }
        }
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
      processImages(content, imageUrls, messageId)
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
      // Make sure we're not passing any images to sendMessageWithOCRContext

      // Import services dynamically to avoid circular dependencies
      import('../services').then(({ sendMessage }) => {
        // Use the session ID when sending messages
        if (sessionId) {
          console.log('Sending message with session ID:', sessionId);
          // Pass selected provider if provider switching is enabled
          if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
            console.log(`Using selected provider: ${selectedProvider}`);
            sendMessage(content, [], sessionId, selectedProvider).then(() => {
              lastQuestion = content;
              showDetailedPrompt = true;
            });
          } else {
            sendMessage(content, [], sessionId).then(() => {
              lastQuestion = content;
              showDetailedPrompt = true;
            });
          }
        } else {
          console.log('Sending message without session ID');
          // Pass selected provider if provider switching is enabled
          if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
            console.log(`Using selected provider: ${selectedProvider}`);
            sendMessage(content, [], null, selectedProvider).then(() => {
              lastQuestion = content;
              showDetailedPrompt = true;
            });
          } else {
            sendMessageWithOCRContext(content, []).then(() => {
              lastQuestion = content;
              showDetailedPrompt = true;
            });
          }
        }
      });
    }
  }

  function requestDetailed() {
    showDetailedPrompt = false;

    // Build a more explicit prompt for detailed explanations
    const prompt =
      lastQuestion + '\n\nPlease provide an in-depth, multi-paragraph explanation with examples.';

    // Detect explicit word count requests (e.g., "2000 words")
    const match = lastQuestion.match(/(\d+)\s+words?/i);
    const requestedWords = match ? parseInt(match[1]) : null;

    // Estimate needed tokens (approx. 1.3 tokens per word)
    let tokenEstimate = requestedWords
      ? Math.ceil(requestedWords * 1.3)
      : OPENAI_CONFIG.DETAILED_MAX_TOKENS;
    tokenEstimate = Math.min(tokenEstimate, OPENAI_CONFIG.DETAILED_MAX_TOKENS);

    import('../services').then(({ sendMessage }) => {
      if (sessionId) {
        if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
          sendMessage(
            prompt,
            [],
            sessionId,
            selectedProvider,
            tokenEstimate,
            'detailed',
            requestedWords
          );
        } else {
          sendMessage(prompt, [], sessionId, null, tokenEstimate, 'detailed', requestedWords);
        }
      } else {
        sendMessageWithOCRContext(prompt, [], tokenEstimate, 'detailed', requestedWords);
      }
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

  {#if $appMode === 'learn' && $examProfile}
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
