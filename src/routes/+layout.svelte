<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Navigation from '$modules/navigation/components/Navigation.svelte';
  import { darkMode } from '$modules/theme/stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import LanguageSelector from '$modules/i18n/components/LanguageSelector.svelte';
  import '$modules/session/init';

  // Variable to control the language selector visibility
  let showLanguageSelector = false;

  // Variable to track if language selection is complete
  let languageSelectionComplete = false;

  // Initialize theme and language from localStorage if available
  onMount(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        $darkMode = true;
      }

      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage) {
        $selectedLanguage = savedLanguage;
        languageSelectionComplete = true;
      } else {
        // If no language is saved, show the language selector
        showLanguageSelector = true;
      }
    }
  });

  // Update document class when darkMode changes
  $: if (typeof document !== 'undefined') {
    if ($darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  // Update localStorage when language changes and mark selection as complete
  $: if (typeof localStorage !== 'undefined' && $selectedLanguage) {
    localStorage.setItem('language', $selectedLanguage);
    languageSelectionComplete = true;
  }

  // Watch for changes to showSelector
  $: if (!showLanguageSelector && $selectedLanguage) {
    languageSelectionComplete = true;
  }
</script>

{#if !languageSelectionComplete || showLanguageSelector}
  <!-- Full-screen language selector -->
  <div class="language-selector-fullscreen">
    <LanguageSelector bind:showSelector={showLanguageSelector} />
  </div>
{:else}
  <!-- Main app content - only shown after language is selected -->
  <div class="app">
    <Navigation />

    <main>
      <slot />
    </main>

    <footer class="py-6 text-center text-sm text-stone-500 dark:text-gray-400">
      <p>© {new Date().getFullYear()} AI Tutor Platform. All rights reserved.</p>
    </footer>
  </div>
{/if}

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
  }

  /* Full-screen language selector */
  .language-selector-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background-color: var(--bg-color, white);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  :global(.dark) .language-selector-fullscreen {
    --bg-color: #1f2937;
  }
</style>
