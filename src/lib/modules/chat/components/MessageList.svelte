<script>
  import { afterUpdate } from 'svelte';
  import { messages, processingImagesMap, ocrNotes, updateMessage } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { darkMode } from '$modules/theme/stores';
  import { MESSAGE_TYPES } from '$shared/utils/constants';
  import { Loader, CheckCircle, Server } from 'lucide-svelte';
  import { LLM_FEATURES } from '$lib/config/llm';
  import TypewriterMessage from './TypewriterMessage.svelte';
  import MathMessage from './MathMessage.svelte';

  // No props needed anymore, using stores instead

  let messagesContainer;

  // Scroll to bottom when messages change
  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  // Debug logging
  $: {
    console.log('=== MessageList Debug ===');
    console.log('Total messages:', $messages.length);
    console.log(
      'Messages:',
      $messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content.substring(0, 50) + '...',
        shouldShow: shouldShowMessage(m)
      }))
    );
    console.log('Filtered messages:', $messages.filter(shouldShowMessage).length);
  }

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
    if (message.type === MESSAGE_TYPES.SYSTEM || message.type === 'system') {
      const isProcessingMessage =
        message.content === 'Processing image to extract text...' ||
        message.content === 'Image processing complete.' ||
        message.content.startsWith('Image processing failed:');

      return !isProcessingMessage;
    }

    return true;
  }

  // Check if provider information should be displayed
  function shouldShowProviderInfo() {
    // Show provider info in development mode or if provider switching is enabled
    return import.meta.env.DEV || LLM_FEATURES.ENABLE_PROVIDER_SWITCHING;
  }

  // Get provider display name
  function getProviderDisplayName(providerName) {
    if (!providerName) return '';

    // Capitalize first letter
    return providerName.charAt(0).toUpperCase() + providerName.slice(1);
  }

  function shouldAnimate(message) {
    return (
      message.type === MESSAGE_TYPES.TUTOR && message.animate === true && message.waiting !== true
    );
  }

  function handleTypewriterComplete(message) {
    if (!message || message.animate !== true) {
      return;
    }

    updateMessage(message.id, { animate: false });
  }
</script>

<div class="flex-1 overflow-y-auto px-6 py-4 min-h-0" bind:this={messagesContainer}>
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
        class="flex mb-3 {message.type === MESSAGE_TYPES.USER || message.type === 'user'
          ? 'justify-end'
          : message.type === MESSAGE_TYPES.SYSTEM
            ? 'justify-center'
            : 'justify-start'}"
      >
        <div
          class="max-w-[70%] px-4 py-3 rounded-2xl shadow-sm {message.type === MESSAGE_TYPES.USER ||
          message.type === 'user'
            ? 'bg-amber-600 text-white rounded-br-sm'
            : message.type === MESSAGE_TYPES.SYSTEM
              ? $darkMode
                ? 'bg-blue-900 text-blue-200 border border-blue-700'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
              : $darkMode
                ? 'bg-gray-700 text-gray-100 rounded-bl-sm'
                : 'bg-stone-100 text-stone-800 rounded-bl-sm'}"
        >
          {#if message.images && message.images.length > 0}
            <div class="mb-2 grid grid-cols-2 gap-2">
              {#each message.images as img}
                <img src={img} alt="Uploaded" class="w-full h-20 object-cover rounded-lg" />
              {/each}
            </div>
          {/if}
          <div class="text-sm leading-relaxed">
            {#if shouldAnimate(message)}
              <TypewriterMessage
                text={message.content}
                animate={true}
                on:complete={() => handleTypewriterComplete(message)}
              />
            {:else}
              <MathMessage content={message.content} className="whitespace-pre-wrap" />
            {/if}
          </div>

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

          <div
            class="flex items-center justify-between text-xs mt-2 {message.type ===
              MESSAGE_TYPES.USER || message.type === 'user'
              ? 'text-amber-200'
              : message.type === MESSAGE_TYPES.SYSTEM
                ? $darkMode
                  ? 'text-blue-300'
                  : 'text-blue-600'
                : $darkMode
                  ? 'text-gray-400'
                  : 'text-stone-500'}"
          >
            <span class="opacity-75">{message.timestamp}</span>

            {#if (message.type === MESSAGE_TYPES.TUTOR || message.type === 'tutor' || message.type === 'assistant') && message.provider && shouldShowProviderInfo()}
              <div class="flex items-center ml-2 opacity-75">
                <Server class="w-3 h-3 mr-1" />
                <span>{getProviderDisplayName(message.provider.name)}</span>
                {#if message.provider.model}
                  <span class="ml-1">({message.provider.model})</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>
