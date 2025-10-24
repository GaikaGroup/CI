<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { activeEnrollments, enrollmentStats } from '$lib/stores/enrollmentDB.js';
  import { coursesStore } from '$lib/stores/coursesDB';
  import { user, checkAuth } from '$modules/auth/stores';
  import { navigateToCourse, navigateToCourseProgress } from '$lib/utils/courseNavigation.js';
  import { BookOpen, TrendingUp, Calendar, Award, Clock } from 'lucide-svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  // Get courses for enrolled course IDs
  $: enrolledCourses = $activeEnrollments
    .map((enrollment) => {
      const course = $coursesStore.find((s) => s.id === enrollment.subjectId);
      return course ? { ...course, enrollment } : null;
    })
    .filter(Boolean);

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getProgressPercentage(enrollment) {
    const total = enrollment.progress.lessonsCompleted + enrollment.progress.assessmentsTaken;
    return Math.min(total * 10, 100); // Rough estimate
  }

  function handleContinueLearning(course) {
    navigateToCourse(course, {
      fallbackPath: '/my-courses',
      showError: true,
      errorHandler: (error, errorType) => {
        // In a real app, you might use a toast notification system
        console.error('Course navigation error:', error);
        alert(`Cannot access course: ${error}`);
      }
    });
  }

  function handleViewProgress(course) {
    navigateToCourseProgress(course, {
      fallbackPath: '/my-courses',
      showError: true,
      errorHandler: (error, errorType) => {
        // In a real app, you might use a toast notification system
        console.error('Course progress navigation error:', error);
        alert(`Cannot access course progress: ${error}`);
      }
    });
  }

  onMount(async () => {
    await checkAuth();
    if (!$user) {
      goto('/login?redirect=/my-courses');
      return;
    }
    coursesStore.initialize();
  });
</script>

<svelte:head>
  <title>My Courses</title>
</svelte:head>

{#if !$user}
  <div class="container mx-auto px-4 py-8">
    <div class="text-center py-12">
      <p class="text-stone-600 dark:text-gray-400">Please log in to view your courses.</p>
    </div>
  </div>
{:else}
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-3xl font-bold text-stone-900 dark:text-white">
          {getTranslation($selectedLanguage, 'myCourses')}
        </h1>
        <a
          href="/catalogue/edit?new=true"
          class="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          <BookOpen class="w-4 h-4 mr-2" />
          {getTranslation($selectedLanguage, 'createCourse')}
        </a>
      </div>
      <p class="text-stone-600 dark:text-gray-400">
        {getTranslation($selectedLanguage, 'loginWelcome')}
      </p>
    </div>

    {#if $enrollmentStats}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'activeSessions')}
              </p>
              <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {$enrollmentStats.active}
              </p>
            </div>
            <BookOpen class="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'success')}
              </p>
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                {$enrollmentStats.completed}
              </p>
            </div>
            <Award class="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'statistics')}
              </p>
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {$enrollmentStats.totalLessons}
              </p>
            </div>
            <TrendingUp class="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
    {/if}

    <div class="space-y-6">
      {#if enrolledCourses.length === 0}
        <div class="text-center py-12">
          <BookOpen class="w-16 h-16 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
          <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">
            {getTranslation($selectedLanguage, 'noCourses')}
          </h2>
          <p class="text-stone-600 dark:text-gray-400 mb-6">
            {getTranslation($selectedLanguage, 'loginWelcome')}
          </p>
          <a
            href="/catalogue"
            class="inline-flex items-center px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            <BookOpen class="w-5 h-5 mr-2" />
            {getTranslation($selectedLanguage, 'myCourses')}
          </a>
        </div>
      {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {#each enrolledCourses as course}
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700 overflow-hidden"
            >
              <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-1">
                      {course.name}
                    </h3>
                    <p class="text-sm text-amber-600 dark:text-amber-300">
                      {course.language}{course.level ? ` · ${course.level}` : ''}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-green-500 rounded-full" title="Active enrollment"></div>
                    <span class="text-xs text-stone-500 dark:text-gray-400">Active</span>
                  </div>
                </div>

                <p class="text-sm text-stone-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {course.description}
                </p>

                <div class="space-y-3 mb-4">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-stone-600 dark:text-gray-400">Progress</span>
                    <span class="font-medium text-stone-900 dark:text-white">
                      {getProgressPercentage(course.enrollment)}%
                    </span>
                  </div>
                  <div class="w-full bg-stone-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      class="bg-amber-600 h-2 rounded-full transition-all duration-300"
                      style="width: {getProgressPercentage(course.enrollment)}%"
                    ></div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div class="text-center">
                    <div
                      class="flex items-center justify-center gap-1 text-sm text-stone-600 dark:text-gray-400"
                    >
                      <BookOpen class="w-4 h-4" />
                      <span>Lessons</span>
                    </div>
                    <p class="text-lg font-semibold text-stone-900 dark:text-white">
                      {course.enrollment.progress.lessonsCompleted}
                    </p>
                  </div>
                  <div class="text-center">
                    <div
                      class="flex items-center justify-center gap-1 text-sm text-stone-600 dark:text-gray-400"
                    >
                      <Award class="w-4 h-4" />
                      <span>Assessments</span>
                    </div>
                    <p class="text-lg font-semibold text-stone-900 dark:text-white">
                      {course.enrollment.progress.assessmentsTaken}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 text-xs text-stone-500 dark:text-gray-400 mb-4">
                  <Calendar class="w-3 h-3" />
                  <span>Enrolled {formatDate(course.enrollment.enrolledAt)}</span>
                  <span>•</span>
                  <Clock class="w-3 h-3" />
                  <span>Last activity {formatDate(course.enrollment.progress.lastActivity)}</span>
                </div>

                <div class="flex gap-3">
                  <button
                    on:click={() => handleContinueLearning(course)}
                    class="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors text-center"
                  >
                    {getTranslation($selectedLanguage, 'next')}
                  </button>
                  <button
                    on:click={() => handleViewProgress(course)}
                    class="flex-1 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors text-center"
                  >
                    {getTranslation($selectedLanguage, 'statistics')}
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
