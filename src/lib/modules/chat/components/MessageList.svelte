<script>
  import { afterUpdate } from 'svelte';
  import { messages, processingImagesMap, ocrNotes } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { darkMode } from '$modules/theme/stores';
  import { MESSAGE_TYPES } from '$shared/utils/constants';
  import { Loader, CheckCircle } from 'lucide-svelte';

  // No props needed anymore, using stores instead

  let messagesContainer;

  // Scroll to bottom when messages change
  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  // Check if a message is being processed
  function isProcessingMessage(message) {
    // Check if this message is in the processing map
    const isCurrentlyProcessing = $processingImagesMap[message.id] === true;

    // For user messages, just check if they're in the processing map
    if (message.type === MESSAGE_TYPES.USER) {
      // For debugging
      if (message.images && message.images.length > 0) {
        console.log('Checking if message is processing:', {
          messageId: message.id,
          isInProcessingMap: isCurrentlyProcessing,
          hasOcrNote: !!$ocrNotes[message.id],
          ocrProcessed: message.ocrProcessed
        });
      }
      return isCurrentlyProcessing;
    }

    // For tutor messages, check if it's a placeholder message AND the corresponding user message is still processing
    if (message.type === MESSAGE_TYPES.TUTOR) {
      const isOCRPlaceholder =
        message.content.includes(
          "I can see you've uploaded an image. I'll analyze the content once the image processing is complete."
        ) || message.content.includes("I'll analyze the image once the processing is complete");

      if (isOCRPlaceholder) {
        console.log('Found OCR placeholder message for ID:', message.id, message.content);

        // Find the corresponding user message (usually the one before this message)
        const messageIndex = $messages.findIndex((m) => m.id === message.id);
        if (messageIndex > 0) {
          const userMessage = $messages[messageIndex - 1];
          if (userMessage && userMessage.type === MESSAGE_TYPES.USER) {
            // Check if the user message is still being processed
            const userMessageProcessing = $processingImagesMap[userMessage.id] === true;

            console.log('Checking if user message is still being processed:', {
              userMessageId: userMessage.id,
              isProcessing: userMessageProcessing,
              processingMap: $processingImagesMap
            });

            // Only show the placeholder if the user message is still being processed
            return userMessageProcessing;
          }
        }
      }
    }

    return isCurrentlyProcessing;
  }

  // Check if a message has been processed
  function isProcessedMessage(message) {
    // Check if this message has an OCR note or has been marked as processed
    return message.ocrProcessed === true || !!$ocrNotes[message.id];
  }

  // Filter out system messages related to image processing
  function shouldShowMessage(message) {
    // Don't show system messages related to image processing
    if (message.type === MESSAGE_TYPES.SYSTEM) {
      const isProcessingMessage =
        message.content === 'Processing image to extract text...' ||
        message.content === 'Image processing complete.' ||
        message.content.startsWith('Image processing failed:');

      return !isProcessingMessage;
    }

    return true;
  }
</script>

<div class="h-96 overflow-y-auto p-6 space-y-4" bind:this={messagesContainer}>
  {#if $messages.length === 0}
    <div class="flex justify-center items-center h-full">
      <p class="text-stone-500 dark:text-gray-400 text-center">
        {#if $selectedLanguage === 'ru'}
          Начните разговор с вашим ИИ-преподавателем
        {:else if $selectedLanguage === 'es'}
          Comienza una conversación con tu tutor de IA
        {:else}
          Start a conversation with your AI tutor
        {/if}
      </p>
    </div>
  {:else}
    {#each $messages.filter(shouldShowMessage) as message (message.id)}
      <div
        class="flex {message.type === MESSAGE_TYPES.USER
          ? 'justify-end'
          : message.type === MESSAGE_TYPES.SYSTEM
            ? 'justify-center'
            : 'justify-start'}"
      >
        <div
          class="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl {message.type === MESSAGE_TYPES.USER
            ? 'bg-amber-600 text-white'
            : message.type === MESSAGE_TYPES.SYSTEM
              ? $darkMode
                ? 'bg-blue-900 text-blue-200 border border-blue-700'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
              : $darkMode
                ? 'bg-gray-700 text-gray-100'
                : 'bg-stone-100 text-stone-800'}"
        >
          {#if message.images && message.images.length > 0}
            <div class="mb-2 grid grid-cols-2 gap-2">
              {#each message.images as img}
                <img src={img} alt="Uploaded" class="w-full h-20 object-cover rounded-lg" />
              {/each}
            </div>
          {/if}
          <p class="text-sm">{message.content}</p>

          {#if message.ocrText}
            <!-- OCR text rendering -->
            <div class="mt-2 p-2 rounded-lg {$darkMode ? 'bg-gray-700' : 'bg-stone-100'} text-xs">
              <strong>OCR Result:</strong>
              {message.ocrText}
            </div>
          {:else if $ocrNotes[message.id] && message.type === MESSAGE_TYPES.USER}
            <!-- OCR note rendering -->
            <div class="mt-2 p-2 rounded-lg {$darkMode ? 'bg-gray-700' : 'bg-stone-100'} text-xs">
              <strong>OCR Note:</strong>
              {$ocrNotes[message.id]}
            </div>
          {:else if isProcessingMessage(message)}
            <!-- Processing indicator -->
            <div class="flex items-center mt-2 text-amber-500">
              <Loader class="w-4 h-4 mr-2 animate-spin" />
              <span class="text-xs">Processing image...</span>
            </div>
          {:else if isProcessedMessage(message) && message.type === MESSAGE_TYPES.USER}
            <!-- Processed indicator -->
            <div class="flex items-center mt-2 text-green-500">
              <CheckCircle class="w-4 h-4 mr-2" />
              <span class="text-xs">Image processed</span>
            </div>
          {:else}
            <!-- No OCR content -->
          {/if}

          <p
            class="text-xs mt-1 {message.type === MESSAGE_TYPES.USER
              ? 'text-amber-200'
              : message.type === MESSAGE_TYPES.SYSTEM
                ? $darkMode
                  ? 'text-blue-300'
                  : 'text-blue-600'
                : $darkMode
                  ? 'text-gray-400'
                  : 'text-stone-500'}"
          >
            {message.timestamp}
          </p>
        </div>
      </div>
    {/each}
  {/if}
</div>
