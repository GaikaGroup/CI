<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user, checkAuth } from '$modules/auth/stores';
  import { navigationStore, NAVIGATION_MODES } from '$lib/stores/navigation.js';
  import { coursesStore } from '$lib/stores/coursesDB.js';
  import { activeEnrollments, enrollmentStats } from '$lib/stores/enrollmentDB.js';
  import CourseSelection from '$modules/learn/components/CourseSelection.svelte';
  import { getCourseUrl } from '$lib/utils/courseUrl.js';
  import { BookOpen, TrendingUp, Award, User } from 'lucide-svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  // Tab management
  let activeTab = 'browse';

  // Get tab from URL params
  $: {
    const urlTab = $page.url.searchParams.get('tab');
    if (urlTab && ['browse', 'learning', 'progress'].includes(urlTab)) {
      activeTab = urlTab;
    }
  }

  // Update URL when tab changes
  function setActiveTab(tab) {
    activeTab = tab;
    const url = new URL($page.url);
    url.searchParams.set('tab', tab);
    goto(url.toString(), { replaceState: true, keepfocus: true, noscroll: true });
  }

  // Set navigation mode on mount
  onMount(async () => {
    await checkAuth();
    navigationStore.setMode(NAVIGATION_MODES.STUDENT);
    coursesStore.initialize();
  });

  // Get enrolled courses for My Learning tab
  $: enrolledCourses = $activeEnrollments
    .map((enrollment) => {
      const course = $coursesStore.courses?.find(
        (c) => c.id === enrollment.subjectId || c.id === enrollment.courseId
      );
      return course ? { ...course, enrollment } : null;
    })
    .filter(Boolean);

  // Handle course enrollment
  const handleJoinCourse = async (event) => {
    const { course } = event.detail;
    if (!course || !$user) return;

    try {
      const { enrollmentStore } = await import('$lib/stores/enrollmentDB.js');
      const result = await enrollmentStore.enrollInCourse(course.id);

      if (result.success) {
        // Switch to My Learning tab to show the newly enrolled course
        setActiveTab('learning');
      } else {
        alert(`Failed to join course: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to join course:', error);
      alert(`Error joining course: ${error.message}`);
    }
  };

  // Handle course learning continuation
  const handleLearnCourse = (event) => {
    const { course } = event.detail;
    if (!course) return;
    goto(getCourseUrl(course));
  };

  // Handle course editing
  const handleEditCourse = (event) => {
    const { course } = event.detail;
    console.log('🎯 Student page handleEditCourse:', course);

    if (!course || !course.id) {
      console.error('Cannot edit course: missing course or course ID', course);
      return;
    }

    // Use encodeURIComponent for proper handling of non-Latin characters
    const slug = course.name
      ? encodeURIComponent(course.name.toLowerCase().replace(/\s+/g, '-'))
      : course.id;

    const url = `/catalogue/edit?id=${course.id}&course=${slug}&action=edit`;
    console.log('🚀 Navigating to:', url);
    goto(url);
  };

  // Format date helper
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get progress percentage
  function getProgressPercentage(enrollment) {
    const total = enrollment.progress.lessonsCompleted + enrollment.progress.assessmentsTaken;
    return Math.min(total * 10, 100);
  }
</script>

<svelte:head>
  <title>Student Dashboard - AI Tutor</title>
</svelte:head>

<div class="min-h-screen bg-stone-50 dark:bg-gray-900">
  <div class="mx-auto max-w-7xl px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <div
          class="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl"
        >
          <User class="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 class="text-3xl font-bold text-stone-900 dark:text-white">{getTranslation($selectedLanguage, 'studentDashboard')}</h1>
          <p class="text-stone-600 dark:text-gray-400">
            {getTranslation($selectedLanguage, 'discoverCourses')}
          </p>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="mb-8">
      <nav class="flex space-x-8 border-b border-stone-200 dark:border-gray-700">
        <button
          on:click={() => setActiveTab('browse')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'browse'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          <div class="flex items-center gap-2">
            <BookOpen class="w-4 h-4" />
            {getTranslation($selectedLanguage, 'browseCourses')}
          </div>
        </button>

        <button
          on:click={() => setActiveTab('learning')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'learning'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          <div class="flex items-center gap-2">
            <TrendingUp class="w-4 h-4" />
            {getTranslation($selectedLanguage, 'myLearning')}
            {#if enrolledCourses.length > 0}
              <span
                class="ml-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900/40 dark:text-blue-200"
              >
                {enrolledCourses.length}
              </span>
            {/if}
          </div>
        </button>

        <button
          on:click={() => setActiveTab('progress')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'progress'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          <div class="flex items-center gap-2">
            <Award class="w-4 h-4" />
            {getTranslation($selectedLanguage, 'progress')}
          </div>
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      {#if activeTab === 'browse'}
        <!-- Browse Courses Tab -->
        <div class="space-y-6">
          <CourseSelection
            courses={$coursesStore.courses || []}
            headerTitle={getTranslation($selectedLanguage, 'availableCourses')}
            headerSubtitle={getTranslation($selectedLanguage, 'discoverAndEnroll')}
            enrolledActionLabel={getTranslation($selectedLanguage, 'continueLearning')}
            joinActionLabel={getTranslation($selectedLanguage, 'enroll')}
            on:join-course={handleJoinCourse}
            on:learn-course={handleLearnCourse}
            on:edit-course={handleEditCourse}
          />
        </div>
      {:else if activeTab === 'learning'}
        <!-- My Learning Tab -->
        <div class="space-y-6">
          {#if $enrollmentStats}
            <!-- Learning Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div
                class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                      {getTranslation($selectedLanguage, 'activeSessions')}
                    </p>
                    <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {$enrollmentStats.active}
                    </p>
                  </div>
                  <BookOpen class="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div
                class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-stone-600 dark:text-gray-400">{getTranslation($selectedLanguage, 'completed')}</p>
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
                    <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {$enrollmentStats.totalLessons}
                    </p>
                  </div>
                  <TrendingUp class="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
          {/if}

          {#if enrolledCourses.length === 0}
            <!-- Empty State -->
            <div class="text-center py-12">
              <BookOpen class="w-16 h-16 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
              <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">
                {getTranslation($selectedLanguage, 'noCoursesEnrolled')}
              </h2>
              <p class="text-stone-600 dark:text-gray-400 mb-6">
                {getTranslation($selectedLanguage, 'startLearningJourney')}
              </p>
              <button
                on:click={() => setActiveTab('browse')}
                class="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <BookOpen class="w-5 h-5 mr-2" />
                {getTranslation($selectedLanguage, 'browseCourses')}
              </button>
            </div>
          {:else}
            <!-- Enrolled Courses Grid -->
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
                        <p class="text-sm text-blue-600 dark:text-blue-300">
                          {course.language}{course.level ? ` · ${course.level}` : ''}
                        </p>
                      </div>
                      <div class="flex items-center gap-2">
                        <div
                          class="w-2 h-2 bg-green-500 rounded-full"
                          title="Active enrollment"
                        ></div>
                        <span class="text-xs text-stone-500 dark:text-gray-400">Active</span>
                      </div>
                    </div>

                    <p class="text-sm text-stone-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    <!-- Progress Bar -->
                    <div class="space-y-3 mb-4">
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-stone-600 dark:text-gray-400">Progress</span>
                        <span class="font-medium text-stone-900 dark:text-white">
                          {getProgressPercentage(course.enrollment)}%
                        </span>
                      </div>
                      <div class="w-full bg-stone-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style="width: {getProgressPercentage(course.enrollment)}%"
                        ></div>
                      </div>
                    </div>

                    <!-- Course Stats -->
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

                    <!-- Action Button -->
                    <button
                      on:click={() => handleLearnCourse({ detail: { course } })}
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      {getTranslation($selectedLanguage, 'continueLearning')}
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {:else if activeTab === 'progress'}
        <!-- Progress Tab -->
        <div class="space-y-6">
          <div
            class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
          >
            <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-4">
              {getTranslation($selectedLanguage, 'learningProgress')}
            </h2>

            {#if $enrollmentStats}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="text-center">
                  <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {$enrollmentStats.total}
                  </div>
                  <div class="text-sm text-stone-600 dark:text-gray-400">{getTranslation($selectedLanguage, 'totalCourses')}</div>
                </div>

                <div class="text-center">
                  <div class="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {$enrollmentStats.completed}
                  </div>
                  <div class="text-sm text-stone-600 dark:text-gray-400">{getTranslation($selectedLanguage, 'completed')}</div>
                </div>

                <div class="text-center">
                  <div class="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                    {$enrollmentStats.totalLessons}
                  </div>
                  <div class="text-sm text-stone-600 dark:text-gray-400">{getTranslation($selectedLanguage, 'lessonsCompleted')}</div>
                </div>

                <div class="text-center">
                  <div class="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {$enrollmentStats.totalAssessments}
                  </div>
                  <div class="text-sm text-stone-600 dark:text-gray-400">{getTranslation($selectedLanguage, 'assessmentsTaken')}</div>
                </div>
              </div>
            {:else}
              <p class="text-stone-600 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'noProgressData')}
              </p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
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
