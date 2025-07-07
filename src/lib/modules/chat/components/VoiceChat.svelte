<script>
  import { createEventDispatcher } from 'svelte';
  import { Mic, MicOff, Image } from 'lucide-svelte';
  import { isRecording, selectedImages } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import Avatar from '$shared/components/Avatar.svelte';
  
  const dispatch = createEventDispatcher();
  let fileInput;
  
  function toggleRecording() {
    $isRecording = !$isRecording;
    
    if ($isRecording) {
      // In a real implementation, this would start recording audio
      dispatch('startRecording');
    } else {
      // In a real implementation, this would stop recording and process audio
      dispatch('stopRecording');
    }
  }
  
  function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    $selectedImages = [...$selectedImages, ...imageUrls];
    fileInput.value = null; // Reset file input
  }
</script>

<div>
  <!-- Voice Chat Header -->
  <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center">
    <div class="flex justify-center mb-6">
      <Avatar size="lg" />
    </div>
    <h2 class="text-white text-xl font-semibold mb-2">{getTranslation($selectedLanguage, 'voiceChatMode')}</h2>
    <p class="text-amber-100">{getTranslation($selectedLanguage, 'talkToTutor')}</p>
  </div>
  
  <!-- Selected Images Preview -->
  {#if $selectedImages.length > 0}
    <div class="p-4 flex flex-wrap gap-2 border-b dark:border-gray-700 border-stone-200">
      {#each $selectedImages as img, index}
        <div class="relative">
          <img
            src={img}
            alt="Selected"
            class="w-16 h-16 object-cover rounded-lg"
          />
          <button
            on:click={() => $selectedImages = $selectedImages.filter((_, i) => i !== index)}
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            aria-label="Remove image"
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
      accept="image/*"
      multiple
      class="hidden"
    />
    <button
      on:click={() => fileInput.click()}
      class="p-3 transition-colors dark:text-gray-400 dark:hover:text-amber-400 text-stone-500 hover:text-amber-600"
      aria-label="Upload image"
    >
      <Image class="w-6 h-6" />
    </button>
    <button
      on:click={toggleRecording}
      class="p-4 rounded-full transition-all {
        $isRecording
          ? 'bg-red-500 text-white shadow-lg scale-110'
          : 'bg-amber-600 text-white hover:bg-amber-700'
      }"
      aria-label={$isRecording ? 'Stop recording' : 'Start recording'}
    >
      {#if $isRecording}
        <MicOff class="w-6 h-6" />
      {:else}
        <Mic class="w-6 h-6" />
      {/if}
    </button>
    <span class="text-sm dark:text-gray-400 text-stone-600">
      {$isRecording ? getTranslation($selectedLanguage, 'recording') : getTranslation($selectedLanguage, 'holdToRecord')}
    </span>
  </div>
</div>