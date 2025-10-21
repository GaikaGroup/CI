<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Camera, Send, Target } from 'lucide-svelte';
  import {
    inputMessage,
    selectedImages,
    processingImagesMap,
    isOcrProcessing,
    setOcrResults
  } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import Button from '$shared/components/Button.svelte';
  import { derived } from 'svelte/store';
  import inputPlaceholderService from '../services/InputPlaceholderService';
  import tutorCommandsService from '../services/TutorCommandsService';
  import helpTipsService from '../services/HelpTipsService';
  import CommandMenu from './CommandMenu.svelte';

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
  let inputElement;
  let currentPlaceholder = '';
  let placeholderInterval;
  let placeholderSequence = [];
  let placeholderIndex = 0;
  let showCommandMenu = false;
  let commands = [];
  let helpTip = '';

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

  function handleKeyDown(event) {
    // Open command menu with "/" key
    if (
      event.key === '/' &&
      $inputMessage === '' &&
      tutorCommandsService.isKeyboardShortcutEnabled()
    ) {
      event.preventDefault();
      toggleCommandMenu();
    }
  }

  function toggleCommandMenu() {
    showCommandMenu = !showCommandMenu;
  }

  function handleCommandSelect(event) {
    const command = event.detail;
    $inputMessage = command.name + ' ';
    showCommandMenu = false;

    // Focus input after command insertion
    if (inputElement) {
      inputElement.focus();
    }
  }

  function handleCommandMenuClose() {
    showCommandMenu = false;
  }

  function removeImage(index) {
    $selectedImages = $selectedImages.filter((_, i) => i !== index);
  }

  // Initialize placeholder rotation
  async function initializePlaceholders() {
    try {
      await inputPlaceholderService.initialize();
      placeholderSequence = await inputPlaceholderService.getPlaceholderSequence(
        $selectedLanguage,
        20,
        'general'
      );
      currentPlaceholder = placeholderSequence[0] || '';
      startPlaceholderRotation();
    } catch (error) {
      console.error('[MessageInput] Failed to initialize placeholders:', error);
      currentPlaceholder = getTranslation($selectedLanguage, 'placeholder');
    }
  }

  // Initialize commands
  async function initializeCommands() {
    try {
      await tutorCommandsService.initialize();
      commands = await tutorCommandsService.getCommands($selectedLanguage);
    } catch (error) {
      console.error('[MessageInput] Failed to initialize commands:', error);
      commands = [];
    }
  }

  // Initialize help tip
  async function initializeHelpTip() {
    try {
      await helpTipsService.initialize();
      helpTip = await helpTipsService.getTip($selectedLanguage, 'default');
    } catch (error) {
      console.error('[MessageInput] Failed to initialize help tip:', error);
      helpTip = '';
    }
  }

  function startPlaceholderRotation() {
    if (placeholderInterval) {
      clearInterval(placeholderInterval);
    }

    const interval = inputPlaceholderService.getRotationInterval();
    placeholderInterval = setInterval(() => {
      if ($inputMessage.trim() === '') {
        placeholderIndex = (placeholderIndex + 1) % placeholderSequence.length;
        currentPlaceholder = placeholderSequence[placeholderIndex];
      }
    }, interval);
  }

  function stopPlaceholderRotation() {
    if (placeholderInterval) {
      clearInterval(placeholderInterval);
      placeholderInterval = null;
    }
  }

  // Update placeholders, commands, and help tip when language changes
  $: if ($selectedLanguage) {
    initializePlaceholders();
    initializeCommands();
    initializeHelpTip();
  }

  onMount(() => {
    initializePlaceholders();
    initializeCommands();
    initializeHelpTip();
  });

  onDestroy(() => {
    stopPlaceholderRotation();
  });
</script>

<div
  class="border-t dark:border-gray-700 dark:bg-gray-800 border-stone-200 bg-stone-50 p-4 flex-shrink-0"
>
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
      title="Загрузить изображение"
    >
      <Camera class="w-5 h-5" />
    </button>

    <!-- Input field with icon inside -->
    <div class="flex-1 relative">
      <!-- Command Menu Button inside input -->
      <button
        on:click={toggleCommandMenu}
        class="absolute left-3 top-1/2 -translate-y-1/2 transition-colors dark:text-gray-400 dark:hover:text-amber-400 text-stone-500 hover:text-amber-600 {isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : ''} {showCommandMenu ? 'text-amber-600 dark:text-amber-400' : ''}"
        aria-label="Open command menu"
        aria-expanded={showCommandMenu}
        aria-haspopup="menu"
        disabled={isDisabled}
        title="Commands (Press /)"
      >
        🎯
      </button>

      <!-- Command Menu -->
      <CommandMenu
        {commands}
        visible={showCommandMenu}
        on:select={handleCommandSelect}
        on:close={handleCommandMenuClose}
      />

      <input
        bind:this={inputElement}
        type="text"
        bind:value={$inputMessage}
        on:keypress={handleKeyPress}
        on:keydown={handleKeyDown}
        placeholder={isDisabled ? 'Processing image...' : currentPlaceholder}
        class="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 bg-white border-stone-300 text-stone-900 placeholder-stone-500 transition-all duration-300 {isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : ''}"
        disabled={isDisabled}
        aria-label="Message input"
      />
    </div>

    <Button
      on:click={handleSend}
      variant="primary"
      class="p-2 rounded-full {isDisabled ? 'opacity-50 cursor-not-allowed' : ''}"
      disabled={isDisabled}
    >
      <Send class="w-5 h-5" />
    </Button>
  </div>

  <!-- Help Tip -->
  {#if helpTip}
    <div
      class="mt-2 text-xs text-stone-500 dark:text-gray-400 px-2 transition-opacity duration-300"
      role="status"
      aria-live="polite"
      id="help-tip"
    >
      {helpTip}
    </div>
  {/if}
</div>
