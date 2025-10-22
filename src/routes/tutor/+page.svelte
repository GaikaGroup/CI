<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user, checkAuth } from '$modules/auth/stores';
  import { navigationStore, NAVIGATION_MODES } from '$lib/stores/navigation.js';
  import { coursesStore } from '$lib/stores/coursesDB.js';
  import { activeEnrollments } from '$lib/stores/enrollmentDB.js';
  import CourseSelection from '$modules/learn/components/CourseSelection.svelte';
  import { getCourseUrl } from '$lib/utils/courseUrl.js';
  import { BookOpen, Plus, BarChart3, Users, GraduationCap } from 'lucide-svelte';

  // Tab management
  let activeTab = 'courses';

  // Get tab from URL params
  $: {
    const urlTab = $page.url.searchParams.get('tab');
    if (urlTab && ['courses', 'create', 'analytics', 'students'].includes(urlTab)) {
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
    navigationStore.setMode(NAVIGATION_MODES.TUTOR);
    coursesStore.initialize();
  });

  // Get authored courses
  $: authoredCourses =
    $user && $coursesStore.courses
      ? $coursesStore.courses.filter(
          (course) =>
            course.creatorId === $user.id || (course.creatorRole === 'user' && !course.creatorId) // Backward compatibility
        )
      : [];

  // Get students enrolled in tutor's courses
  $: enrolledStudents = $activeEnrollments
    .filter((enrollment) =>
      authoredCourses.some(
        (course) => course.id === enrollment.courseId || course.id === enrollment.subjectId
      )
    )
    .map((enrollment) => ({
      ...enrollment,
      course: authoredCourses.find(
        (course) => course.id === enrollment.courseId || course.id === enrollment.subjectId
      )
    }));

  // Handle course creation
  const handleCreateCourse = () => {
    goto('/catalogue/edit?new=true');
  };

  // Handle course editing
  const handleEditCourse = (event) => {
    const { course } = event.detail;
    if (!course || !course.id) {
      console.error('Cannot edit course: missing course or course ID');
      return;
    }

    const slug = course.name
      ? course.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      : course.id;
    goto(`/catalogue/edit?id=${course.id}&course=${slug}&action=edit`);
  };

  // Handle course learning (tutor testing their own course)
  const handleLearnCourse = (event) => {
    const { course } = event.detail;
    if (!course) return;
    goto(getCourseUrl(course));
  };

  // Calculate course statistics
  $: courseStats = {
    total: authoredCourses.length,
    published: authoredCourses.filter((c) => c.visibility === 'published').length,
    draft: authoredCourses.filter((c) => c.visibility === 'draft').length,
    totalStudents: enrolledStudents.length,
    totalLessons: authoredCourses.reduce((sum, course) => {
      // Estimate lessons based on course content (placeholder logic)
      return sum + (course.skills?.length || 1) * 5;
    }, 0)
  };

  // Format date helper
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get course enrollment count
  function getCourseEnrollmentCount(courseId) {
    return enrolledStudents.filter(
      (student) => student.courseId === courseId || student.subjectId === courseId
    ).length;
  }
</script>

<svelte:head>
  <title>Tutor Dashboard - AI Tutor</title>
</svelte:head>

<div class="min-h-screen bg-stone-50 dark:bg-gray-900">
  <div class="mx-auto max-w-7xl px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <div
          class="flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl"
        >
          <GraduationCap class="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 class="text-3xl font-bold text-stone-900 dark:text-white">Tutor Dashboard</h1>
          <p class="text-stone-600 dark:text-gray-400">
            Create and manage your courses, track student progress, and grow your impact
          </p>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="mb-8">
      <nav class="flex space-x-8 border-b border-stone-200 dark:border-gray-700">
        <button
          on:click={() => setActiveTab('courses')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'courses'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          <div class="flex items-center gap-2">
            <BookOpen class="w-4 h-4" />
            My Courses
            {#if authoredCourses.length > 0}
              <span
                class="ml-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-amber-900/40 dark:text-amber-200"
              >
                {authoredCourses.length}
              </span>
            {/if}
          </div>
        </button>

        <button
          on:click={() => setActiveTab('create')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'create'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          <div class="flex items-center gap-2">
            <Plus class="w-4 h-4" />
            Create Course
          </div>
        </button>

        <button
          on:click={() => setActiveTab('analytics')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'analytics'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          <div class="flex items-center gap-2">
            <BarChart3 class="w-4 h-4" />
            Analytics
          </div>
        </button>

        <button
          on:click={() => setActiveTab('students')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'students'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4" />
            Students
            {#if enrolledStudents.length > 0}
              <span
                class="ml-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-amber-900/40 dark:text-amber-200"
              >
                {enrolledStudents.length}
              </span>
            {/if}
          </div>
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      {#if activeTab === 'courses'}
        <!-- My Courses Tab -->
        <div class="space-y-6">
          {#if authoredCourses.length === 0}
            <!-- Empty State -->
            <div class="text-center py-12">
              <BookOpen class="w-16 h-16 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
              <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">
                No courses created yet
              </h2>
              <p class="text-stone-600 dark:text-gray-400 mb-6">
                Start sharing your knowledge by creating your first course
              </p>
              <button
                on:click={handleCreateCourse}
                class="inline-flex items-center px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus class="w-5 h-5 mr-2" />
                Create Your First Course
              </button>
            </div>
          {:else}
            <!-- Course Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div
                class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                      Total Courses
                    </p>
                    <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {courseStats.total}
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
                    <p class="text-sm font-medium text-stone-600 dark:text-gray-400">Published</p>
                    <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                      {courseStats.published}
                    </p>
                  </div>
                  <BarChart3 class="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div
                class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                      Total Students
                    </p>
                    <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {courseStats.totalStudents}
                    </p>
                  </div>
                  <Users class="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div
                class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-stone-600 dark:text-gray-400">
                      Est. Lessons
                    </p>
                    <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {courseStats.totalLessons}
                    </p>
                  </div>
                  <GraduationCap class="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <!-- Authored Courses Grid -->
            <div class="grid gap-6 md:grid-cols-2">
              {#each authoredCourses as course}
                <article
                  class="bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div class="space-y-4">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
                            {course.name}
                          </h3>
                          <span
                            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {course.visibility ===
                            'published'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'}"
                          >
                            {course.visibility === 'published' ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p class="text-sm text-amber-600 dark:text-amber-300">
                          {course.language}{course.level ? ` · ${course.level}` : ''}
                        </p>
                      </div>

                      <button
                        on:click={() => handleEditCourse({ detail: { course } })}
                        class="text-stone-400 hover:text-amber-600 focus:text-amber-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                        aria-label="Edit {course.name}"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </div>

                    <p class="text-sm text-stone-600 dark:text-gray-300 line-clamp-2">
                      {course.description}
                    </p>

                    {#if course.skills?.length}
                      <div class="flex flex-wrap gap-1">
                        {#each course.skills.slice(0, 3) as skill}
                          <span
                            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {skill}
                          </span>
                        {/each}
                        {#if course.skills.length > 3}
                          <span class="text-xs text-stone-500 dark:text-gray-400">
                            +{course.skills.length - 3} more
                          </span>
                        {/if}
                      </div>
                    {/if}

                    <!-- Course Stats -->
                    <div
                      class="flex items-center justify-between text-sm text-stone-600 dark:text-gray-400"
                    >
                      <div class="flex items-center gap-4">
                        <div class="flex items-center gap-1">
                          <Users class="w-4 h-4" />
                          <span>{getCourseEnrollmentCount(course.id)} students</span>
                        </div>
                        {#if course.metadata?.createdAt}
                          <div class="flex items-center gap-1">
                            <span>Created {formatDate(course.metadata.createdAt)}</span>
                          </div>
                        {/if}
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3 pt-2">
                      <button
                        on:click={() => handleLearnCourse({ detail: { course } })}
                        class="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Preview Course
                      </button>
                      <button
                        on:click={() => handleEditCourse({ detail: { course } })}
                        class="flex-1 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Edit Course
                      </button>
                    </div>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </div>
      {:else if activeTab === 'create'}
        <!-- Create Course Tab -->
        <div class="space-y-6">
          <div
            class="bg-white dark:bg-gray-800 rounded-lg p-8 border border-stone-200 dark:border-gray-700 text-center"
          >
            <Plus class="w-16 h-16 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
            <h2 class="text-2xl font-semibold text-stone-900 dark:text-white mb-4">
              Create a New Course
            </h2>
            <p class="text-stone-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Share your expertise with learners around the world. Our AI-powered course creation
              tools will help you build engaging, structured learning experiences.
            </p>
            <button
              on:click={handleCreateCourse}
              class="inline-flex items-center px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors text-lg"
            >
              <Plus class="w-6 h-6 mr-3" />
              Start Creating
            </button>
          </div>
        </div>
      {:else if activeTab === 'analytics'}
        <!-- Analytics Tab -->
        <div class="space-y-6">
          <div
            class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-stone-200 dark:border-gray-700"
          >
            <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-6">
              Course Analytics
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  {courseStats.total}
                </div>
                <div class="text-sm text-stone-600 dark:text-gray-400">Total Courses</div>
              </div>

              <div class="text-center">
                <div class="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {courseStats.published}
                </div>
                <div class="text-sm text-stone-600 dark:text-gray-400">Published</div>
              </div>

              <div class="text-center">
                <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {courseStats.totalStudents}
                </div>
                <div class="text-sm text-stone-600 dark:text-gray-400">Total Students</div>
              </div>

              <div class="text-center">
                <div class="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {Math.round(courseStats.totalStudents / Math.max(courseStats.published, 1))}
                </div>
                <div class="text-sm text-stone-600 dark:text-gray-400">Avg Students/Course</div>
              </div>
            </div>

            {#if authoredCourses.length === 0}
              <div class="text-center py-8">
                <p class="text-stone-600 dark:text-gray-400">
                  Create your first course to see analytics data.
                </p>
              </div>
            {/if}
          </div>
        </div>
      {:else if activeTab === 'students'}
        <!-- Students Tab -->
        <div class="space-y-6">
          {#if enrolledStudents.length === 0}
            <div class="text-center py-12">
              <Users class="w-16 h-16 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
              <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-2">
                No students enrolled yet
              </h2>
              <p class="text-stone-600 dark:text-gray-400 mb-6">
                Once students enroll in your courses, you'll see their progress here
              </p>
            </div>
          {:else}
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700 overflow-hidden"
            >
              <div class="px-6 py-4 border-b border-stone-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-stone-900 dark:text-white">
                  Enrolled Students
                </h2>
                <p class="text-sm text-stone-600 dark:text-gray-400 mt-1">
                  Students currently learning from your courses
                </p>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-stone-200 dark:divide-gray-700">
                  <thead class="bg-stone-50 dark:bg-gray-900">
                    <tr>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
                      >
                        Student
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
                      >
                        Course
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
                      >
                        Enrolled
                      </th>
                      <th
                        class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
                      >
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="bg-white dark:bg-gray-800 divide-y divide-stone-200 dark:divide-gray-700"
                  >
                    {#each enrolledStudents as student}
                      <tr class="hover:bg-stone-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td
                          class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-800 dark:text-gray-100"
                        >
                          {student.userId}
                        </td>
                        <td
                          class="px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-gray-300"
                        >
                          {student.course?.name || 'Unknown Course'}
                        </td>
                        <td
                          class="px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-gray-300"
                        >
                          {formatDate(student.enrolledAt)}
                        </td>
                        <td
                          class="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600 dark:text-gray-300"
                        >
                          {student.progress?.lessonsCompleted || 0} lessons
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
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
