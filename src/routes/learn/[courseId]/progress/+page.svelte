<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user, checkAuth } from '$modules/auth/stores';
  import {
    activeEnrollments,
    enrollmentStats
  } from '$lib/modules/courses/stores/enrollmentStore.js';
  import { validateCourseAccess } from '$lib/utils/courseNavigation.js';
  import {
    ArrowLeft,
    BookOpen,
    Award,
    Calendar,
    Clock,
    TrendingUp,
    Target,
    CheckCircle,
    Circle,
    BarChart3
  } from 'lucide-svelte';

  /** @type {import('./$types').PageData} */
  export let data;

  let loading = true;
  let error = null;
  let courseEnrollment = null;
  let progressData = null;

  $: if (data?.course && $activeEnrollments) {
    // Find enrollment for this specific course
    courseEnrollment = $activeEnrollments.find((e) => e.subjectId === data.course.id);

    if (courseEnrollment) {
      // Calculate detailed progress data
      progressData = calculateProgressData(courseEnrollment);
    }
  }

  function calculateProgressData(enrollment) {
    const progress = enrollment.progress || {};
    const lessonsCompleted = progress.lessonsCompleted || 0;
    const assessmentsTaken = progress.assessmentsTaken || 0;
    const totalActivities = lessonsCompleted + assessmentsTaken;

    // Estimate total activities (this would come from course structure in real app)
    const estimatedTotalLessons = 20;
    const estimatedTotalAssessments = 5;
    const estimatedTotal = estimatedTotalLessons + estimatedTotalAssessments;

    const completionPercentage = Math.min((totalActivities / estimatedTotal) * 100, 100);

    return {
      lessonsCompleted,
      assessmentsTaken,
      totalActivities,
      estimatedTotalLessons,
      estimatedTotalAssessments,
      estimatedTotal,
      completionPercentage: Math.round(completionPercentage),
      enrolledAt: enrollment.enrolledAt,
      lastActivity: progress.lastActivity,
      streakDays: progress.streakDays || 0,
      totalStudyTime: progress.totalStudyTime || 0
    };
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatStudyTime(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  onMount(async () => {
    try {
      // Check authentication
      await checkAuth();
      if (!$user) {
        goto(`/login?redirect=${$page.url.pathname}`);
        return;
      }

      // Validate course data from server
      if (data?.course) {
        const validation = validateCourseAccess(data.course);
        if (!validation.valid) {
          error = validation.error;
          loading = false;
          return;
        }
      } else {
        error = 'Course data not available. Please try again.';
        loading = false;
        return;
      }

      loading = false;
    } catch (err) {
      console.error('Error loading progress:', err);
      error = 'Failed to load progress data. Please try again.';
      loading = false;
    }
  });

  function handleBackToCourse() {
    goto(`/learn/${data.course.id}`);
  }

  function handleBackToCourses() {
    goto('/my-courses');
  }

  function handleContinueLearning() {
    goto(`/learn/${data.course.id}`);
  }
</script>

<svelte:head>
  <title>{data?.course?.name || 'Course'} Progress - Learn Mode</title>
  <meta name="description" content="Track your learning progress and achievements" />
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p class="text-stone-600 dark:text-gray-300">Loading progress...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center max-w-md mx-auto px-4">
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
      >
        <h2 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Error Loading Progress
        </h2>
        <p class="text-red-600 dark:text-red-300 mb-4">{error}</p>
        <button
          on:click={handleBackToCourses}
          class="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to My Courses
        </button>
      </div>
    </div>
  </div>
{:else if !$user}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <p class="text-stone-600 dark:text-gray-400">Please log in to view your progress.</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-stone-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-stone-200 dark:border-gray-700">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              on:click={handleBackToCourse}
              class="flex items-center gap-2 text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft class="w-4 h-4" />
              <span class="hidden sm:inline">Back to Course</span>
            </button>
            <div class="h-6 w-px bg-stone-300 dark:bg-gray-600"></div>
            <div>
              <h1 class="text-xl font-semibold text-stone-900 dark:text-white">
                {data.course.name} - Progress
              </h1>
              <div class="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400">
                <BarChart3 class="w-4 h-4" />
                <span>Learning Analytics</span>
              </div>
            </div>
          </div>
          <button
            on:click={handleContinueLearning}
            class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            <BookOpen class="w-4 h-4" />
            <span class="hidden sm:inline">Continue Learning</span>
          </button>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-8">
      {#if !courseEnrollment}
        <!-- Not Enrolled State -->
        <div class="text-center py-12">
          <div
            class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700 p-8 max-w-md mx-auto"
          >
            <Circle class="w-16 h-16 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
            <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">Not Enrolled</h2>
            <p class="text-stone-600 dark:text-gray-400 mb-6">
              You need to enroll in this course to track your progress.
            </p>
            <div class="flex gap-3 justify-center">
              <button
                on:click={handleBackToCourses}
                class="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                My Courses
              </button>
              <a
                href="/catalogue"
                class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                Browse Catalogue
              </a>
            </div>
          </div>
        </div>
      {:else if progressData}
        <!-- Progress Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div
            class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                  Overall Progress
                </p>
                <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {progressData.completionPercentage}%
                </p>
              </div>
              <TrendingUp class="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div class="mt-4">
              <div class="w-full bg-stone-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style="width: {progressData.completionPercentage}%"
                ></div>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                  Lessons Completed
                </p>
                <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {progressData.lessonsCompleted}
                </p>
              </div>
              <BookOpen class="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p class="text-xs text-stone-500 dark:text-gray-400 mt-2">
              of ~{progressData.estimatedTotalLessons} total
            </p>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-stone-600 dark:text-gray-400">Assessments</p>
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                  {progressData.assessmentsTaken}
                </p>
              </div>
              <Award class="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p class="text-xs text-stone-500 dark:text-gray-400 mt-2">
              of ~{progressData.estimatedTotalAssessments} total
            </p>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-stone-600 dark:text-gray-400">Study Streak</p>
                <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {progressData.streakDays}
                </p>
              </div>
              <Target class="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <p class="text-xs text-stone-500 dark:text-gray-400 mt-2">days in a row</p>
          </div>
        </div>

        <!-- Detailed Progress -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Learning Activity -->
          <div
            class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700"
          >
            <div class="p-6 border-b border-stone-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
                Learning Activity
              </h3>
            </div>
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <CheckCircle class="w-5 h-5 text-green-500" />
                  <span class="text-stone-700 dark:text-gray-300">Lessons Completed</span>
                </div>
                <span class="font-semibold text-stone-900 dark:text-white">
                  {progressData.lessonsCompleted}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Award class="w-5 h-5 text-amber-500" />
                  <span class="text-stone-700 dark:text-gray-300">Assessments Taken</span>
                </div>
                <span class="font-semibold text-stone-900 dark:text-white">
                  {progressData.assessmentsTaken}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Clock class="w-5 h-5 text-blue-500" />
                  <span class="text-stone-700 dark:text-gray-300">Total Study Time</span>
                </div>
                <span class="font-semibold text-stone-900 dark:text-white">
                  {formatStudyTime(progressData.totalStudyTime)}
                </span>
              </div>
            </div>
          </div>

          <!-- Course Information -->
          <div
            class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700"
          >
            <div class="p-6 border-b border-stone-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
                Course Information
              </h3>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <p class="text-sm font-medium text-stone-600 dark:text-gray-400 mb-1">
                  Description
                </p>
                <p class="text-stone-700 dark:text-gray-300">{data.course.description}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm font-medium text-stone-600 dark:text-gray-400 mb-1">Language</p>
                  <p class="text-stone-700 dark:text-gray-300">{data.course.language}</p>
                </div>
                {#if data.course.level}
                  <div>
                    <p class="text-sm font-medium text-stone-600 dark:text-gray-400 mb-1">Level</p>
                    <p class="text-stone-700 dark:text-gray-300">{data.course.level}</p>
                  </div>
                {/if}
              </div>
              {#if data.course.skills && data.course.skills.length > 0}
                <div>
                  <p class="text-sm font-medium text-stone-600 dark:text-gray-400 mb-2">Skills</p>
                  <div class="flex flex-wrap gap-2">
                    {#each data.course.skills as skill}
                      <span
                        class="inline-flex items-center px-2 py-1 text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded"
                      >
                        {skill}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div
          class="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700"
        >
          <div class="p-6 border-b border-stone-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-stone-900 dark:text-white">Timeline</h3>
          </div>
          <div class="p-6 space-y-4">
            <div class="flex items-center gap-4">
              <Calendar class="w-5 h-5 text-green-500" />
              <div>
                <p class="font-medium text-stone-900 dark:text-white">Enrolled</p>
                <p class="text-sm text-stone-600 dark:text-gray-400">
                  {formatDate(progressData.enrolledAt)}
                </p>
              </div>
            </div>
            {#if progressData.lastActivity}
              <div class="flex items-center gap-4">
                <Clock class="w-5 h-5 text-blue-500" />
                <div>
                  <p class="font-medium text-stone-900 dark:text-white">Last Activity</p>
                  <p class="text-sm text-stone-600 dark:text-gray-400">
                    {formatDate(progressData.lastActivity)}
                  </p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
