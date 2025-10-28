<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Mic, MicOff, Image } from 'lucide-svelte';
  import { isRecording, selectedImages } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import CatAvatar from '$shared/components/CatAvatar.svelte';
  import {
    startRecording,
    stopRecording,
    sendTranscribedText,
    initAudioContext,
    isSpeaking,
    currentEmotion,
    isWaitingPhraseActive,
    getAudioQueueStatus
  } from '../voiceServices';

  const dispatch = createEventDispatcher();

  // Accept sessionId as a prop
  export let sessionId = null;
  let fileInput;
  let isProcessing = false;
  let waitingPhraseStatus = false;
  let audioQueueInfo = null;

  // Update waiting phrase status periodically
  let statusUpdateInterval;

  function updateWaitingPhraseStatus() {
    waitingPhraseStatus = isWaitingPhraseActive();
    audioQueueInfo = getAudioQueueStatus();
  }

  // Custom face positions for the cat avatar (percentages of image dimensions)
  // These are optimized for the cat.png image
  // - x and y are the center positions (as percentage of image width/height)
  // - width and height are the size (as percentage of image width/height)
  // Enable debug mode (Ctrl+Shift+D) to see the bounding boxes for easier adjustment
  const catFacePositions = {
    mouth: { x: 50, y: 65, width: 18, height: 8 }, // Optimized mouth position
    leftEye: { x: 38, y: 38, width: 12, height: 8 }, // Optimized left eye position
    rightEye: { x: 62, y: 38, width: 12, height: 8 } // Optimized right eye position
  };

  console.log('Using cat face positions:', catFacePositions);

  // Debug mode for development - set to true to see facial feature bounding boxes
  // This helps with adjusting the face positions
  let debugMode = import.meta.env.DEV; // Automatically enable in development mode

  console.log(
    `Debug mode is ${debugMode ? 'enabled' : 'disabled'} (${import.meta.env.DEV ? 'development' : 'production'} environment)`
  );

  onMount(() => {
    // Initialize audio context on component mount
    initAudioContext();

    // Start monitoring waiting phrase status
    updateWaitingPhraseStatus();
    statusUpdateInterval = setInterval(updateWaitingPhraseStatus, 200); // Update every 200ms

    // Add keyboard shortcut for toggling debug mode (Ctrl+Shift+D)
    // This is only for development purposes
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        debugMode = !debugMode;
        console.log(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
      }
    };
  });

  // Track last message ID for voice commands
  let lastMessageId = null;
  let lastResponse = null;
  let isGeneratingSecondOpinion = false;
  let currentProvider = null;

  // Export function to update last message info (called from parent)
  export function updateLastMessage(messageId, content, provider = null) {
    lastMessageId = messageId;
    lastResponse = content;
    currentProvider = provider;
  }

  async function toggleRecording() {
    if (!$isRecording) {
      // Start recording
      $isRecording = true;
      dispatch('startRecording');
      await startRecording();
    } else {
      // Stop recording and process audio
      $isRecording = false;
      dispatch('stopRecording');
      isProcessing = true;

      try {
        const transcription = await stopRecording();
        if (transcription) {
          // Update status immediately to show processing
          updateWaitingPhraseStatus();

          // Send transcribed text with context for voice commands
          const response = await sendTranscribedText(transcription, sessionId, {
            lastMessageId,
            lastResponse,
            userId: null, // Will be set by the service from session
            onStatusChange: (status) => {
              if (status.isGeneratingSecondOpinion !== undefined) {
                isGeneratingSecondOpinion = status.isGeneratingSecondOpinion;
              }
              if (status.currentProvider !== undefined) {
                currentProvider = status.currentProvider;
              }
            }
          });

          // Update last response if we got one
          if (response) {
            lastResponse = response;
          }

          // Update status after processing
          updateWaitingPhraseStatus();
        }
      } catch (error) {
        console.error('Error processing voice:', error);
      } finally {
        isProcessing = false;
        // Final status update
        updateWaitingPhraseStatus();
      }
    }
  }

  function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    const fileObjects = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name
    }));
    $selectedImages = [...$selectedImages, ...fileObjects];
    fileInput.value = null; // Reset file input
  }
</script>

<div>
  <!-- Voice Chat Header -->
  <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center">
    <div class="flex justify-center mb-6">
      <CatAvatar
        size="lg"
        speaking={$isSpeaking}
        emotion={$currentEmotion}
        facePositions={catFacePositions}
        debug={debugMode}
      />
    </div>
    <h2 class="text-white text-xl font-semibold mb-2">
      {getTranslation($selectedLanguage, 'voiceChatMode')}
    </h2>
    <p class="text-amber-100">{getTranslation($selectedLanguage, 'talkToTutor')}</p>

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

    <!-- Second opinion status indicator -->
    {#if isGeneratingSecondOpinion}
      <div class="mt-3 flex justify-center">
        <div class="bg-blue-500/30 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
            <span>
              {#if $selectedLanguage === 'ru'}
                Получаю второе мнение...
              {:else if $selectedLanguage === 'es'}
                Obteniendo segunda opinión...
              {:else}
                Getting second opinion...
              {/if}
            </span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Current provider indicator -->
    {#if currentProvider && $isSpeaking}
      <div class="mt-2 flex justify-center">
        <div class="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/80">
          <span class="font-medium">{currentProvider}</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Selected Files Preview -->
  {#if $selectedImages.length > 0}
    <div class="p-4 flex flex-wrap gap-2 border-b dark:border-gray-700 border-stone-200">
      {#each $selectedImages as file, index}
        <div class="relative">
          {#if file.type.startsWith('image/')}
            <!-- Display image preview for image files -->
            <img src={file.url} alt="Selected" class="w-16 h-16 object-cover rounded-lg" />
          {:else if file.type === 'application/pdf'}
            <!-- Display PDF icon for PDF files -->
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
            <!-- Display generic file icon for other file types -->
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

  <!-- Voice Controls -->
  <div class="flex items-center justify-center space-x-4 p-6">
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
      class="p-3 transition-colors dark:text-gray-400 dark:hover:text-amber-400 text-stone-500 hover:text-amber-600"
      aria-label="Upload image"
      disabled={$isRecording || isProcessing}
    >
      <Image class="w-6 h-6" />
    </button>
    <button
      on:click={toggleRecording}
      class="p-4 rounded-full transition-all {$isRecording
        ? 'bg-red-500 text-white shadow-lg scale-110'
        : isProcessing
          ? 'bg-amber-400 text-white'
          : 'bg-amber-600 text-white hover:bg-amber-700'}"
      aria-label={$isRecording ? 'Stop recording' : isProcessing ? 'Processing' : 'Start recording'}
      disabled={isProcessing}
    >
      {#if $isRecording}
        <MicOff class="w-6 h-6" />
      {:else}
        <Mic class="w-6 h-6" />
      {/if}
    </button>
    <span class="text-sm dark:text-gray-400 text-stone-600">
      {#if $isRecording}
        {getTranslation($selectedLanguage, 'recording')}
      {:else if isProcessing}
        {#if waitingPhraseStatus}
          <span class="text-amber-600 dark:text-amber-400">
            {getTranslation($selectedLanguage, 'thinking') || 'Thinking...'}
          </span>
        {:else}
          {getTranslation($selectedLanguage, 'processing')}
        {/if}
      {:else}
        {getTranslation($selectedLanguage, 'holdToRecord')}
      {/if}
    </span>
  </div>
</div>
