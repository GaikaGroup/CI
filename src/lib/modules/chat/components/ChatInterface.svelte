<script>
  import { onMount } from 'svelte';
  import { MessageCircle, Mic, Globe, RotateCcw } from 'lucide-svelte';
  import { chatMode, messages, addMessage, initializeChat, isRecording } from '../stores';
  import { selectedLanguage, languages } from '$modules/i18n/stores';
  import { darkMode } from '$modules/theme/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import { CHAT_MODES, MESSAGE_TYPES } from '$shared/utils/constants';
  import { sendMessage } from '../services';
  import LanguageSelector from '$modules/i18n/components/LanguageSelector.svelte';
  import MessageList from './MessageList.svelte';
  import MessageInput from './MessageInput.svelte';
  import VoiceChat from './VoiceChat.svelte';
  import Button from '$shared/components/Button.svelte';

  let showLanguageSelector = false;

  // Initialize chat when language is selected
  $: if ($selectedLanguage && $messages.length === 0) {
    const welcomeMessage = getTranslation($selectedLanguage, 'welcomeMessage');
    initializeChat(welcomeMessage);
  }

  function handleSendMessage(event) {
    const { content, images } = event.detail;

    // Add user message
    addMessage(MESSAGE_TYPES.USER, content, images);

    // Send message to OpenAI API
    sendMessage(content, images);
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
    return languages.find(lang => lang.code === $selectedLanguage);
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Mode Toggle -->
  <div class="flex justify-center mb-8">
    <div class="{$darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-stone-200'} rounded-xl p-2 shadow-sm border">
      <Button
        on:click={() => $chatMode = CHAT_MODES.TEXT}
        variant={$chatMode === CHAT_MODES.TEXT ? 'primary' : 'text'}
        class="px-6 py-3 rounded-lg font-medium transition-all {
          $chatMode === CHAT_MODES.TEXT
            ? 'bg-amber-600 text-white shadow-sm'
            : $darkMode 
              ? 'text-gray-300 hover:text-amber-400 hover:bg-gray-700'
              : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'
        }"
      >
        <div class="flex items-center">
          <MessageCircle class="w-5 h-5 mr-2" />
          <span>{getTranslation($selectedLanguage, 'textChat')}</span>
        </div>
      </Button>
      <Button
        on:click={() => $chatMode = CHAT_MODES.VOICE}
        variant={$chatMode === CHAT_MODES.VOICE ? 'primary' : 'text'}
        class="px-6 py-3 rounded-lg font-medium transition-all {
          $chatMode === CHAT_MODES.VOICE
            ? 'bg-amber-600 text-white shadow-sm'
            : $darkMode 
              ? 'text-gray-300 hover:text-amber-400 hover:bg-gray-700'
              : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'
        }"
      >
        <div class="flex items-center">
          <Mic class="w-5 h-5 mr-2" />
          <span>{getTranslation($selectedLanguage, 'voiceChat')}</span>
        </div>
      </Button>
    </div>
  </div>

  <!-- Chat Interface -->
  <div class="{$darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-stone-200'} rounded-2xl shadow-sm border overflow-hidden">
    <!-- Language Indicator and Change Button -->
    {#if $selectedLanguage && !showLanguageSelector}
      <div class="flex items-center justify-between px-4 py-3 border-b {$darkMode ? 'border-gray-700 bg-gray-750' : 'border-stone-200 bg-stone-50'}">
        <div class="flex items-center space-x-2">
          <Globe class="w-4 h-4 {$darkMode ? 'text-gray-400' : 'text-stone-500'}" />
          <span class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-stone-600'}">
            {getCurrentLanguage()?.flag} {getCurrentLanguage()?.name}
          </span>
        </div>
        <button
          on:click={() => showLanguageSelector = true}
          class="flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors {
            $darkMode 
              ? 'text-gray-400 hover:text-amber-400 hover:bg-gray-700' 
              : 'text-stone-500 hover:text-amber-600 hover:bg-stone-100'
          }"
        >
          <RotateCcw class="w-3 h-3" />
          <span>{getTranslation($selectedLanguage, 'changeLanguage')}</span>
        </button>
      </div>
    {/if}

    {#if !$selectedLanguage || showLanguageSelector}
      <LanguageSelector bind:showSelector={showLanguageSelector} />
    {:else}
      {#if $chatMode === CHAT_MODES.TEXT}
        <MessageList />
        <MessageInput on:send={handleSendMessage} />
      {:else if $chatMode === CHAT_MODES.VOICE}
        <VoiceChat 
          on:startRecording={handleStartRecording}
          on:stopRecording={handleStopRecording}
        />
      {/if}
    {/if}
  </div>
</div>
