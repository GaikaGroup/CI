<script>
  import { createEventDispatcher } from 'svelte';
  import { activeEnrollments, enrollmentStats } from '$modules/subjects/stores/enrollmentStore.js';
  import { subjectsStore } from '$lib/stores/subjects';
  import { ChevronDown, BookOpen, TrendingUp } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  let isOpen = false;
  let dropdownElement;

  // Get subjects for enrolled subject IDs
  $: enrolledSubjects = $activeEnrollments
    .map((enrollment) => {
      const subject = $subjectsStore.find((s) => s.id === enrollment.subjectId);
      return subject ? { ...subject, enrollment } : null;
    })
    .filter(Boolean);

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function closeDropdown() {
    isOpen = false;
  }

  function handleSubjectClick(subject) {
    dispatch('subject-select', { subject });
    closeDropdown();
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (dropdownElement && !dropdownElement.contains(event.target)) {
      closeDropdown();
    }
  }

  // Handle keyboard navigation
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeDropdown();
    }
  }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="relative" bind:this={dropdownElement}>
  <button
    on:click={toggleDropdown}
    class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 hover:text-amber-700 dark:text-gray-300 dark:hover:text-amber-400 transition-colors"
    aria-expanded={isOpen}
    aria-haspopup="true"
  >
    <BookOpen class="w-4 h-4" />
    My Subjects
    {#if $enrollmentStats && $enrollmentStats.active > 0}
      <span
        class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-amber-600 rounded-full"
      >
        {$enrollmentStats.active}
      </span>
    {/if}
    <ChevronDown class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}" />
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-stone-200 dark:border-gray-700 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      <div class="p-3 border-b border-stone-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-stone-900 dark:text-white">My Subjects</h3>
        {#if $enrollmentStats}
          <p class="text-xs text-stone-500 dark:text-gray-400 mt-1">
            {$enrollmentStats.active} active • {$enrollmentStats.completed} completed
          </p>
        {/if}
      </div>

      <div class="max-h-64 overflow-y-auto">
        {#if enrolledSubjects.length === 0}
          <div class="p-4 text-center">
            <BookOpen class="w-8 h-8 text-stone-400 dark:text-gray-500 mx-auto mb-2" />
            <p class="text-sm text-stone-500 dark:text-gray-400">No subjects enrolled yet</p>
            <p class="text-xs text-stone-400 dark:text-gray-500 mt-1">
              Browse the catalogue to join subjects
            </p>
          </div>
        {:else}
          {#each enrolledSubjects as subject}
            <button
              on:click={() => handleSubjectClick(subject)}
              class="w-full p-3 text-left hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors border-b border-stone-100 dark:border-gray-700 last:border-b-0"
              role="menuitem"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-medium text-stone-900 dark:text-white truncate">
                    {subject.name}
                  </h4>
                  <p class="text-xs text-amber-600 dark:text-amber-300 mt-1">
                    {subject.language}{subject.level ? ` · ${subject.level}` : ''}
                  </p>
                  {#if subject.enrollment.progress.lessonsCompleted > 0 || subject.enrollment.progress.assessmentsTaken > 0}
                    <div
                      class="flex items-center gap-2 mt-2 text-xs text-stone-500 dark:text-gray-400"
                    >
                      <TrendingUp class="w-3 h-3" />
                      {subject.enrollment.progress.lessonsCompleted} lessons •
                      {subject.enrollment.progress.assessmentsTaken} assessments
                    </div>
                  {/if}
                </div>
                <div class="ml-2 flex-shrink-0">
                  <div class="w-2 h-2 bg-green-500 rounded-full" title="Active enrollment"></div>
                </div>
              </div>
            </button>
          {/each}
        {/if}
      </div>

      {#if enrolledSubjects.length > 0}
        <div class="p-3 border-t border-stone-200 dark:border-gray-700">
          <button
            on:click={() => {
              dispatch('view-all');
              closeDropdown();
            }}
            class="w-full text-center text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            View All Subjects
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Ensure dropdown appears above other elements */
  .relative {
    z-index: 50;
  }
</style>
