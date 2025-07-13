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
  import LanguageSelector from '$modules/i18n/components/LanguageSelector.svelte';
  import MessageList from './MessageList.svelte';
  import MessageInput from './MessageInput.svelte';
  import VoiceChat from './VoiceChat.svelte';
  import Button from '$shared/components/Button.svelte';
  import { browser } from '$app/environment';

  let showLanguageSelector = false;

  // Initialize chat when language is selected
  $: if ($selectedLanguage && $messages.length === 0) {
    const welcomeMessage = getTranslation($selectedLanguage, 'welcomeMessage');
    initializeChat(welcomeMessage);
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

      // Process the images with enhanced OCR context
      const result = await sendMessageWithOCRContext(messageContent, images);

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
      processImages(content, imageUrls, messageId).catch((error) => {
        console.error('Failed to process images:', error);
        // Make sure to reset processing state on error
        setProcessingImages(messageId, false);
      });
    } else {
      // If no images, just send the message normally but with enhanced context
      addMessage(MESSAGE_TYPES.USER, content, images, messageId);
      // Make sure we're not passing any images to sendMessageWithOCRContext
      sendMessageWithOCRContext(content, []);
    }
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
      <MessageInput on:send={handleSendMessage} />
    {:else if $chatMode === CHAT_MODES.VOICE}
      <VoiceChat on:startRecording={handleStartRecording} on:stopRecording={handleStopRecording} />
    {/if}
  </div>
</div>
