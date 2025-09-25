<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { activeEnrollments, enrollmentStats } from '$modules/courses/stores/enrollmentStore.js';
  import { coursesStore } from '$lib/stores/courses';
  import { user, checkAuth } from '$modules/auth/stores';
  import CourseSelection from '$modules/learn/components/CourseSelection.svelte';
  import { initialiseExamProfile } from '$lib/stores/examProfile';
  import { startLearningSession } from '$modules/learn/utils/session.js';
  import { BookOpen, TrendingUp, Award } from 'lucide-svelte';

  // Get courses for enrolled course IDs
  $: enrolledCourses = $activeEnrollments
    .map((enrollment) => {
      const course = $coursesStore.find((s) => s.id === enrollment.courseId);
      return course ? { ...course, enrollment } : null;
    })
    .filter(Boolean);

  onMount(() => {
    checkAuth();
    coursesStore.initialise();
    initialiseExamProfile();

    // Debug: Log user state
    console.log('My Courses - User state:', $user);
    console.log('My Courses - Active enrollments:', $activeEnrollments);
  });

  const handleLearnCourse = (event) => {
    const { course } = event.detail;
    if (!course) {
      return;
    }

    startLearningSession(course, 'practice');
    goto('/catalogue');
  };
</script>

<svelte:head>
  <title>My Courses</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-stone-900 dark:text-white mb-2">My Courses</h1>
    <p class="text-stone-600 dark:text-gray-400">
      Track your progress and continue learning with your enrolled courses
    </p>
  </div>

  {#if $enrollmentStats}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-stone-600 dark:text-gray-400">Active Courses</p>
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
    {#if enrolledCourses.length === 0}
      <div class="text-center py-12">
        <BookOpen class="w-16 h-16 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
        <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">
          No courses enrolled yet
        </h2>
        <p class="text-stone-600 dark:text-gray-400 mb-6">
          Start your learning journey by browsing our catalogue and enrolling in courses that
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
      <CourseSelection
        courses={enrolledCourses}
        showFilters={false}
        showReporting={false}
        allowCreateCourse={false}
        headerTitle="My Courses"
        headerSubtitle="Continue learning from the courses you've already enrolled in"
        on:learn-course={handleLearnCourse}
      />
    {/if}
  </div>
</div>
