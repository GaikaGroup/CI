<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { appMode } from '$lib/stores/mode.js';
  import { user, checkAuth } from '$modules/auth/stores';
  import { getApiModeFromAppMode } from '$lib/utils/modeMapping.js';
  import { validateCourseAccess } from '$lib/utils/courseNavigation.js';
  import EnhancedChatInterface from '$lib/modules/chat/components/EnhancedChatInterface.svelte';
  import CourseLandingPage from './components/CourseLandingPage.svelte';
  import { BookOpen, ArrowLeft, Info, Clock, Award } from 'lucide-svelte';

  /** @type {import('./$types').PageData} */
  export let data;

  let loading = true;
  let error = null;
  let courseContext = null;
  let enrolled = false;
  let showLandingPage = true;

  // Set app mode to 'learn' for course learning context
  $: if (data?.course) {
    appMode.set('learn');
  }

  // Get API mode for session calls
  $: apiMode = getApiModeFromAppMode($appMode);

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

        // Set up course context
        courseContext = {
          courseId: data.course.id,
          courseName: data.course.name,
          courseDescription: data.course.description,
          language: data.course.language,
          level: data.course.level,
          skills: data.course.skills,
          mode: apiMode
        };
      } else {
        error = 'Course data not available. Please try again.';
        loading = false;
        return;
      }

      loading = false;
    } catch (err) {
      console.error('Error loading course:', err);
      error = 'Failed to load course. Please try again.';
      loading = false;
    }
  });

  function handleBackToCourses() {
    goto('/my-courses');
  }

  function handleViewProgress() {
    const identifier = data.course.slug || data.course.id;
    goto(`/learn/${identifier}/progress`);
  }

  function handleEnroll() {
    enrolled = true;
    showLandingPage = false;
  }

  function handleStartLearning() {
    showLandingPage = false;
  }
</script>

<svelte:head>
  <title>{data?.course?.name || 'Course Learning'} - Learn Mode</title>
  <meta
    name="description"
    content={data?.course?.description || 'Interactive course learning experience'}
  />
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p class="text-stone-600 dark:text-gray-300">Loading course...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center max-w-md mx-auto px-4">
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
      >
        <h2 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Error Loading Course
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
      <p class="text-stone-600 dark:text-gray-400">Please log in to access this course.</p>
    </div>
  </div>
{:else if data?.course}
  {#if showLandingPage && !enrolled}
    <!-- Show Landing Page for non-enrolled users -->
    <CourseLandingPage
      course={data.course}
      {enrolled}
      studentCount={data.studentCount || 0}
      onEnroll={handleEnroll}
      onStartLearning={handleStartLearning}
    />
  {:else}
    <!-- Show Chat Interface for enrolled users -->
    <div class="min-h-screen bg-stone-50 dark:bg-gray-900">
      <!-- Course Header -->
      <div class="bg-white dark:bg-gray-800 border-b border-stone-200 dark:border-gray-700">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button
                on:click={handleBackToCourses}
                class="flex items-center gap-2 text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft class="w-4 h-4" />
                <span class="hidden sm:inline">My Courses</span>
              </button>
              <div class="h-6 w-px bg-stone-300 dark:bg-gray-600"></div>
              <div>
                <h1 class="text-xl font-semibold text-stone-900 dark:text-white">
                  {data.course.name}
                </h1>
                <div class="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400">
                  <BookOpen class="w-4 h-4" />
                  <span>{data.course.language}</span>
                  {#if data.course.level}
                    <span>•</span>
                    <span>{data.course.level}</span>
                  {/if}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                on:click={handleViewProgress}
                class="flex items-center gap-2 px-3 py-2 text-sm bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Award class="w-4 h-4" />
                <span class="hidden sm:inline">Progress</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Course Info Panel (Collapsible) -->
      <div class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
        <div class="container mx-auto px-4 py-3">
          <div class="flex items-start gap-3">
            <Info class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-amber-800 dark:text-amber-200 mb-1">
                {data.course.description}
              </p>
              {#if data.course.skills && data.course.skills.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each data.course.skills as skill}
                    <span
                      class="inline-flex items-center px-2 py-1 text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded"
                    >
                      {skill}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Interface -->
      <div class="flex-1">
        {#if courseContext}
          <EnhancedChatInterface {courseContext} sessionMode={apiMode} />
        {:else}
          <div class="flex items-center justify-center h-96">
            <p class="text-stone-600 dark:text-gray-400">Initializing course interface...</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
