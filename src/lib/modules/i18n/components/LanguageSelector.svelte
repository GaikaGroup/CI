<script>
  import { Globe, RotateCcw } from 'lucide-svelte';
  import { selectedLanguage, languages } from '../stores';
  import { translations, getTranslation } from '../translations';
  import { messages, addSystemMessage, initializeChat } from '$modules/chat/stores';

  export let showSelector = false;
  export let compact = false;

  function handleLanguageSelect(langCode) {
    if ($selectedLanguage === langCode) {
      showSelector = false;
      return;
    }

    $selectedLanguage = langCode;
    showSelector = false;

    // Add system message about language change
    const systemMessage = getTranslation(langCode, 'languageChanged');
    const welcomeMessage = getTranslation(langCode, 'welcomeMessage');

    // Reset chat with new language
    initializeChat(welcomeMessage);
  }

  function getCurrentLanguage() {
    return languages.find((lang) => lang.code === $selectedLanguage);
  }
</script>

{#if showSelector}
  <div class="language-selector">
    <div class="flex flex-col items-center justify-center space-y-6">
      <div class="text-center">
        <div class="text-6xl mb-4">🌍</div>
        <h3 class="text-2xl font-semibold mb-2 dark:text-white text-stone-900">
          {getTranslation($selectedLanguage, 'selectLanguage')}
        </h3>
        <p class="text-lg dark:text-gray-300 text-stone-600">
          ¡Bienvenido! • Добро пожаловать! • Welcome!
        </p>
      </div>
      <div class="flex flex-wrap justify-center gap-3">
        {#each languages as lang}
          <button
            on:click={() => handleLanguageSelect(lang.code)}
            class="flex items-center px-4 py-2 rounded-lg border transition-all hover:scale-105 {$selectedLanguage ===
            lang.code
              ? 'bg-amber-600 border-amber-500 text-white'
              : 'dark:bg-gray-700 dark:border-gray-600 dark:hover:border-amber-400 dark:text-white bg-white border-stone-200 hover:border-amber-500 text-stone-900'} shadow-sm hover:shadow-md"
          >
            <span class="text-lg mr-2">{lang.flag}</span>
            <span class="font-medium">{lang.name}</span>
          </button>
        {/each}
      </div>
      <button
        on:click={() => (showSelector = false)}
        class="px-4 py-2 rounded-lg text-sm dark:text-gray-400 dark:hover:text-gray-300 text-stone-500 hover:text-stone-700"
      >
        Cancel
      </button>
    </div>
  </div>
{:else if $selectedLanguage && !compact}
  <div
    class="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 dark:bg-gray-750 border-stone-200 bg-stone-50"
  >
    <div class="flex items-center space-x-2">
      <Globe class="w-4 h-4 dark:text-gray-400 text-stone-500" />
      <span class="text-sm font-medium dark:text-gray-300 text-stone-600">
        {getCurrentLanguage()?.flag}
        {getCurrentLanguage()?.name}
      </span>
    </div>
    <button
      on:click={() => (showSelector = true)}
      class="flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors dark:text-gray-400 dark:hover:text-amber-400 dark:hover:bg-gray-700 text-stone-500 hover:text-amber-600 hover:bg-stone-100"
    >
      <RotateCcw class="w-3 h-3" />
      <span>{getTranslation($selectedLanguage, 'changeLanguage')}</span>
    </button>
  </div>
{:else if $selectedLanguage && compact}
  <button
    on:click={() => (showSelector = true)}
    class="flex items-center space-x-1 px-2 py-1 rounded-lg text-sm transition-colors dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-600"
  >
    <span>{getCurrentLanguage()?.flag}</span>
  </button>
{/if}

<style>
  .language-selector {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .language-selector > div {
    background-color: var(--bg-color, white);
    border-radius: 1rem;
    padding: 2rem;
    width: 90%;
    max-width: 500px;
  }

  :global(.dark) .language-selector > div {
    --bg-color: #1f2937;
    color: white;
  }
</style>
