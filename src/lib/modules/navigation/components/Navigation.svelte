<script>
  import { Book, Menu, X } from 'lucide-svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import ThemeToggle from '$modules/theme/components/ThemeToggle.svelte';
  import AuthButton from '$modules/auth/components/AuthButton.svelte';
  import { appMode, requireAuth } from '$lib/stores/mode';

  let mobileMenuOpen = false;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<nav
  class="dark:bg-gray-800 dark:border-gray-700 bg-white border-stone-200 shadow-sm border-b sticky top-0 z-50"
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <div class="flex items-center">
        <Book class="h-8 w-8 text-amber-600 mr-2" />
        <span class="text-2xl font-bold dark:text-white text-stone-900">
          {getTranslation($selectedLanguage, 'title')}
        </span>
      </div>

      <!-- Desktop Menu -->
      <div class="hidden md:flex items-center space-x-8">
        <button
          on:click={() => requireAuth('fun')}
          class="dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 transition-colors {$appMode ===
          'fun'
            ? 'font-bold underline'
            : ''}"
        >
          Fun
        </button>
        <button
          on:click={() => requireAuth('learn')}
          class="dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 transition-colors {$appMode ===
          'learn'
            ? 'font-bold underline'
            : ''}"
        >
          Learn
        </button>
        <a
          href="/about"
          class="dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 transition-colors"
        >
          {getTranslation($selectedLanguage, 'about')}
        </a>
        <a
          href="/contacts"
          class="dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 transition-colors"
        >
          {getTranslation($selectedLanguage, 'contacts')}
        </a>
        <ThemeToggle />
        <AuthButton />
      </div>

      <!-- Mobile Menu Button -->
      <div class="md:hidden flex items-center space-x-2">
        <ThemeToggle />
        <button
          on:click={toggleMobileMenu}
          class="dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {#if mobileMenuOpen}
            <X class="h-6 w-6" />
          {:else}
            <Menu class="h-6 w-6" />
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile Menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden dark:bg-gray-800 dark:border-gray-700 bg-white border-stone-200 border-t">
      <div class="px-2 pt-2 pb-3 space-y-1">
        <button
          on:click={() => {
            requireAuth('fun');
            mobileMenuOpen = false;
          }}
          class="block px-3 py-2 w-full text-left dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 {$appMode ===
          'fun'
            ? 'font-bold underline'
            : ''}"
        >
          Fun
        </button>
        <button
          on:click={() => {
            requireAuth('learn');
            mobileMenuOpen = false;
          }}
          class="block px-3 py-2 w-full text-left dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 {$appMode ===
          'learn'
            ? 'font-bold underline'
            : ''}"
        >
          Learn
        </button>
        <a
          href="/about"
          class="block px-3 py-2 dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700"
        >
          {getTranslation($selectedLanguage, 'about')}
        </a>
        <a
          href="/contacts"
          class="block px-3 py-2 dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700"
        >
          {getTranslation($selectedLanguage, 'contacts')}
        </a>
        <div class="px-3 py-2">
          <AuthButton buttonClass="block w-full text-left" />
        </div>
      </div>
    </div>
  {/if}
</nav>
