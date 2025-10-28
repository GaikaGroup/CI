<script>
  import { afterUpdate } from 'svelte';
  import { messages, processingImagesMap, ocrNotes, ocrResults, updateMessage } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import { darkMode } from '$modules/theme/stores';
  import { MESSAGE_TYPES } from '$shared/utils/constants';
  import { Loader, CheckCircle, Server, ScanLine } from 'lucide-svelte';
  import { LLM_FEATURES } from '$lib/config/llm';
  import TypewriterMessage from './TypewriterMessage.svelte';
  import MathRenderer from '$lib/components/MathRenderer.svelte';
  import DislikeButton from './DislikeButton.svelte';
  import FeedbackDialog from './FeedbackDialog.svelte';
  import SecondOpinionButton from './SecondOpinionButton.svelte';
  import SecondOpinionMessage from './SecondOpinionMessage.svelte';

  // Props
  export let sessionId;

  let pdfViewerOpen = false;
  let currentPdfUrl = '';
  let currentPdfName = '';

  let messagesContainer;
  let feedbackDialogOpen = false;
  let selectedMessageId = null;
  let secondOpinionLoading = {};
  let secondOpinionErrors = {};

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

  function handleDislike(event) {
    selectedMessageId = event.detail.messageId;
    feedbackDialogOpen = true;
  }

  function handleFeedbackSubmitted() {
    // Refresh the message to show feedback indicator
    if (selectedMessageId) {
      // Find the message and mark it as having feedback
      const messageIndex = $messages.findIndex((m) => m.id === selectedMessageId);
      if (messageIndex !== -1) {
        const message = $messages[messageIndex];
        updateMessage(message.id, {
          metadata: {
            ...message.metadata,
            feedback: { submitted: true }
          }
        });
      }
    }
    feedbackDialogOpen = false;
    selectedMessageId = null;
  }

  function hasFeedback(message) {
    return message.metadata?.feedback != null;
  }

  function hasValidDatabaseId(message) {
    // Check if message has a database ID (cuid format: starts with 'c' and is 25 chars)
    return (
      message.id &&
      typeof message.id === 'string' &&
      message.id.length > 20 &&
      message.id.startsWith('c')
    );
  }

  async function handleSecondOpinionRequest(event) {
    const { messageId, provider } = event.detail;

    // Set loading state
    secondOpinionLoading = { ...secondOpinionLoading, [messageId]: true };
    secondOpinionErrors = { ...secondOpinionErrors, [messageId]: null };

    try {
      const response = await fetch('/api/chat/second-opinion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId,
          sessionId,
          provider: provider || undefined
        })
      });

      const result = await response.json();

      console.log('[SecondOpinion] Full API response:', JSON.stringify(result, null, 2));

      if (!result.success) {
        console.error('[SecondOpinion] API returned error:', result.error);
        throw new Error(result.error || 'Failed to get second opinion');
      }

      console.log('[SecondOpinion] API result data:', result.data);

      // Add the second opinion message to the store
      if (result.data && result.data.content) {
        console.log('[SecondOpinion] Creating opinion message with data:', {
          messageId: result.data.messageId,
          content: result.data.content?.substring(0, 100),
          provider: result.data.provider,
          model: result.data.model
        });

        const opinionMessage = {
          id: result.data.messageId,
          type: MESSAGE_TYPES.TUTOR,
          content: result.data.content,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          metadata: {
            isSecondOpinion: true,
            primaryMessageId: messageId,
            provider: result.data.provider,
            model: result.data.model,
            divergenceLevel: result.data.divergence?.level || null,
            divergenceData: result.data.divergence || null,
            opinionId: result.data.opinionId
          },
          saved: true
        };

        console.log('[SecondOpinion] Opinion message object:', opinionMessage);

        // Add to messages store
        messages.update((msgs) => {
          console.log('[SecondOpinion] Current messages count:', msgs.length);
          const newMsgs = [...msgs, opinionMessage];
          console.log('[SecondOpinion] New messages count:', newMsgs.length);
          return newMsgs;
        });

        console.log('[SecondOpinion] Message added to store, current store:', $messages.length);
      } else {
        console.error('[SecondOpinion] Missing data or content in result:', {
          hasData: !!result.data,
          hasContent: !!result.data?.content
        });
      }

      // Clear loading state
      secondOpinionLoading = { ...secondOpinionLoading, [messageId]: false };

      console.log('Second opinion generated successfully');
    } catch (error) {
      console.error('Error requesting second opinion:', error);
      secondOpinionErrors = { ...secondOpinionErrors, [messageId]: error.message };
      secondOpinionLoading = { ...secondOpinionLoading, [messageId]: false };

      // Show error notification
      alert(`Failed to get second opinion: ${error.message}`);
    }
  }

  function getPrimaryProvider(message) {
    // Get the provider used for this message
    return message.metadata?.provider || 'openai';
  }

  function getOpinionCount(message) {
    // Count how many second opinions exist for this message
    return $messages.filter(
      (m) => m.metadata?.isSecondOpinion && m.metadata?.primaryMessageId === message.id
    ).length;
  }

  function isSecondOpinion(message) {
    return message.metadata?.isSecondOpinion === true;
  }

  function getSecondOpinions(messageId) {
    return $messages.filter(
      (m) => m.metadata?.isSecondOpinion && m.metadata?.primaryMessageId === messageId
    );
  }

  function getPrimaryMessage(opinionMessage) {
    const primaryId = opinionMessage.metadata?.primaryMessageId;
    return $messages.find((m) => m.id === primaryId);
  }

  function openPdfViewer(url, name) {
    // If it's a base64 data URL, convert to blob URL for better browser compatibility
    if (url.startsWith('data:application/pdf')) {
      try {
        // Extract base64 data
        const base64Data = url.split(',')[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        currentPdfUrl = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error converting PDF to blob:', error);
        currentPdfUrl = url;
      }
    } else {
      currentPdfUrl = url;
    }
    currentPdfName = name;
    pdfViewerOpen = true;
  }

  function closePdfViewer() {
    // Revoke blob URL to free memory
    if (currentPdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentPdfUrl);
    }
    pdfViewerOpen = false;
    currentPdfUrl = '';
    currentPdfName = '';
  }

  function downloadPdf(url, name) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleOpinionFeedback(event) {
    const { opinionId, messageId, helpful } = event.detail;

    try {
      const response = await fetch(`/api/chat/second-opinion/${opinionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ helpful })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      // Update the message to mark feedback as submitted
      updateMessage(messageId, {
        metadata: {
          ...($messages.find((m) => m.id === messageId)?.metadata || {}),
          feedbackSubmitted: true
        }
      });

      console.log('Feedback submitted successfully');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert(`Failed to submit feedback: ${error.message}`);
    }
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
      <!-- Skip second opinion messages here, they'll be rendered below their primary message -->
      {#if !isSecondOpinion(message)}
        <div
          class="flex mb-3 {message.type === MESSAGE_TYPES.USER || message.type === 'user'
            ? 'justify-end'
            : message.type === MESSAGE_TYPES.SYSTEM
              ? 'justify-center'
              : 'justify-start'}"
        >
          <div
            class="max-w-[70%] px-4 py-3 rounded-2xl shadow-sm {message.type ===
              MESSAGE_TYPES.USER || message.type === 'user'
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
                  {#if typeof img === 'string' || (typeof img === 'object' && img?.url)}
                    {@const imgUrl = typeof img === 'string' ? img : img.url}
                    {@const imgType = typeof img === 'object' && img.type ? img.type : ''}
                    {@const imgName = typeof img === 'object' && img.name ? img.name : ''}
                    {@const isPdf = imgType === 'application/pdf' || imgUrl.startsWith('data:application/pdf') || imgName.toLowerCase().endsWith('.pdf')}
                    
                    <div class="image-preview-container relative">
                      {#if isPdf}
                        <!-- PDF Preview -->
                        <div
                          class="pdf-preview rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          on:click={() => openPdfViewer(imgUrl, imgName || 'document.pdf')}
                          on:keydown={(e) => e.key === 'Enter' && openPdfViewer(imgUrl, imgName || 'document.pdf')}
                          tabindex="0"
                          role="button"
                          aria-label="Open PDF {index + 1}"
                        >
                          <div class="pdf-icon">
                            <div class="text-red-500 font-bold">
                              <div class="text-4xl mb-2">📄</div>
                              <div class="text-xl">PDF</div>
                            </div>
                          </div>
                          {#if imgName}
                            <div class="pdf-name">{imgName}</div>
                          {/if}
                          <div class="pdf-hint">{getTranslation($selectedLanguage, 'clickToView')}</div>
                        </div>
                      {:else}
                        <!-- Image Preview -->
                        <img
                          src={imgUrl}
                          alt="Uploaded image {index + 1}"
                          class="message-image rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          on:click={() => window.open(imgUrl, '_blank')}
                          on:keydown={(e) => e.key === 'Enter' && window.open(imgUrl, '_blank')}
                          tabindex="0"
                          role="button"
                          aria-label="Open image {index + 1} in new tab"
                        />
                      {/if}
                      
                      {#if typeof img === 'object' && img.ocrData}
                        <div
                          class="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 shadow-lg"
                        >
                          <ScanLine class="w-3 h-3" />
                          <span>OCR: {img.ocrData.count}</span>
                        </div>
                      {/if}
                    </div>
                  {:else}
                    <div class="text-sm text-gray-500 p-2 bg-gray-100 rounded">
                      [Image data error: {typeof img}]
                      {console.log('[MessageList] Invalid image data:', img)}
                    </div>
                  {/if}
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
              {#if (message.type === MESSAGE_TYPES.TUTOR || message.type === 'assistant') && hasValidDatabaseId(message) && !message.waiting}
                <div class="flex items-center gap-2">
                  <DislikeButton
                    messageId={message.id}
                    hasFeedback={hasFeedback(message)}
                    on:dislike={handleDislike}
                  />
                  <SecondOpinionButton
                    messageId={message.id}
                    primaryProvider={getPrimaryProvider(message)}
                    loading={secondOpinionLoading[message.id] || false}
                    disabled={secondOpinionLoading[message.id] || false}
                    opinionCount={getOpinionCount(message)}
                    on:request={handleSecondOpinionRequest}
                  />
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Render second opinions for this message -->
        {#if (message.type === MESSAGE_TYPES.TUTOR || message.type === 'assistant') && hasValidDatabaseId(message)}
          {#each getSecondOpinions(message.id) as opinion (opinion.id)}
            <SecondOpinionMessage
              message={opinion}
              primaryMessage={message}
              provider={opinion.metadata?.provider || 'unknown'}
              model={opinion.metadata?.model || null}
              divergenceLevel={opinion.metadata?.divergenceLevel || null}
              divergenceData={opinion.metadata?.divergenceData || null}
              feedbackSubmitted={opinion.metadata?.feedbackSubmitted || false}
              collapsed={false}
              on:feedback={handleOpinionFeedback}
            />
          {/each}
        {/if}
      {/if}
    {/each}
  {/if}
</div>

<FeedbackDialog
  messageId={selectedMessageId}
  bind:open={feedbackDialogOpen}
  on:submitted={handleFeedbackSubmitted}
/>

<!-- PDF Viewer Modal -->
{#if pdfViewerOpen}
  <div class="pdf-modal-overlay" on:click={closePdfViewer} role="presentation">
    <div class="pdf-modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="pdf-viewer-title">
      <div class="pdf-modal-header">
        <h3 id="pdf-viewer-title" class="pdf-modal-title">{currentPdfName}</h3>
        <div class="pdf-modal-actions">
          <button
            class="pdf-action-btn"
            on:click={() => downloadPdf(currentPdfUrl, currentPdfName)}
            title={getTranslation($selectedLanguage, 'downloadPdf')}
            aria-label={getTranslation($selectedLanguage, 'downloadPdf')}
          >
            📥 {getTranslation($selectedLanguage, 'downloadPdf')}
          </button>
          <button
            class="pdf-close-btn"
            on:click={closePdfViewer}
            title={getTranslation($selectedLanguage, 'closePdf')}
            aria-label={getTranslation($selectedLanguage, 'closePdf')}
          >
            ✕
          </button>
        </div>
      </div>
      <div class="pdf-modal-body">
        <iframe
          src={currentPdfUrl}
          title="PDF Viewer"
          class="pdf-iframe"
        ></iframe>
      </div>
    </div>
  </div>
{/if}

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

  /* Стили для превью PDF */
  .pdf-preview {
    width: 100%;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    border: 2px dashed rgba(0, 0, 0, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 24px;
    gap: 12px;
  }

  :global(.dark) .pdf-preview {
    background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .pdf-preview:hover {
    background: linear-gradient(135deg, #ebebeb 0%, #dedede 100%);
    border-color: rgba(0, 0, 0, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :global(.dark) .pdf-preview:hover {
    background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pdf-preview:focus {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  .pdf-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pdf-name {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 16px;
  }

  :global(.dark) .pdf-name {
    color: #f5f5f5;
  }

  .pdf-hint {
    font-size: 12px;
    color: #666;
    text-align: center;
  }

  :global(.dark) .pdf-hint {
    color: #9ca3af;
  }

  /* PDF Viewer Modal */
  .pdf-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .pdf-modal-content {
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 1200px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  :global(.dark) .pdf-modal-content {
    background: #1f2937;
  }

  .pdf-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e5e5;
    gap: 16px;
  }

  :global(.dark) .pdf-modal-header {
    border-bottom-color: #374151;
  }

  .pdf-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  :global(.dark) .pdf-modal-title {
    color: #f5f5f5;
  }

  .pdf-modal-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pdf-action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #ff9800;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pdf-action-btn:hover {
    background: #f57c00;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
  }

  .pdf-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: #f5f5f5;
    border: none;
    border-radius: 8px;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pdf-close-btn:hover {
    background: #e5e5e5;
    color: #1a1a1a;
  }

  :global(.dark) .pdf-close-btn {
    background: #374151;
    color: #9ca3af;
  }

  :global(.dark) .pdf-close-btn:hover {
    background: #4b5563;
    color: #f5f5f5;
  }

  .pdf-modal-body {
    flex: 1;
    overflow: hidden;
    padding: 0;
  }

  .pdf-iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: #f5f5f5;
  }

  :global(.dark) .pdf-iframe {
    background: #111827;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .pdf-modal-overlay {
      padding: 0;
    }

    .pdf-modal-content {
      max-width: 100%;
      height: 100vh;
      border-radius: 0;
    }

    .pdf-modal-header {
      padding: 16px;
    }

    .pdf-modal-title {
      font-size: 16px;
    }

    .pdf-action-btn {
      padding: 6px 12px;
      font-size: 13px;
    }
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
