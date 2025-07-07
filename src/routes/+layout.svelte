<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Navigation from '$modules/navigation/components/Navigation.svelte';
  import { darkMode } from '$modules/theme/stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  
  // Initialize theme from localStorage if available
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
  
  // Update localStorage when language changes
  $: if (typeof localStorage !== 'undefined' && $selectedLanguage) {
    localStorage.setItem('language', $selectedLanguage);
  }
</script>

<div class="app">
  <Navigation />
  
  <main>
    <slot />
  </main>
  
  <footer class="py-6 text-center text-sm text-stone-500 dark:text-gray-400">
    <p>© {new Date().getFullYear()} AI Tutor Platform. All rights reserved.</p>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  main {
    flex: 1;
  }
</style>