<script>
  import { enrollmentStats } from '$lib/stores/enrollmentDB.js';
  import { BookOpen } from 'lucide-svelte';

  function handleMyCoursesClick() {
    window.location.href = '/my-courses';
  }
</script>

<div class="relative">
  <button
    on:click={handleMyCoursesClick}
    class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 hover:text-amber-700 dark:text-gray-300 dark:hover:text-amber-400 transition-colors"
  >
    <BookOpen class="w-4 h-4" />
    My Courses
    {#if $enrollmentStats && $enrollmentStats.active > 0}
      <span
        class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-amber-600 rounded-full"
      >
        {$enrollmentStats.active}
      </span>
    {/if}
  </button>
</div>

<style>
  /* Ensure dropdown appears above other elements */
  .relative {
    z-index: 50;
  }
</style>
