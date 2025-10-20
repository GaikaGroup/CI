<script>
  import { Book, Menu, X, User, GraduationCap } from 'lucide-svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import ThemeToggle from '$modules/theme/components/ThemeToggle.svelte';
  import AuthButton from '$modules/auth/components/AuthButton.svelte';
  import ModeToggle from './ModeToggle.svelte';
  import ConsoleDropdown from './ConsoleDropdown.svelte';
  import { requireAuth } from '$lib/stores/mode';
  import { user } from '$modules/auth/stores';
  import { navigationMode, navigationBadges, NAVIGATION_MODES } from '$lib/stores/navigation.js';
  import { goto } from '$app/navigation';

  let mobileMenuOpen = false;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  // Handle navigation to Student/Tutor modes
  function handleStudentClick() {
    goto('/student');
    mobileMenuOpen = false;
  }

  function handleTutorClick() {
    goto('/tutor');
    mobileMenuOpen = false;
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
        <ModeToggle on:change={(e) => requireAuth(e.detail.mode)} />
        
        {#if $user}
          <!-- Student Navigation -->
          <button
            on:click={handleStudentClick}
            class="flex items-center gap-2 transition-colors font-medium {$navigationMode === NAVIGATION_MODES.STUDENT
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-stone-600 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-400'}"
          >
            <User class="w-4 h-4" />
            Student
            {#if $navigationBadges.student > 0}
              <span class="ml-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900/40 dark:text-blue-200">
                {$navigationBadges.student}
              </span>
            {/if}
          </button>

          <!-- Tutor Navigation -->
          <button
            on:click={handleTutorClick}
            class="flex items-center gap-2 transition-colors font-medium {$navigationMode === NAVIGATION_MODES.TUTOR
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-stone-600 hover:text-amber-700 dark:text-gray-300 dark:hover:text-amber-400'}"
          >
            <GraduationCap class="w-4 h-4" />
            Tutor
            {#if $navigationBadges.tutor > 0}
              <span class="ml-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-amber-900/40 dark:text-amber-200">
                {$navigationBadges.tutor}
              </span>
            {/if}
          </button>

          <a
            href="/sessions"
            class="dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 transition-colors font-medium"
          >
            Sessions
          </a>
        {/if}

        {#if $user?.type === 'admin'}
          <ConsoleDropdown />
        {/if}
        <ThemeToggle />
        <AuthButton />
      </div>

      <!-- Mobile Menu Button -->
      <div class="md:hidden flex items-center space-x-2">
        <ModeToggle size="compact" on:change={(e) => requireAuth(e.detail.mode)} />
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
        <div class="px-3 py-2">
          <ModeToggle
            size="compact"
            on:change={(e) => {
              requireAuth(e.detail.mode);
              mobileMenuOpen = false;
            }}
          />
        </div>
        
        {#if $user}
          <!-- Student Navigation Mobile -->
          <button
            on:click={handleStudentClick}
            class="flex items-center gap-2 w-full px-3 py-2 text-left transition-colors font-medium {$navigationMode === NAVIGATION_MODES.STUDENT
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-stone-600 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-400'}"
          >
            <User class="w-4 h-4" />
            Student
            {#if $navigationBadges.student > 0}
              <span class="ml-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900/40 dark:text-blue-200">
                {$navigationBadges.student}
              </span>
            {/if}
          </button>

          <!-- Tutor Navigation Mobile -->
          <button
            on:click={handleTutorClick}
            class="flex items-center gap-2 w-full px-3 py-2 text-left transition-colors font-medium {$navigationMode === NAVIGATION_MODES.TUTOR
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-stone-600 hover:text-amber-700 dark:text-gray-300 dark:hover:text-amber-400'}"
          >
            <GraduationCap class="w-4 h-4" />
            Tutor
            {#if $navigationBadges.tutor > 0}
              <span class="ml-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-amber-900/40 dark:text-amber-200">
                {$navigationBadges.tutor}
              </span>
            {/if}
          </button>

          <a
            href="/sessions"
            class="block px-3 py-2 dark:text-gray-300 dark:hover:text-amber-400 text-stone-600 hover:text-amber-700 font-medium"
            on:click={() => {
              mobileMenuOpen = false;
            }}
          >
            Sessions
          </a>
        {/if}

        {#if $user?.type === 'admin'}
          <div class="px-3 py-2">
            <ConsoleDropdown />
          </div>
        {/if}
        <div class="px-3 py-2">
          <AuthButton buttonClass="block w-full text-left" />
        </div>
      </div>
    </div>
  {/if}
</nav>
