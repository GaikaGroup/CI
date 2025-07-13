<script>
  import { createEventDispatcher } from 'svelte';
  import { Camera, Send } from 'lucide-svelte';
  import { inputMessage, selectedImages, processingImagesMap } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import Button from '$shared/components/Button.svelte';
  import { derived } from 'svelte/store';

  // Create a derived store that checks if any message is being processed
  const isProcessingAny = derived(processingImagesMap, ($processingImagesMap) => {
    // Check if any message is being processed
    return Object.values($processingImagesMap).some((isProcessing) => isProcessing === true);
  });

  // Props - disabled can be passed in, but we'll also check the processing state
  export let disabled = false;

  // Combine the prop with the processing state
  $: isDisabled = disabled || $isProcessingAny;

  const dispatch = createEventDispatcher();
  let fileInput;

  function handleSend() {
    if (!isDisabled && ($inputMessage.trim() || $selectedImages.length > 0)) {
      dispatch('send', {
        content: $inputMessage,
        images: $selectedImages
      });
      $inputMessage = '';
      $selectedImages = [];
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
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

  function removeImage(index) {
    $selectedImages = $selectedImages.filter((_, i) => i !== index);
  }
</script>

<div class="border-t dark:border-gray-700 dark:bg-gray-800 border-stone-200 bg-stone-50 p-4">
  <!-- Selected Files Preview -->
  {#if $selectedImages.length > 0}
    <div class="mb-4 flex flex-wrap gap-2">
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
            on:click={() => removeImage(index)}
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            aria-label="Remove file"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="flex items-center space-x-2">
    <input
      type="file"
      bind:this={fileInput}
      on:change={handleImageUpload}
      accept="image/*,application/pdf"
      multiple
      class="hidden"
    />
    <button
      on:click={() => !isDisabled && fileInput.click()}
      class="p-2 transition-colors dark:text-gray-400 dark:hover:text-amber-400 text-stone-500 hover:text-amber-600 {isDisabled
        ? 'opacity-50 cursor-not-allowed'
        : ''}"
      aria-label="Upload image"
      disabled={isDisabled}
    >
      <Camera class="w-5 h-5" />
    </button>
    <input
      type="text"
      bind:value={$inputMessage}
      on:keypress={handleKeyPress}
      placeholder={isDisabled
        ? 'Processing image...'
        : getTranslation($selectedLanguage, 'placeholder')}
      class="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 bg-white border-stone-300 text-stone-900 placeholder-stone-500 {isDisabled
        ? 'opacity-50 cursor-not-allowed'
        : ''}"
      disabled={isDisabled}
    />
    <Button
      on:click={handleSend}
      variant="primary"
      class="p-2 rounded-full {isDisabled ? 'opacity-50 cursor-not-allowed' : ''}"
      disabled={isDisabled}
    >
      <Send class="w-5 h-5" />
    </Button>
  </div>
</div>
