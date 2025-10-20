<script>
  import { afterUpdate } from 'svelte';
  import { messages, processingImagesMap, ocrNotes, ocrResults, updateMessage } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { darkMode } from '$modules/theme/stores';
  import { MESSAGE_TYPES } from '$shared/utils/constants';
  import { Loader, CheckCircle, Server, ScanLine } from 'lucide-svelte';
  import { LLM_FEATURES } from '$lib/config/llm';
  import TypewriterMessage from './TypewriterMessage.svelte';
  import MathRenderer from '$lib/components/MathRenderer.svelte';

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
            <div class="mb-3 flex flex-col gap-2">
              {#each message.images as img, index}
                <div class="image-preview-container relative">
                  <img 
                    src={typeof img === 'string' ? img : img.url} 
                    alt="Uploaded image {index + 1}" 
                    class="message-image rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    on:click={() => window.open(typeof img === 'string' ? img : img.url, '_blank')}
                    on:keydown={(e) => e.key === 'Enter' && window.open(typeof img === 'string' ? img : img.url, '_blank')}
                    tabindex="0"
                    role="button"
                    aria-label="Open image {index + 1} in new tab"
                  />
                  {#if typeof img === 'object' && img.ocrData}
                    <div class="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 shadow-lg">
                      <ScanLine class="w-3 h-3" />
                      <span>OCR: {img.ocrData.count}</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
          <div class="text-sm leading-relaxed message-content">
            <MathRenderer content={message.content} className="whitespace-pre-wrap" />
          </div>

          {#if isProcessingMessage(message)}
            <!-- Processing indicator -->
            <div class="flex items-center mt-2 text-amber-500">
              <Loader class="w-4 h-4 mr-2 animate-spin" />
              <span class="text-xs">Processing image...</span>
            </div>
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

<style>
  /* Стили для превью изображений */
  .image-preview-container {
    position: relative;
    width: 100%;
    max-width: 400px;
  }

  .message-image {
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: contain;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .message-image {
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .message-image:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .message-image:focus {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  /* Улучшенные стили для математики в сообщениях чата */
  .message-content :global(.math-display) {
    background: rgba(255, 255, 255, 0.9) !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    border-radius: 12px !important;
    padding: 1.2em !important;
    margin: 1.5em 0 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  }

  /* Темная тема для математики в чате */
  :global(.dark) .message-content :global(.math-display) {
    background: rgba(0, 0, 0, 0.3) !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  }

  /* Увеличиваем размер математики в чате */
  .message-content :global(.katex) {
    font-size: 1.2em !important;
  }

  .message-content :global(.katex-display) {
    font-size: 1.3em !important;
  }

  /* Улучшенные стили для дробей в чате */
  .message-content :global(.katex .frac-line) {
    border-bottom-width: 0.06em !important;
  }

  /* Улучшенные стили для больших операторов в чате */
  .message-content :global(.katex .mop) {
    font-size: 1.4em !important;
  }

  .message-content :global(.katex .mop.op-limits) {
    font-size: 1.5em !important;
  }

  /* Лучшие отступы для математических элементов в чате */
  .message-content :global(.katex .mbin) {
    margin: 0 0.3em !important;
  }

  .message-content :global(.katex .mrel) {
    margin: 0 0.35em !important;
  }

  /* Анимация появления математики в чате */
  .message-content :global(.math-display) {
    animation: fadeInMathChat 0.4s ease-out !important;
  }

  @keyframes fadeInMathChat {
    from {
      opacity: 0;
      transform: translateY(15px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Улучшенная типографика для параграфов с математикой */
  .message-content :global(p) {
    margin: 1.5em 0 !important;
    line-height: 1.8 !important;
  }

  .message-content :global(p:first-child) {
    margin-top: 0 !important;
  }

  .message-content :global(p:last-child) {
    margin-bottom: 0 !important;
  }

  /* Стили для жирного текста в математических сообщениях */
  .message-content :global(strong) {
    font-weight: 600;
    color: inherit;
  }

  /* Адаптивность для мобильных устройств в чате */
  @media (max-width: 768px) {
    .message-content :global(.math-display) {
      padding: 1em 0.8em !important;
      margin: 1.2em 0 !important;
      font-size: 0.95em !important;
    }

    .message-content :global(.katex) {
      font-size: 1.1em !important;
    }

    .message-content :global(.katex-display) {
      font-size: 1.2em !important;
    }
  }
</style>
