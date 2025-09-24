<script>
  // import { onMount } from 'svelte';
  import { activeEnrollments, enrollmentStats } from '$modules/courses/stores/enrollmentStore.js';
  import { subjectsStore } from '$lib/stores/subjects';
  // import { user } from '$modules/auth/stores';
  import { BookOpen, TrendingUp, Calendar, Award, Clock } from 'lucide-svelte';

  // Get subjects for enrolled subject IDs
  $: enrolledSubjects = $activeEnrollments
    .map((enrollment) => {
      const subject = $subjectsStore.find((s) => s.id === enrollment.subjectId);
      return subject ? { ...subject, enrollment } : null;
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
</script>

<svelte:head>
  <title>My Subjects</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-stone-900 dark:text-white mb-2">My Subjects</h1>
    <p class="text-stone-600 dark:text-gray-400">
      Track your progress and continue learning with your enrolled subjects
    </p>
  </div>

  {#if $enrollmentStats}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-stone-600 dark:text-gray-400">Active Subjects</p>
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
            <p class="text-sm font-medium text-stone-600 dark:text-gray-400">Completed</p>
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
            <p class="text-sm font-medium text-stone-600 dark:text-gray-400">Total Lessons</p>
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
    {#if enrolledSubjects.length === 0}
      <div class="text-center py-12">
        <BookOpen class="w-16 h-16 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
        <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">
          No subjects enrolled yet
        </h2>
        <p class="text-stone-600 dark:text-gray-400 mb-6">
          Start your learning journey by browsing our catalogue and enrolling in subjects that
          interest you.
        </p>
        <a
          href="/catalogue"
          class="inline-flex items-center px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          <BookOpen class="w-5 h-5 mr-2" />
          Browse Catalogue
        </a>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {#each enrolledSubjects as subject}
          <div
            class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700 overflow-hidden"
          >
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-1">
                    {subject.name}
                  </h3>
                  <p class="text-sm text-amber-600 dark:text-amber-300">
                    {subject.language}{subject.level ? ` · ${subject.level}` : ''}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-green-500 rounded-full" title="Active enrollment"></div>
                  <span class="text-xs text-stone-500 dark:text-gray-400">Active</span>
                </div>
              </div>

              <p class="text-sm text-stone-600 dark:text-gray-400 mb-4 line-clamp-2">
                {subject.description}
              </p>

              <div class="space-y-3 mb-4">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-stone-600 dark:text-gray-400">Progress</span>
                  <span class="font-medium text-stone-900 dark:text-white">
                    {getProgressPercentage(subject.enrollment)}%
                  </span>
                </div>
                <div class="w-full bg-stone-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style="width: {getProgressPercentage(subject.enrollment)}%"
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
                    {subject.enrollment.progress.lessonsCompleted}
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
                    {subject.enrollment.progress.assessmentsTaken}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 text-xs text-stone-500 dark:text-gray-400 mb-4">
                <Calendar class="w-3 h-3" />
                <span>Enrolled {formatDate(subject.enrollment.enrolledAt)}</span>
                <span>•</span>
                <Clock class="w-3 h-3" />
                <span>Last activity {formatDate(subject.enrollment.progress.lastActivity)}</span>
              </div>

              <div class="flex gap-3">
                <a
                  href="/learn/{subject.id}"
                  class="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors text-center"
                >
                  Continue Learning
                </a>
                <a
                  href="/learn/{subject.id}/progress"
                  class="flex-1 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors text-center"
                >
                  View Progress
                </a>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
