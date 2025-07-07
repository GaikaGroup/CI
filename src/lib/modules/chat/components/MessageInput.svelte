<script>
  import { createEventDispatcher } from 'svelte';
  import { Camera, Send } from 'lucide-svelte';
  import { inputMessage, selectedImages } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import Button from '$shared/components/Button.svelte';
  
  const dispatch = createEventDispatcher();
  let fileInput;
  
  function handleSend() {
    if ($inputMessage.trim() || $selectedImages.length > 0) {
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
    const imageUrls = files.map(file => URL.createObjectURL(file));
    $selectedImages = [...$selectedImages, ...imageUrls];
    fileInput.value = null; // Reset file input
  }
  
  function removeImage(index) {
    $selectedImages = $selectedImages.filter((_, i) => i !== index);
  }
</script>

<div class="border-t dark:border-gray-700 dark:bg-gray-800 border-stone-200 bg-stone-50 p-4">
  <!-- Selected Images Preview -->
  {#if $selectedImages.length > 0}
    <div class="mb-4 flex flex-wrap gap-2">
      {#each $selectedImages as img, index}
        <div class="relative">
          <img
            src={img}
            alt="Selected"
            class="w-16 h-16 object-cover rounded-lg"
          />
          <button
            on:click={() => removeImage(index)}
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            aria-label="Remove image"
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
      accept="image/*"
      multiple
      class="hidden"
    />
    <button
      on:click={() => fileInput.click()}
      class="p-2 transition-colors dark:text-gray-400 dark:hover:text-amber-400 text-stone-500 hover:text-amber-600"
      aria-label="Upload image"
    >
      <Camera class="w-5 h-5" />
    </button>
    <input
      type="text"
      bind:value={$inputMessage}
      on:keypress={handleKeyPress}
      placeholder={getTranslation($selectedLanguage, 'placeholder')}
      class="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 bg-white border-stone-300 text-stone-900 placeholder-stone-500"
    />
    <Button 
      on:click={handleSend}
      variant="primary"
      class="p-2 rounded-full"
    >
      <Send class="w-5 h-5" />
    </Button>
  </div>
</div>